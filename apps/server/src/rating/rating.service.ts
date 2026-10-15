import { Injectable } from '@nestjs/common';
import type { GameResult, User } from '@prisma/client';
import {
  applyInactivity,
  glicko2Rate,
  isProvisional,
  PROVISIONAL_RD,
  type GlickoRating,
  type LeaderboardResponse,
  type RatingPoint,
  type RatingView,
} from '@cc/shared';
import { PrismaService } from '../prisma.service';
import { activeBanWhere, toPublicUser } from '../common/mappers';

export const LEADERBOARD_DAYS = 30;
export const LEADERBOARD_MIN_GAMES = 3;
const LEADERBOARD_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RatingChange = { X: number; O: number };
type RatingFields = Pick<User, 'id' | 'rating' | 'ratingDeviation'>;

export function toRatingView(u: Pick<User, 'rating' | 'ratingDeviation'>): RatingView {
  return { rating: Math.round(u.rating), provisional: isProvisional(u.ratingDeviation) };
}

/**
 * Lichess-style rule: a game counts if it has a result (a winner or a draw) and each player made
 * at least one move. Games closed by an admin or a restart have no winner and aren't rated.
 */
export function isRatable(result: GameResult | null, winnerId: string | null, moveCount: number): boolean {
  if (!result || moveCount < 2) return false;
  return result === 'DRAW' || winnerId !== null;
}

@Injectable()
export class RatingService {
  /** Ratings are applied one game at a time: a player may finish games in two rooms at once. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Latest rating per user, for lobby/room display without DB reads. */
  private readonly cache = new Map<string, RatingView>();

  constructor(private readonly prisma: PrismaService) {}

  view(userId: string): RatingView {
    return this.cache.get(userId) ?? { rating: 1500, provisional: true };
  }

  remember(user: RatingFields) {
    this.cache.set(user.id, toRatingView(user));
  }

  /** Rates a finished game. Resolves with each side's rating change, or null if it isn't rated. */
  rateGame(gameId: string): Promise<RatingChange | null> {
    const run = this.queue.then(() => this.rate(gameId));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async rate(gameId: string): Promise<RatingChange | null> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        include: { xPlayer: true, oPlayer: true, _count: { select: { moves: true } } },
      });
      if (!game || game.rated || !isRatable(game.result, game.winnerId, game._count.moves)) return null;

      const now = new Date();
      const current = (u: User): GlickoRating =>
        applyInactivity({ rating: u.rating, rd: u.ratingDeviation, vol: u.ratingVolatility }, u.lastRatedAt, now);
      const x = current(game.xPlayer);
      const o = current(game.oPlayer);
      const scoreX = game.winnerId === game.xPlayerId ? 1 : game.winnerId ? 0 : 0.5;
      const newX = glicko2Rate(x, [{ opponent: o, score: scoreX }]);
      const newO = glicko2Rate(o, [{ opponent: x, score: 1 - scoreX }]);
      const diff = {
        X: Math.round(newX.rating) - Math.round(game.xPlayer.rating),
        O: Math.round(newO.rating) - Math.round(game.oPlayer.rating),
      };

      const save = (id: string, r: GlickoRating) =>
        tx.user.update({
          where: { id },
          data: { rating: r.rating, ratingDeviation: r.rd, ratingVolatility: r.vol, ratedGames: { increment: 1 }, lastRatedAt: now },
        });
      const users = [await save(game.xPlayerId, newX), await save(game.oPlayerId, newO)];
      await tx.game.update({
        where: { id: gameId },
        data: {
          rated: true,
          xRatingBefore: Math.round(game.xPlayer.rating),
          oRatingBefore: Math.round(game.oPlayer.rating),
          xRatingDiff: diff.X,
          oRatingDiff: diff.O,
        },
      });
      return { diff, users };
    });
    if (!updated) return null;
    for (const u of updated.users) this.remember(u);
    return updated.diff;
  }

  async history(userId: string): Promise<RatingPoint[]> {
    const games = await this.prisma.game.findMany({
      where: { rated: true, OR: [{ xPlayerId: userId }, { oPlayerId: userId }] },
      orderBy: { endedAt: 'asc' },
      select: { xPlayerId: true, xRatingBefore: true, oRatingBefore: true, xRatingDiff: true, oRatingDiff: true, startedAt: true, endedAt: true },
    });
    const points: RatingPoint[] = [];
    for (const g of games) {
      const isX = g.xPlayerId === userId;
      const before = (isX ? g.xRatingBefore : g.oRatingBefore) ?? 1500;
      const diff = (isX ? g.xRatingDiff : g.oRatingDiff) ?? 0;
      if (points.length === 0) points.push({ date: g.startedAt.toISOString(), rating: before });
      points.push({ date: (g.endedAt ?? g.startedAt).toISOString(), rating: before + diff });
    }
    return points;
  }

  /** Best players by rating among those active in the last 30 days with a settled rating. */
  async leaderboard(me: User): Promise<LeaderboardResponse> {
    const since = new Date(Date.now() - LEADERBOARD_DAYS * DAY_MS);
    const games = await this.prisma.game.findMany({
      where: { rated: true, endedAt: { gte: since } },
      select: { xPlayerId: true, oPlayerId: true, winnerId: true, xRatingDiff: true, oRatingDiff: true },
    });

    const stats = new Map<string, { games: number; wins: number; losses: number; draws: number; ratingChange: number }>();
    const add = (id: string, diff: number | null, outcome: 'wins' | 'losses' | 'draws') => {
      const s = stats.get(id) ?? { games: 0, wins: 0, losses: 0, draws: 0, ratingChange: 0 };
      s.games++;
      s[outcome]++;
      s.ratingChange += diff ?? 0;
      stats.set(id, s);
    };
    for (const g of games) {
      const xOutcome = g.winnerId === null ? 'draws' : g.winnerId === g.xPlayerId ? 'wins' : 'losses';
      const oOutcome = g.winnerId === null ? 'draws' : g.winnerId === g.oPlayerId ? 'wins' : 'losses';
      add(g.xPlayerId, g.xRatingDiff, xOutcome);
      add(g.oPlayerId, g.oRatingDiff, oOutcome);
    }

    const eligible = [...stats].filter(([, s]) => s.games >= LEADERBOARD_MIN_GAMES).map(([id]) => id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: eligible }, ratingDeviation: { lte: PROVISIONAL_RD }, bans: { none: activeBanWhere() } },
      orderBy: { rating: 'desc' },
      take: LEADERBOARD_SIZE,
    });
    const entries = users.map((u, i) => ({ rank: i + 1, user: toPublicUser(u), rating: Math.round(u.rating), ...stats.get(u.id)! }));

    const myGames = stats.get(me.id)?.games ?? 0;
    return {
      days: LEADERBOARD_DAYS,
      minGames: LEADERBOARD_MIN_GAMES,
      entries,
      me: {
        rank: entries.find((e) => e.user.id === me.id)?.rank ?? null,
        rating: Math.round(me.rating),
        provisional: isProvisional(me.ratingDeviation),
        games: myGames,
        gamesNeeded: Math.max(0, LEADERBOARD_MIN_GAMES - myGames),
      },
    };
  }
}
