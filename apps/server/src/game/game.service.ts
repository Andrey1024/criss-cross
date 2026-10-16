import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  AWAY_GRACE_SECONDS,
  BOARD_SIZE,
  createBoard,
  Events,
  findWinLine,
  isBoardFull,
  isInside,
  otherMark,
  type BanInfo,
  type Board,
  type EndReason,
  type GameResult,
  type LobbyRoom,
  type Mark,
  type PlayedMove,
  type Point,
  type PublicUser,
  type RoomInvite,
  type RoomState,
} from '@cc/shared';
import { PrismaService } from '../prisma.service';
import { RatingService, type RatingChange } from '../rating/rating.service';

export const LOBBY_CHANNEL = 'lobby';
export const roomChannel = (roomId: string) => `room:${roomId}`;

/** How long a finished room stays open so players can see the result and chat. */
const FINISHED_ROOM_TTL_MS = 10 * 60_000;

export type GameError =
  | 'ROOM_NOT_FOUND'
  | 'GAME_NOT_ACTIVE'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_FINISHED'
  | 'OPPONENT_LEFT'
  | 'OUT_OF_BOUNDS'
  | 'CELL_TAKEN';

interface LiveRoom {
  id: string;
  name: string;
  host: PublicUser;
  boardSize: number;
  /** Joined by link, guests allowed, never rated, not listed in the lobby. */
  unrated: boolean;
  createdAt: Date;
  status: RoomState['status'];
  players: { X: PublicUser; O: PublicUser | null };
  board: Board;
  turn: Mark;
  moves: PlayedMove[];
  gameId: string | null;
  winner: Mark | null;
  winLine: Point[] | null;
  result: GameResult | null;
  endReason: EndReason | null;
  /** Whether the finished game was rated (null until known) and the rating changes. */
  rated: boolean | null;
  ratingChange: RatingChange | null;
  rematch: Record<Mark, boolean>;
  /** userId -> ids of that user's sockets currently in the room. */
  presence: Map<string, Set<string>>;
  /** Grace timers for absent players (or an absent host of a waiting room). */
  away: Map<string, { timer: NodeJS.Timeout; deadline: number }>;
  cleanupTimer: NodeJS.Timeout | null;
  /** Serialized DB writes, so moves are stored in order and after their game row. */
  db: Promise<unknown>;
}

/**
 * Authoritative in-memory game state. There is a single server process, so live rooms live
 * here; every move and result is also written to Postgres for history.
 */
