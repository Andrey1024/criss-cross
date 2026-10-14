import type { Board, Mark, Point } from './game';

export type Role = 'USER' | 'ADMIN';
export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'CLOSED';
export type GameResult = 'WIN' | 'DRAW' | 'RESIGNED' | 'ABANDONED';
/** Why a game or room ended, for display. */
export type EndReason = 'five' | 'draw' | 'resigned' | 'abandoned' | 'banned' | 'closed';

export interface PublicUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Me extends PublicUser {
  email: string;
  role: Role;
  createdAt: string;
}

export interface BanInfo {
  reason: string;
  /** ISO date; null means permanent. */
  expiresAt: string | null;
}

export interface AuthConfig {
  googleClientId: string | null;
  devLogin: boolean;
}

export interface LobbyRoom {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING';
  host: PublicUser;
  players: { X: PublicUser; O: PublicUser | null };
  createdAt: string;
}

export interface RoomState {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  boardSize: number;
  host: PublicUser;
  players: { X: PublicUser; O: PublicUser | null };
  /** Whether each seated player currently has the room open. */
  connected: { X: boolean; O: boolean };
  /** Epoch ms when an absent player forfeits (PLAYING) or the room closes (WAITING). */
  awayDeadline: { X: number | null; O: number | null };
  board: Board;
  turn: Mark;
  lastMove: Point | null;
  moveCount: number;
  winner: Mark | null;
  winLine: Point[] | null;
  result: GameResult | null;
  endReason: EndReason | null;
  gameId: string | null;
  spectators: number;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  user: PublicUser;
  text: string;
  createdAt: string;
}

/** 'none' = the game ended without a winner and wasn't a draw (e.g. closed by an admin). */
export type Outcome = 'win' | 'loss' | 'draw' | 'none';

export interface GameSummary {
  id: string;
  roomName: string;
  opponent: PublicUser;
  myMark: Mark;
  outcome: Outcome;
  result: GameResult;
  moveCount: number;
  startedAt: string;
  endedAt: string;
}

export interface GameHistoryPage {
  items: GameSummary[];
  total: number;
  page: number;
  pageSize: number;
  stats: { played: number; wins: number; losses: number; draws: number };
}

export interface GameDetail {
  id: string;
  roomName: string;
  boardSize: number;
  players: { X: PublicUser; O: PublicUser };
  winner: Mark | null;
  result: GameResult | null;
  startedAt: string;
  endedAt: string | null;
  moves: Array<Point & { mark: Mark }>;
}

export interface BanRecord {
  id: string;
  reason: string;
  admin: PublicUser;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface AdminUser extends Me {
  activeBan: BanInfo | null;
  gamesPlayed: number;
}

export interface AdminUsersPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminChatMessage extends ChatMessageDto {
  roomName: string;
}

export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
