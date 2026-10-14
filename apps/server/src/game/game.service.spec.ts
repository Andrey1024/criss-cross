import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Events, type PublicUser } from '@cc/shared';
import { GameService } from './game.service';

const alice: PublicUser = { id: 'alice', name: 'Alice', avatarUrl: null };
const bob: PublicUser = { id: 'bob', name: 'Bob', avatarUrl: null };
const carol: PublicUser = { id: 'carol', name: 'Carol', avatarUrl: null };

function setup() {
  const db: Array<{ model: string; op: string; args: any }> = [];
  let roomSeq = 0;
  // Records every Prisma call; room.create returns a row like the real client.
  const prisma = new Proxy({} as any, {
    get: (_, model: string) =>
      new Proxy({}, {
        get: (_, op: string) => async (args: any) => {
          db.push({ model, op, args });
          if (model === 'room' && op === 'create') {
            return { id: `room${++roomSeq}`, name: args.data.name, boardSize: args.data.boardSize, createdAt: new Date() };
          }
          return {};
        },
      }),
  });
  const emitted: Array<{ to: string; event: string; payload: any }> = [];
  const server = {
    to: (to: string) => ({ emit: (event: string, payload: any) => emitted.push({ to, event, payload }) }),
    in: () => ({ socketsLeave: () => {} }),
  };
  const game = new GameService(prisma);
  game.attachServer(server as any);
  return { game, db, emitted };
}

async function startedGame() {
  const ctx = setup();
  const room = await ctx.game.createRoom(alice, 'Test');
  ctx.game.join(alice, room.id, 'a1');
  ctx.game.join(bob, room.id, 'b1');
  return { ...ctx, roomId: room.id };
}

describe('GameService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts the game when a second player joins and seats them as O', async () => {
    const { game, roomId, db } = await startedGame();
    const state = game.getState(roomId)!;
    expect(state.status).toBe('PLAYING');
    expect(state.players.O?.id).toBe('bob');
    expect(state.turn).toBe('X');
    await game.settled();
    expect(db.some((c) => c.model === 'game' && c.op === 'create' && c.args.data.oPlayerId === 'bob')).toBe(true);
    expect(game.lobbyRooms()[0].status).toBe('PLAYING');
  });

  it('lets later joiners spectate without taking a seat', async () => {
    const { game, roomId } = await startedGame();
    const state = game.join(carol, roomId, 'c1')!;
    expect(state.players.O?.id).toBe('bob');
    expect(state.spectators).toBe(1);
    expect(game.move(carol, roomId, 0, 0)).toBe('NOT_A_PLAYER');
  });

  it('enforces turns and empty cells', async () => {
    const { game, roomId } = await startedGame();
    expect(game.move(bob, roomId, 0, 0)).toBe('NOT_YOUR_TURN');
    expect(game.move(alice, roomId, 7, 7)).toBeNull();
    expect(game.move(alice, roomId, 8, 8)).toBe('NOT_YOUR_TURN');
    expect(game.move(bob, roomId, 7, 7)).toBe('CELL_TAKEN');
    expect(game.move(bob, roomId, 15, 0)).toBe('OUT_OF_BOUNDS');
    expect(game.move(bob, roomId, 8, 8)).toBeNull();
    expect(game.getState(roomId)!.turn).toBe('X');
  });

  it('ends the game on five in a row and stores the winner', async () => {
    const { game, roomId, db } = await startedGame();
    for (let i = 0; i < 4; i++) {
      game.move(alice, roomId, i, 0);
      game.move(bob, roomId, i, 1);
    }
    game.move(alice, roomId, 4, 0);

    const state = game.getState(roomId)!;
    expect(state.status).toBe('FINISHED');
    expect(state.winner).toBe('X');
    expect(state.result).toBe('WIN');
    expect(state.winLine).toHaveLength(5);
    expect(game.move(bob, roomId, 5, 5)).toBe('GAME_NOT_ACTIVE');

    await game.settled();
    const moves = db.filter((c) => c.model === 'move' && c.op === 'create');
    expect(moves.map((m) => m.args.data.moveNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const end = db.find((c) => c.model === 'game' && c.op === 'update');
    expect(end?.args.data).toMatchObject({ winnerId: 'alice', result: 'WIN' });
  });

  it('forfeits a player who stays disconnected past the grace period', async () => {
    const { game, roomId } = await startedGame();
    game.leave('bob', roomId, 'b1');
    expect(game.getState(roomId)!.awayDeadline.O).not.toBeNull();

    vi.advanceTimersByTime(game.awayGraceMs + 10);
    const state = game.getState(roomId)!;
    expect(state.status).toBe('FINISHED');
    expect(state.winner).toBe('X');
    expect(state.endReason).toBe('abandoned');
  });

  it('does not forfeit a player who reconnects in time', async () => {
    const { game, roomId } = await startedGame();
    game.leave('bob', roomId, 'b1');
    vi.advanceTimersByTime(game.awayGraceMs / 2);
    game.join(bob, roomId, 'b2');
    vi.advanceTimersByTime(game.awayGraceMs);
    expect(game.getState(roomId)!.status).toBe('PLAYING');
  });

  it('keeps a player present while another of their tabs is still open', async () => {
    const { game, roomId } = await startedGame();
    game.join(bob, roomId, 'b2');
    game.leave('bob', roomId, 'b1');
    expect(game.getState(roomId)!.connected.O).toBe(true);
    expect(game.getState(roomId)!.awayDeadline.O).toBeNull();
  });

  it('closes a waiting room whose host never comes back', async () => {
    const { game, emitted } = setup();
    const room = await game.createRoom(alice, 'Lonely');
    vi.advanceTimersByTime(game.awayGraceMs + 10);
    expect(game.hasRoom(room.id)).toBe(false);
    expect(emitted.some((e) => e.event === Events.RoomClosed && e.payload.reason === 'abandoned')).toBe(true);
  });

  it('resigning gives the win to the opponent', async () => {
    const { game, roomId } = await startedGame();
    expect(game.resign(alice, roomId)).toBeNull();
    const state = game.getState(roomId)!;
    expect(state.winner).toBe('O');
    expect(state.result).toBe('RESIGNED');
  });

  it('kickUser forfeits running games, closes hosted waiting rooms and disconnects sockets', async () => {
    const { game, roomId } = await startedGame();
    const waiting = await game.createRoom(bob, 'Bob waits');
    const socket = { emit: vi.fn(), disconnect: vi.fn() };
    game.registerSocket('bob', socket as any);

    const ban = { reason: 'spam', expiresAt: null };
    game.kickUser('bob', ban);

    const state = game.getState(roomId)!;
    expect(state.status).toBe('FINISHED');
    expect(state.winner).toBe('X');
    expect(state.endReason).toBe('banned');
    expect(game.hasRoom(waiting.id)).toBe(false);
    expect(socket.emit).toHaveBeenCalledWith(Events.AuthBanned, ban);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('admin close abandons a running game without a winner', async () => {
    const { game, roomId, db } = await startedGame();
    expect(game.closeRoom(roomId, 'closed')).toBe(true);
    expect(game.hasRoom(roomId)).toBe(false);
    await Promise.resolve();
    await vi.runAllTimersAsync();
    expect(db.some((c) => c.model === 'game' && c.op === 'update' && c.args.data.result === 'ABANDONED')).toBe(true);
    expect(db.some((c) => c.model === 'room' && c.op === 'update' && c.args.data.status === 'CLOSED')).toBe(true);
  });
});
