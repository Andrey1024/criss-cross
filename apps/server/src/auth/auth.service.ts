import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import type { DevLoginInput } from '@cc/shared';
import { config } from '../config';
import { PrismaService } from '../prisma.service';
import { activeBanWhere, toBanInfo } from '../common/mappers';
import { BannedException } from './banned.exception';

export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
    if (user.role !== 'ADMIN' && config.adminEmails.includes(user.email)) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }
    await this.assertNotBanned(user.id);
    return user;
  }

  signToken(user: User): string {
    return this.jwt.sign({ sub: user.id }, { secret: config.jwtSecret, expiresIn: TOKEN_TTL_SECONDS });
  }

  /**
   * Resolves the user behind a session token. Returns null for a missing/invalid token or
   * deleted user, and throws BannedException if the user has an active ban — so a ban takes
   * effect on the very next request, even for tokens issued before it.
   */
  async userFromToken(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    let sub: string;
    try {
      sub = this.jwt.verify<{ sub: string }>(token, { secret: config.jwtSecret }).sub;
    } catch {
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: { bans: { where: activeBanWhere(), orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user) return null;
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
