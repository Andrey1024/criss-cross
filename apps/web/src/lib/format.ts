import type { BanInfo, EndReason, GameResult, Outcome } from '@cc/shared';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));

export function banUntil(ban: BanInfo): string {
  return ban.expiresAt ? `until ${formatDateTime(ban.expiresAt)}` : 'permanently';
}

export const OUTCOME_LABEL: Record<Outcome, string> = { win: 'Win', loss: 'Loss', draw: 'Draw', none: 'No result' };

export const RESULT_LABEL: Record<GameResult, string> = {
  WIN: 'Five in a row',
  DRAW: 'Board full',
  RESIGNED: 'Resigned',
  ABANDONED: 'Abandoned',
};

export const END_REASON_LABEL: Record<EndReason, string> = {
  five: 'five in a row',
  draw: 'the board is full',
  resigned: 'resignation',
  abandoned: 'the opponent left',
  banned: 'the opponent was banned',
  closed: 'the room was closed',
};

const ERROR_LABEL: Record<string, string> = {
  ROOM_NOT_FOUND: 'This room no longer exists.',
  GAME_NOT_ACTIVE: 'The game is not running.',
  NOT_A_PLAYER: 'You are watching this game.',
  NOT_YOUR_TURN: "It's not your turn.",
  CELL_TAKEN: 'That cell is already taken.',
  OUT_OF_BOUNDS: 'That cell is outside the board.',
  GAME_NOT_FINISHED: 'The game is still running.',
  OPPONENT_LEFT: 'Your opponent has left the room.',
  SIGN_IN_REQUIRED: 'Sign in to join this room.',
  NOT_IN_ROOM: 'You are not in this room.',
  RATE_LIMITED: "You're sending messages too fast.",
  TIMEOUT: 'The server did not respond. Check your connection.',
  INVALID_PAYLOAD: 'Invalid request.',
};
export const errorText = (code: string) => ERROR_LABEL[code] ?? code;
