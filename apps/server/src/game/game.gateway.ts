import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { parse as parseCookie } from 'cookie';
import type { Server, Socket } from 'socket.io';
import {
  AUTH_COOKIE,
  GUEST_COOKIE,
  chatSendSchema,
  Events,
  moveSchema,
  rematchSchema,
  roomRefSchema,
  type Ack,
  type PublicUser,
  type RoomState,
} from '@cc/shared';
import { AuthService } from '../auth/auth.service';
import { BannedException } from '../auth/banned.exception';
import { toPublicUser } from '../common/mappers';
import { ChatService } from './chat.service';
import { GameService, LOBBY_CHANNEL, roomChannel } from './game.service';

interface SocketData {
  user: PublicUser;
  /** Guests may only join unrated rooms. */
  guest: boolean;
  roomId?: string;
}
type AppSocket = Socket<any, any, any, SocketData>;

const fail = (error: string): Ack<never> => ({ ok: false, error });

@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private server: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly game: GameService,
    private readonly chat: ChatService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.game.attachServer(server);
    // Authenticate during the handshake, so no event handler ever runs for an anonymous socket.
    server.use(async (socket: AppSocket, next) => {
      try {
        const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
        // A signed-in session wins over a guest identity left over from an invite link.
        const user = await this.auth.userFromToken(cookies[AUTH_COOKIE]);
        const guest = user ? null : await this.auth.guestFromToken(cookies[GUEST_COOKIE]);
        if (!user && !guest) return next(new Error('UNAUTHORIZED'));
        socket.data.user = toPublicUser((user ?? guest)!);
        socket.data.guest = !user;
        next();
      } catch (err) {
        if (err instanceof BannedException) {
          return next(Object.assign(new Error('BANNED'), { data: err.ban }));
        }
        this.logger.error('Socket auth failed', err as Error);
        next(new Error('UNAUTHORIZED'));
      }
    });
  }

  handleConnection(socket: AppSocket) {
    this.game.registerSocket(socket.data.user.id, socket);
  }

  handleDisconnect(socket: AppSocket) {
    if (!socket.data.user) return;
    this.game.unregisterSocket(socket.data.user.id, socket);
    if (socket.data.roomId) this.game.leave(socket.data.user.id, socket.data.roomId, socket.id);
  }

  @SubscribeMessage(Events.LobbySubscribe)
  lobbySubscribe(@ConnectedSocket() socket: AppSocket) {
    if (socket.data.guest) return;
    socket.join(LOBBY_CHANNEL);
    socket.emit(Events.LobbyRooms, this.game.lobbyRooms());
  }

  @SubscribeMessage(Events.LobbyUnsubscribe)
  lobbyUnsubscribe(@ConnectedSocket() socket: AppSocket) {
    socket.leave(LOBBY_CHANNEL);
  }

  @SubscribeMessage(Events.RoomJoin)
  async roomJoin(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack<RoomState>> {
    const parsed = roomRefSchema.safeParse(body);
    if (!parsed.success) return fail('INVALID_PAYLOAD');
    const { roomId } = parsed.data;

    if (socket.data.roomId && socket.data.roomId !== roomId) this.leaveCurrentRoom(socket);
    if (!this.game.hasRoom(roomId)) return fail('ROOM_NOT_FOUND');
    if (socket.data.guest && !this.game.isUnrated(roomId)) return fail('SIGN_IN_REQUIRED');

    socket.join(roomChannel(roomId));
    socket.data.roomId = roomId;
    const state = this.game.join(socket.data.user, roomId, socket.id)!;
    socket.emit(Events.ChatHistory, await this.chat.history(roomId));
    return { ok: true, data: state };
  }

  @SubscribeMessage(Events.RoomLeave)
  roomLeave(@ConnectedSocket() socket: AppSocket): Ack {
    this.leaveCurrentRoom(socket);
    return { ok: true, data: undefined };
  }

  @SubscribeMessage(Events.GameMove)
  gameMove(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Ack {
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) return fail('INVALID_PAYLOAD');
    const { roomId, x, y } = parsed.data;
    const error = this.game.move(socket.data.user, roomId, x, y);
    return error ? fail(error) : { ok: true, data: undefined };
  }

  @SubscribeMessage(Events.GameResign)
  gameResign(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Ack {
    const parsed = roomRefSchema.safeParse(body);
    if (!parsed.success) return fail('INVALID_PAYLOAD');
    const error = this.game.resign(socket.data.user, parsed.data.roomId);
    return error ? fail(error) : { ok: true, data: undefined };
  }

  @SubscribeMessage(Events.GameRematch)
  gameRematch(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Ack {
    const parsed = rematchSchema.safeParse(body);
    if (!parsed.success) return fail('INVALID_PAYLOAD');
    const error = this.game.rematch(socket.data.user, parsed.data.roomId, parsed.data.offer);
    return error ? fail(error) : { ok: true, data: undefined };
  }

  @SubscribeMessage(Events.ChatSend)
  async chatSend(@ConnectedSocket() socket: AppSocket, @MessageBody() body: unknown): Promise<Ack> {
    const parsed = chatSendSchema.safeParse(body);
    if (!parsed.success) return fail('INVALID_PAYLOAD');
    const { roomId, text } = parsed.data;
    const { user } = socket.data;
    if (socket.data.roomId !== roomId || !this.game.isInRoom(roomId, user.id)) return fail('NOT_IN_ROOM');
    if (!this.chat.allow(user.id)) return fail('RATE_LIMITED');

    const message = await this.chat.send(user, roomId, text);
    this.server.to(roomChannel(roomId)).emit(Events.ChatMessage, message);
    return { ok: true, data: undefined };
  }

  private leaveCurrentRoom(socket: AppSocket) {
    const { roomId } = socket.data;
    if (!roomId) return;
    socket.leave(roomChannel(roomId));
    socket.data.roomId = undefined;
    this.game.leave(socket.data.user.id, roomId, socket.id);
  }
}
