export * from './game';
export * from './types';
export * from './schemas';

/** Socket.IO event names shared by client and server. */
export const Events = {
  LobbySubscribe: 'lobby:subscribe',
  LobbyUnsubscribe: 'lobby:unsubscribe',
  LobbyRooms: 'lobby:rooms',
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  RoomState: 'room:state',
  RoomClosed: 'room:closed',
  GameMove: 'game:move',
  GameResign: 'game:resign',
  ChatSend: 'chat:send',
  ChatHistory: 'chat:history',
  ChatMessage: 'chat:message',
  ChatDeleted: 'chat:deleted',
  AuthBanned: 'auth:banned',
} as const;

/** Seconds an absent player has to come back before forfeiting. */
export const AWAY_GRACE_SECONDS = 30;
export const AUTH_COOKIE = 'cc_token';
