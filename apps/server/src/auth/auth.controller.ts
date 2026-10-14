import { Body, Controller, Get, HttpCode, NotFoundException, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { AUTH_COOKIE, devLoginSchema, googleLoginSchema, type AuthConfig, type DevLoginInput, type Me } from '@cc/shared';
import { config } from '../config';
import { toMe } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService, TOKEN_TTL_SECONDS } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('config')
  getConfig(): AuthConfig {
    return { googleClientId: config.googleClientId, devLogin: config.devLogin };
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
  }

  private startSession(user: User, res: Response): Me {
    res.cookie(AUTH_COOKIE, this.auth.signToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: TOKEN_TTL_SECONDS * 1000,
      path: '/',
    });
    return toMe(user);
  }
}
