export * from './game';
export * from './types';
export * from './schemas';
export * from './ai';
export * from './rating';

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
  GameRematch: 'game:rematch',
  ChatSend: 'chat:send',
  ChatHistory: 'chat:history',
  ChatMessage: 'chat:message',
  ChatDeleted: 'chat:deleted',
  AuthBanned: 'auth:banned',
} as const;

/** Seconds an absent player has to come back before forfeiting. */
export const AWAY_GRACE_SECONDS = 30;
export const AUTH_COOKIE = 'cc_token';
/** Session of a guest who joined an unrated room by link. Never accepted as a signed-in session. */
export const GUEST_COOKIE = 'cc_guest';
/**
 * Readable (non-httpOnly) hint that a session probably exists, so the browser can skip showing
 * the pre-rendered public landing page to signed-in users. Never trusted by the server.
 */
export const SESSION_HINT_COOKIE = 'cc_session';
