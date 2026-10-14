import { Controller, Get, Param, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { pageQuerySchema, type GameDetail, type GameHistoryPage, type Me } from '@cc/shared';
import { CurrentUser } from '../auth/decorators';
import { toMe } from '../common/mappers';
import { ZodPipe } from '../common/zod.pipe';
import { HistoryService } from './history.service';

@Controller()
export class MeController {
  constructor(private readonly history: HistoryService) {}

  @Get('me')
  me(@CurrentUser() user: User): Me {
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