@Injectable()
export class GameService implements OnModuleInit {
  private readonly logger = new Logger(GameService.name);
  private readonly rooms = new Map<string, LiveRoom>();
  private readonly userSockets = new Map<string, Set<Socket>>();
  private server: Server | null = null;
  awayGraceMs = AWAY_GRACE_SECONDS * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratings: RatingService,
  ) {}

  async onModuleInit() {
    // Live state was lost with the previous process, so unfinished games can't continue.
    await this.prisma.game.updateMany({ where: { result: null }, data: { result: 'ABANDONED', endedAt: new Date() } });
    await this.prisma.room.updateMany({ where: { status: { in: ['WAITING', 'PLAYING'] } }, data: { status: 'CLOSED' } });
  }

  attachServer(server: Server) {
    this.server = server;
  }

  registerSocket(userId: string, socket: Socket) {
    const set = this.userSockets.get(userId) ?? new Set();
    set.add(socket);
    this.userSockets.set(userId, set);
  }

  unregisterSocket(userId: string, socket: Socket) {
    const set = this.userSockets.get(userId);
    set?.delete(socket);
    if (set?.size === 0) this.userSockets.delete(userId);
  }

  // ---- queries -------------------------------------------------------------------------

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  isUnrated(roomId: string): boolean {
    return this.rooms.get(roomId)?.unrated ?? false;
  }

  invite(roomId: string): RoomInvite | null {
    const room = this.rooms.get(roomId);
    return room ? { id: room.id, name: room.name, host: room.host, unrated: room.unrated, status: room.status } : null;
  }

  isInRoom(roomId: string, userId: string): boolean {
    return this.rooms.get(roomId)?.presence.has(userId) ?? false;
  }

  getState(roomId: string): RoomState | null {
    const room = this.rooms.get(roomId);
    return room ? this.toState(room) : null;
  }

  lobbyRooms(): LobbyRoom[] {
    return [...this.rooms.values()]
      .filter((r) => r.status !== 'FINISHED' && !r.unrated)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => this.toLobbyRoom(r));
  }

  allRooms(): RoomState[] {
    return [...this.rooms.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => this.toState(r));
  }

  // ---- room lifecycle ------------------------------------------------------------------

  async createRoom(host: PublicUser, name: string, unrated = false): Promise<LobbyRoom> {
    const row = await this.prisma.room.create({ data: { name, hostId: host.id, boardSize: BOARD_SIZE, unrated } });
    const room: LiveRoom = {
      id: row.id,
      name: row.name,
      host,
      boardSize: row.boardSize,
      unrated,
      createdAt: row.createdAt,
      status: 'WAITING',
      players: { X: host, O: null },
      board: createBoard(row.boardSize),
      turn: 'X',
      moves: [],
      gameId: null,
      winner: null,
      winLine: null,
      result: null,
      endReason: null,
      rated: null,
      ratingChange: null,
      rematch: { X: false, O: false },
      presence: new Map(),
      away: new Map(),
      cleanupTimer: null,
      db: Promise.resolve(),
    };
    this.rooms.set(room.id, room);
    // The host has to open the room within the grace period, or it closes.
    this.scheduleAway(room, host.id);
    this.broadcastLobby();
    return this.toLobbyRoom(room);
  }

  /** Adds a socket to the room. The first non-host to join a waiting room takes the O seat. */
  join(user: PublicUser, roomId: string, socketId: string): RoomState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const sockets = room.presence.get(user.id) ?? new Set();
    sockets.add(socketId);
    room.presence.set(user.id, sockets);
    this.clearAway(room, user.id);

    if (room.status === 'WAITING' && user.id !== room.host.id && !room.players.O) {
      room.players.O = user;
      this.startGame(room);
    }
    this.broadcastRoom(room);
    return this.toState(room);
  }

  /** Removes a socket from the room; when the user's last socket leaves, they count as absent. */
  leave(userId: string, roomId: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const sockets = room.presence.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size > 0) return;

    room.presence.delete(userId);
    const mark = this.markOf(room, userId);
    if (room.status === 'PLAYING' && mark) this.scheduleAway(room, userId);
    else if (room.status === 'WAITING' && userId === room.host.id) this.scheduleAway(room, userId);
    else if (room.status === 'FINISHED') {
      if (room.presence.size === 0) {
        this.dispose(room);
        return;
      }
      // A player who left can't start the rematch they offered.
      if (mark) room.rematch[mark] = false;
    }
    this.broadcastRoom(room);
  }

  move(user: PublicUser, roomId: string, x: number, y: number): GameError | null {
    const room = this.rooms.get(roomId);
    if (!room) return 'ROOM_NOT_FOUND';
    if (room.status !== 'PLAYING' || !room.gameId) return 'GAME_NOT_ACTIVE';
    const mark = this.markOf(room, user.id);
    if (!mark) return 'NOT_A_PLAYER';
    if (room.turn !== mark) return 'NOT_YOUR_TURN';
    if (!isInside(room.board, x, y)) return 'OUT_OF_BOUNDS';
    if (room.board[y][x]) return 'CELL_TAKEN';

    // All state changes happen synchronously, before any await, so concurrent moves can't race.
    room.board[y][x] = mark;
    room.moves.push({ x, y, mark });
    const gameId = room.gameId;
    const moveNumber = room.moves.length;
    this.persist(room, () => this.prisma.move.create({ data: { gameId, playerId: user.id, x, y, moveNumber } }));

    const line = findWinLine(room.board, x, y);
    if (line) {
      room.winLine = line;
      this.endGame(room, mark, 'WIN', 'five');
    } else if (isBoardFull(room.board)) {
      this.endGame(room, null, 'DRAW', 'draw');
    } else {
      room.turn = otherMark(mark);
      this.broadcastRoom(room);
    }
    return null;
  }

  resign(user: PublicUser, roomId: string): GameError | null {
    const room = this.rooms.get(roomId);
    if (!room) return 'ROOM_NOT_FOUND';
    if (room.status !== 'PLAYING') return 'GAME_NOT_ACTIVE';
    const mark = this.markOf(room, user.id);
    if (!mark) return 'NOT_A_PLAYER';
    this.endGame(room, otherMark(mark), 'RESIGNED', 'resigned');
    return null;
  }

  /**
   * Offers, accepts or withdraws a rematch after a finished game. Once both players want one, a
   * new game starts in the same room with colours swapped, so each player gets to move first.
   */
  rematch(user: PublicUser, roomId: string, offer: boolean): GameError | null {
    const room = this.rooms.get(roomId);
    if (!room) return 'ROOM_NOT_FOUND';
    if (room.status !== 'FINISHED' || !room.players.O) return 'GAME_NOT_FINISHED';
    const mark = this.markOf(room, user.id);
    if (!mark) return 'NOT_A_PLAYER';
    if (offer && !room.presence.has(room.players[otherMark(mark)]!.id)) return 'OPPONENT_LEFT';

    room.rematch[mark] = offer;
    if (room.rematch.X && room.rematch.O) {
      this.clearCleanup(room);
      room.players = { X: room.players.O, O: room.players.X };
      this.startGame(room);
    }
    this.broadcastRoom(room);
    return null;
  }

  /** Force-closes a room (admin action, absent host, banned host). Returns false if not found. */
  closeRoom(roomId: string, reason: EndReason): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.status === 'PLAYING' && room.gameId) {
      const gameId = room.gameId;
      this.persist(room, () =>
        this.prisma.game.update({ where: { id: gameId }, data: { result: 'ABANDONED', endedAt: new Date() } }),
      );
    }
    if (room.status !== 'FINISHED') {
      this.persist(room, () => this.prisma.room.update({ where: { id: room.id }, data: { status: 'CLOSED' } }));
    }
    this.server?.to(roomChannel(room.id)).emit(Events.RoomClosed, { reason });
    this.server?.in(roomChannel(room.id)).socketsLeave(roomChannel(room.id));
    this.dispose(room);
    this.broadcastLobby();
    return true;
  }

  /**
   * Applies a fresh ban immediately: forfeits the user's running games, closes rooms they are
   * waiting in as host, and disconnects all of their sockets.
   */
  kickUser(userId: string, ban: BanInfo) {
    for (const room of [...this.rooms.values()]) {
      const mark = this.markOf(room, userId);
      if (room.status === 'PLAYING' && mark) this.endGame(room, otherMark(mark), 'ABANDONED', 'banned');
      else if (room.status === 'WAITING' && room.host.id === userId) this.closeRoom(room.id, 'banned');
    }
    for (const socket of [...(this.userSockets.get(userId) ?? [])]) {
      socket.emit(Events.AuthBanned, ban);
      socket.disconnect(true);
    }
  }

  emitToRoom(roomId: string, event: string, payload: unknown) {
    this.server?.to(roomChannel(roomId)).emit(event, payload);
  }

  /** Resolves once all pending DB writes are done (used by tests and shutdown). */
  async settled() {
    await Promise.all([...this.rooms.values()].map((r) => r.db));
  }

  // ---- internals -----------------------------------------------------------------------

  private startGame(room: LiveRoom) {
    const O = room.players.O!;
    const gameId = randomUUID();
    room.status = 'PLAYING';
    room.gameId = gameId;
    room.board = createBoard(room.boardSize);
    room.turn = 'X';
    room.moves = [];
    room.winner = null;
    room.winLine = null;
    room.result = null;
    room.endReason = null;
    room.rated = null;
    room.ratingChange = null;
    room.rematch = { X: false, O: false };
    const xPlayerId = room.players.X.id;
    this.persist(room, () =>
      this.prisma.game.create({ data: { id: gameId, roomId: room.id, xPlayerId, oPlayerId: O.id } }),
    );
    this.persist(room, () => this.prisma.room.update({ where: { id: room.id }, data: { status: 'PLAYING' } }));
    // A seated player who isn't in the room right now gets the usual grace period to come back.
    for (const player of [room.players.X, O]) if (!room.presence.has(player.id)) this.scheduleAway(room, player.id);
    this.broadcastLobby();
  }

  private endGame(room: LiveRoom, winner: Mark | null, result: GameResult, reason: EndReason) {
    if (room.status !== 'PLAYING' || !room.gameId) return;
    room.status = 'FINISHED';
    room.winner = winner;
    room.result = result;
    room.endReason = reason;
    for (const userId of [...room.away.keys()]) this.clearAway(room, userId);

    const gameId = room.gameId;
    const winnerId = winner ? room.players[winner]!.id : null;
    this.persist(room, () =>
      this.prisma.game.update({ where: { id: gameId }, data: { winnerId, result, endedAt: new Date() } }),
    );
    this.persist(room, () => this.prisma.room.update({ where: { id: room.id }, data: { status: 'FINISHED' } }));
    if (room.unrated) {
      room.rated = false;
    } else {
      // Rate after the result is stored; tell the room once the new ratings are known.
      this.persist(room, async () => {
        const change = await this.ratings.rateGame(gameId);
        // A rematch may already be running; its own result must not show this game's changes.
        if (room.gameId === gameId) {
          room.rated = change !== null;
          room.ratingChange = change;
        }
        if (this.rooms.get(room.id) === room) this.broadcastRoom(room);
      });
    }

    this.broadcastRoom(room);
    this.broadcastLobby();
    if (room.presence.size === 0) this.dispose(room);
    else room.cleanupTimer = setTimeout(() => this.closeRoom(room.id, 'closed'), FINISHED_ROOM_TTL_MS);
  }

  private scheduleAway(room: LiveRoom, userId: string) {
    this.clearAway(room, userId);
    const timer = setTimeout(() => this.onAwayExpired(room.id, userId), this.awayGraceMs);
    timer.unref?.();
    room.away.set(userId, { timer, deadline: Date.now() + this.awayGraceMs });
  }

  private clearAway(room: LiveRoom, userId: string) {
    const entry = room.away.get(userId);
    if (!entry) return;
    clearTimeout(entry.timer);
    room.away.delete(userId);
  }

  private clearCleanup(room: LiveRoom) {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  private onAwayExpired(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.away.delete(userId);
    if (room.presence.has(userId)) return;

    const mark = this.markOf(room, userId);
    if (room.status === 'PLAYING' && mark) this.endGame(room, otherMark(mark), 'ABANDONED', 'abandoned');
    else if (room.status === 'WAITING' && room.host.id === userId) this.closeRoom(room.id, 'abandoned');
  }

  private dispose(room: LiveRoom) {
    for (const userId of [...room.away.keys()]) this.clearAway(room, userId);
    this.clearCleanup(room);
    this.rooms.delete(room.id);
  }

  private markOf(room: LiveRoom, userId: string): Mark | null {
    if (room.players.X.id === userId) return 'X';
    if (room.players.O?.id === userId) return 'O';
    return null;
  }

  private persist(room: LiveRoom, op: () => Promise<unknown>) {
    room.db = room.db.then(op).catch((err) => this.logger.error(`DB write failed for room ${room.id}`, err));
  }

  private broadcastRoom(room: LiveRoom) {
    this.server?.to(roomChannel(room.id)).emit(Events.RoomState, this.toState(room));
  }

  private broadcastLobby() {
    this.server?.to(LOBBY_CHANNEL).emit(Events.LobbyRooms, this.lobbyRooms());
  }

  private ratingsOf(room: LiveRoom) {
    const { X, O } = room.players;
    return { X: this.ratings.view(X.id), O: O ? this.ratings.view(O.id) : null };
  }

  private toLobbyRoom(room: LiveRoom): LobbyRoom {
    return {
      id: room.id,
      name: room.name,
      status: room.status === 'WAITING' ? 'WAITING' : 'PLAYING',
      host: room.host,
      players: room.players,
      ratings: this.ratingsOf(room),
      createdAt: room.createdAt.toISOString(),
    };
  }

  private toState(room: LiveRoom): RoomState {
    const { X, O } = room.players;
    const last = room.moves.at(-1);
    let spectators = 0;
    for (const userId of room.presence.keys()) if (!this.markOf(room, userId)) spectators++;
    return {
      id: room.id,
      name: room.name,
      status: room.status,
      boardSize: room.boardSize,
      unrated: room.unrated,
      host: room.host,
      players: room.players,
      ratings: this.ratingsOf(room),
      rated: room.rated,
      ratingChange: room.ratingChange,
      rematch: { ...room.rematch },
      connected: { X: room.presence.has(X.id), O: O ? room.presence.has(O.id) : false },
      awayDeadline: {
        X: room.away.get(X.id)?.deadline ?? null,
        O: O ? (room.away.get(O.id)?.deadline ?? null) : null,
      },
      board: room.board,
      turn: room.turn,
      lastMove: last ? { x: last.x, y: last.y } : null,
      moveCount: room.moves.length,
      winner: room.winner,
      winLine: room.winLine,
      result: room.result,
      endReason: room.endReason,
      gameId: room.gameId,
      spectators,
    };
  }
}
