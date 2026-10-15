import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { pageQuerySchema, SESSION_HINT_COOKIE, type GameDetail, type GameHistoryPage, type Me } from '@cc/shared';
import { setSessionHint } from '../auth/auth.controller';
import { CurrentUser } from '../auth/decorators';
import { toMe } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { HistoryService } from './history.service';

@Controller()
export class MeController {
  constructor(private readonly history: HistoryService) {}

  @Get('me')
  me(@CurrentUser() user: User, @Req() req: Request, @Res({ passthrough: true }) res: Response): Me {
    // Sessions created before the hint cookie existed get it on their next visit.
    if (!req.cookies?.[SESSION_HINT_COOKIE]) setSessionHint(res);
    return toMe(user);
  }

  @Get('me/games')
  games(@CurrentUser() user: User, @Query(new ZodPipe(pageQuerySchema)) q: { page: number }): Promise<GameHistoryPage> {
    return this.history.forUser(user.id, q.page);
  }

  @Get('games/:id')
  game(@Param('id') id: string): Promise<GameDetail> {
    return this.history.detail(id);
  }
}
