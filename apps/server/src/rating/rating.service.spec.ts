import { describe, expect, it } from 'vitest';
import { isRatable, RatingService } from './rating.service';

function user(id: string, rating = 1500, ratingDeviation = 350) {
  return { id, name: id, rating, ratingDeviation, ratingVolatility: 0.06, ratedGames: 0, lastRatedAt: null };
}

function setup(games: Record<string, any>, opts: { delayMs?: number } = {}) {
  const users = new Map([
    ['alice', user('alice')],
    ['bob', user('bob')],
  ]);
  const gameUpdates: any[] = [];
  const log: string[] = [];
  const tx = {
    game: {
      findUnique: async ({ where }: any) => {
        const g = games[where.id];
        return g && { ...g, xPlayer: users.get(g.xPlayerId), oPlayer: users.get(g.oPlayerId) };
      },
      update: async ({ where, data }: any) => {
        gameUpdates.push({ id: where.id, ...data });
        Object.assign(games[where.id], data);
      },
    },
    user: {
      update: async ({ where, data }: any) => {
        const u = users.get(where.id)!;
        const next = { ...u, ...data, ratedGames: u.ratedGames + data.ratedGames.increment };
        users.set(where.id, next);
        return next;
      },
    },
  };
  const prisma = {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      log.push('start');
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      const result = await fn(tx);
      log.push('end');
      return result;
    },
  };
  return { service: new RatingService(prisma as any), users, gameUpdates, log };
}

const game = (over: Record<string, unknown> = {}) => ({
  xPlayerId: 'alice',
  oPlayerId: 'bob',
  winnerId: 'alice',
  result: 'WIN',
  rated: false,
  _count: { moves: 9 },
  ...over,
});

describe('isRatable', () => {
  it('rates games with a result where both players moved', () => {
    expect(isRatable('WIN', 'a', 9)).toBe(true);
    expect(isRatable('RESIGNED', 'a', 2)).toBe(true);
    expect(isRatable('ABANDONED', 'a', 4)).toBe(true);
    expect(isRatable('DRAW', null, 225)).toBe(true);
  });

  it('skips games without a winner, aborted games and unfinished games', () => {
    expect(isRatable('ABANDONED', null, 10)).toBe(false); // admin close / server restart
    expect(isRatable('RESIGNED', 'a', 1)).toBe(false); // only one move made
    expect(isRatable(null, null, 10)).toBe(false);
  });
});

describe('RatingService', () => {
  it('updates both players and records the changes on the game', async () => {
    const { service, users, gameUpdates } = setup({ g1: game() });
    const change = await service.rateGame('g1');

    expect(change!.X).toBeGreaterThan(0);
    expect(change!.O).toBeLessThan(0);
    expect(users.get('alice')!.ratedGames).toBe(1);
    expect(users.get('bob')!.ratingDeviation).toBeLessThan(350);
    expect(gameUpdates[0]).toMatchObject({ rated: true, xRatingBefore: 1500, oRatingBefore: 1500, xRatingDiff: change!.X, oRatingDiff: change!.O });
    expect(service.view('alice').rating).toBe(1500 + change!.X);
  });

  it('does not rate a game twice', async () => {
    const { service } = setup({ g1: game() });
    await service.rateGame('g1');
    expect(await service.rateGame('g1')).toBeNull();
  });

  it('leaves unrated games alone', async () => {
    const { service, gameUpdates } = setup({ g1: game({ winnerId: null, result: 'ABANDONED' }) });
    expect(await service.rateGame('g1')).toBeNull();
    expect(gameUpdates).toHaveLength(0);
  });

  it('applies rating updates one at a time', async () => {
    const { service, log } = setup({ g1: game(), g2: game({ winnerId: 'bob' }) }, { delayMs: 20 });
    await Promise.all([service.rateGame('g1'), service.rateGame('g2')]);
    expect(log).toEqual(['start', 'end', 'start', 'end']);
  });
});
