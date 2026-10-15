import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { LeaderboardResponse, RatingPoint } from '@cc/shared';
import { CurrentUser } from '../auth/decorators';
import { RatingService } from './rating.service';

@Controller()
export class LeaderboardController {
  constructor(private readonly ratings: RatingService) {}

  @Get('leaderboard')
  leaderboard(@CurrentUser() me: User): Promise<LeaderboardResponse> {
    return this.ratings.leaderboard(me);
  }

  @Get('me/rating-history')
  history(@CurrentUser() me: User): Promise<RatingPoint[]> {
    return this.ratings.history(me.id);
  }
}
