import { z } from 'zod';

export const CHAT_MAX_LENGTH = 500;
export const ROOM_NAME_MAX_LENGTH = 40;
export const GUEST_NAME_MAX_LENGTH = 30;
export const BAN_DURATIONS_DAYS = [1, 7, 30] as const;

const id = z.string().min(1).max(64);
const coord = z.number().int().min(0).max(99);

export const googleLoginSchema = z.object({ credential: z.string().min(1) });
export const devLoginSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(50),
});
export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(ROOM_NAME_MAX_LENGTH),
  unrated: z.boolean().default(false),
});
export const guestJoinSchema = z.object({
  name: z.string().trim().min(1).max(GUEST_NAME_MAX_LENGTH),
});
export const roomRefSchema = z.object({ roomId: id });
/** offer: true to offer (or accept) a rematch, false to withdraw the offer. */
export const rematchSchema = z.object({ roomId: id, offer: z.boolean() });
/** agree: true proposes (or accepts) switching the move timer, false withdraws or declines. */
export const timerVoteSchema = z.object({ roomId: id, agree: z.boolean() });
export const moveSchema = z.object({ roomId: id, x: coord, y: coord });
export const chatSendSchema = z.object({
  roomId: id,
  text: z.string().trim().min(1).max(CHAT_MAX_LENGTH),
});
export const banSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  /** Omitted or null = permanent. */
  durationDays: z.number().int().min(1).max(3650).nullish(),
});
export const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
export const adminUsersQuerySchema = pageQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  banned: z.enum(['true', 'false']).optional(),
});

export type DevLoginInput = z.infer<typeof devLoginSchema>;
export type BanInput = z.infer<typeof banSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type GuestJoinInput = z.infer<typeof guestJoinSchema>;
