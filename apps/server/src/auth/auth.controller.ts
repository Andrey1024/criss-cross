import { Body, Controller, Get, HttpCode, NotFoundException, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import {
  AUTH_COOKIE,
  GUEST_COOKIE,
  SESSION_HINT_COOKIE,
  devLoginSchema,
  googleLoginSchema,
  type AuthConfig,
  type DevLoginInput,
  type Me,
  type PublicUser,
} from '@cc/shared';
import { config } from '../config';
import { toMe, toPublicUser } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService, TOKEN_TTL_SECONDS } from './auth.service';
import { Public } from './decorators';

export function setSessionHint(res: Response) {
  res.cookie(SESSION_HINT_COOKIE, '1', { sameSite: 'lax', secure: config.isProduction, maxAge: TOKEN_TTL_SECONDS * 1000, path: '/' });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('config')
  getConfig(): AuthConfig {
    return { googleClientId: config.googleClientId, devLogin: config.devLogin };
  }

  /**
   * The current user, or null when signed out. Unlike GET /me this never answers 401, so a
   * guest's first page load doesn't log an error.
   */
  @Public()
  @Get('session')
  async session(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ user: Me | null }> {
    const user = await this.auth.userFromToken(req.cookies?.[AUTH_COOKIE]);
    if (!user) {
      if (req.cookies?.[SESSION_HINT_COOKIE]) res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
      return { user: null };
    }
    if (!req.cookies?.[SESSION_HINT_COOKIE]) setSessionHint(res);
    return { user: toMe(user) };
  }

  /** The guest identity from an unrated room's invite link, if this browser has one. */
  @Public()
  @Get('guest')
  async guest(@Req() req: Request): Promise<{ guest: PublicUser | null }> {
    const guest = await this.auth.guestFromToken(req.cookies?.[GUEST_COOKIE]);
    return { guest: guest ? toPublicUser(guest) : null };
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  async google(
    @Body(new ZodPipe(googleLoginSchema)) body: { credential: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<Me> {
    return this.startSession(await this.auth.loginWithGoogle(body.credential), res);
  }

  @Public()
  @Post('dev')
  @HttpCode(200)
  async dev(@Body(new ZodPipe(devLoginSchema)) body: DevLoginInput, @Res({ passthrough: true }) res: Response): Promise<Me> {
    if (!config.devLogin) throw new NotFoundException();
    return this.startSession(await this.auth.devLogin(body), res);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
  }

  private startSession(user: User, res: Response): Me {
    res.cookie(AUTH_COOKIE, this.auth.signToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: TOKEN_TTL_SECONDS * 1000,
      path: '/',
    });
    setSessionHint(res);
    return toMe(user);
  }
}
