import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import type { DevLoginInput, GuestJoinInput } from '@cc/shared';
import { config } from '../config';
import { PrismaService } from '../prisma.service';
import { activeBanWhere, toBanInfo } from '../common/mappers';
import { BannedException } from './banned.exception';
import { RatingService } from '../rating/rating.service';

export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const GUEST_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TokenPayload {
  sub: string;
  /** Set on guest tokens, which are only good for joining unrated rooms. */
  guest?: true;
}

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly ratings: RatingService,
  ) {}

  async loginWithGoogle(credential: string): Promise<User> {
    const clientId = config.googleClientId;
    if (!clientId) throw new UnauthorizedException('Google login is not configured');

    const ticket = await this.google
      .verifyIdToken({ idToken: credential, audience: clientId })
      .catch(() => {
        throw new UnauthorizedException('Invalid Google credential');
      });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email || !p.email_verified) throw new UnauthorizedException('Google account email is not verified');

    const email = p.email.toLowerCase();
    const profile = { name: p.name || email.split('@')[0], avatarUrl: p.picture ?? null };
    // Link by googleId first, then by email (e.g. an account first created via dev login).
    const existing =
      (await this.prisma.user.findUnique({ where: { googleId: p.sub } })) ??
      (await this.prisma.user.findUnique({ where: { email } }));
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { ...profile, googleId: p.sub, email } })
      : await this.prisma.user.create({ data: { ...profile, googleId: p.sub, email } });
    return this.finishLogin(user);
  }

  async devLogin({ email, name }: DevLoginInput): Promise<User> {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, name },
    });
    return this.finishLogin(user);
  }

  private async finishLogin(user: User): Promise<User> {
    if (user.role !== 'ADMIN' && user.email && config.adminEmails.includes(user.email)) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }
    await this.assertNotBanned(user.id);
    this.ratings.remember(user);
    return user;
  }

  signToken(user: User): string {
    return this.jwt.sign({ sub: user.id }, { secret: config.jwtSecret, expiresIn: TOKEN_TTL_SECONDS });
  }

  signGuestToken(guest: User): string {
    const payload: TokenPayload = { sub: guest.id, guest: true };
    return this.jwt.sign(payload, { secret: config.jwtSecret, expiresIn: GUEST_TOKEN_TTL_SECONDS });
  }

  /**
   * Resolves the user behind a session token. Returns null for a missing/invalid token, a guest
   * token or a deleted user, and throws BannedException if the user has an active ban — so a ban
   * takes effect on the very next request, even for tokens issued before it.
   */
  async userFromToken(token: string | undefined): Promise<User | null> {
    const user = await this.resolve(token, false);
    if (user) this.ratings.remember(user);
    return user;
  }

  /** Like userFromToken, for the guest cookie: only guest tokens of guest users resolve. */
  guestFromToken(token: string | undefined): Promise<User | null> {
    return this.resolve(token, true);
  }

  /** Creates a guest, or renames the one behind an existing guest token. */
  async joinAsGuest(token: string | undefined, { name }: GuestJoinInput): Promise<User> {
    const existing = await this.guestFromToken(token);
    if (existing) return this.prisma.user.update({ where: { id: existing.id }, data: { name } });
    return this.prisma.user.create({ data: { name, isGuest: true } });
  }

  private async resolve(token: string | undefined, guest: boolean): Promise<User | null> {
    if (!token) return null;
    let payload: TokenPayload;
    try {
      payload = this.jwt.verify<TokenPayload>(token, { secret: config.jwtSecret });
    } catch {
      return null;
    }
    // Guest and member tokens are never interchangeable, whichever cookie they arrive in.
    if (Boolean(payload.guest) !== guest) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { bans: { where: activeBanWhere(), orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user || user.isGuest !== guest) return null;
    const { bans, ...rest } = user;
    if (bans[0]) throw new BannedException(toBanInfo(bans[0]));
    return rest;
  }

  private async assertNotBanned(userId: string) {
    const ban = await this.prisma.ban.findFirst({
      where: { userId, ...activeBanWhere() },
      orderBy: { createdAt: 'desc' },
    });
    if (ban) throw new BannedException(toBanInfo(ban));
  }
}
