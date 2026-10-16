import type { Ban, User } from '@prisma/client';
import { isProvisional, type BanInfo, type Me, type PublicUser } from '@cc/shared';

export function toPublicUser(u: Pick<User, 'id' | 'name' | 'avatarUrl'> & { isGuest?: boolean }): PublicUser {
  return u.isGuest ? { id: u.id, name: u.name, avatarUrl: u.avatarUrl, guest: true } : { id: u.id, name: u.name, avatarUrl: u.avatarUrl };
}

export function toMe(u: User): Me {
  return {
    ...toPublicUser(u),
    email: u.email ?? '',
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    rating: Math.round(u.rating),
    provisional: isProvisional(u.ratingDeviation),
    ratedGames: u.ratedGames,
  };
}

export function toBanInfo(b: Pick<Ban, 'reason' | 'expiresAt'>): BanInfo {
  return { reason: b.reason, expiresAt: b.expiresAt?.toISOString() ?? null };
}

/** Prisma filter for bans that are currently in force. */
export function activeBanWhere() {
  return { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}
