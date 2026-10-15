import { describe, expect, it } from 'vitest';
import { applyInactivity, glicko2Rate, isProvisional, MAX_RD, RATING_DEFAULT, type GlickoRating } from './rating';

const p = (rating: number, rd: number, vol = 0.06): GlickoRating => ({ rating, rd, vol });

describe('glicko2Rate', () => {
  it("matches the worked example in Glickman's Glicko-2 paper", () => {
    const result = glicko2Rate(p(1500, 200), [
      { opponent: p(1400, 30), score: 1 },
      { opponent: p(1550, 100), score: 0 },
      { opponent: p(1700, 300), score: 0 },
    ]);
    expect(result.rating).toBeCloseTo(1464.06, 1);
    expect(result.rd).toBeCloseTo(151.52, 1);
    expect(result.vol).toBeCloseTo(0.05999, 4);
  });

  it('a win between equal players moves both ratings by the same amount', () => {
    const a = RATING_DEFAULT;
    const b = RATING_DEFAULT;
    const winner = glicko2Rate(a, [{ opponent: b, score: 1 }]);
    const loser = glicko2Rate(b, [{ opponent: a, score: 0 }]);
    expect(winner.rating).toBeGreaterThan(1500);
    expect(loser.rating).toBeLessThan(1500);
    expect(winner.rating - 1500).toBeCloseTo(1500 - loser.rating, 6);
  });

  it('a draw between equal players changes almost nothing', () => {
    const r = glicko2Rate(p(1600, 80), [{ opponent: p(1600, 80), score: 0.5 }]);
    expect(Math.abs(r.rating - 1600)).toBeLessThan(0.01);
  });

  it('an upset win gains more than an expected win', () => {
    const upset = glicko2Rate(p(1400, 80), [{ opponent: p(1800, 80), score: 1 }]);
    const expectedWin = glicko2Rate(p(1800, 80), [{ opponent: p(1400, 80), score: 1 }]);
    expect(upset.rating - 1400).toBeGreaterThan(expectedWin.rating - 1800);
  });

  it('new players move fast and established players slowly', () => {
    const fresh = glicko2Rate(RATING_DEFAULT, [{ opponent: p(1500, 60), score: 1 }]);
    const settled = glicko2Rate(p(1500, 60), [{ opponent: p(1500, 60), score: 1 }]);
    expect(fresh.rating - 1500).toBeGreaterThan(100);
    expect(settled.rating - 1500).toBeLessThan(15);
  });

  it('deviation shrinks after a game', () => {
    expect(glicko2Rate(p(1500, 200), [{ opponent: p(1500, 100), score: 1 }]).rd).toBeLessThan(200);
  });
});

describe('applyInactivity', () => {
  const now = new Date('2026-10-15T12:00:00Z');

  it('grows the deviation with time away, capped', () => {
    const settled = p(1700, 60);
    const month = applyInactivity(settled, new Date('2026-09-15T12:00:00Z'), now);
    const year = applyInactivity(settled, new Date('2025-10-15T12:00:00Z'), now);
    expect(month.rd).toBeGreaterThan(60);
    expect(year.rd).toBeGreaterThan(month.rd);
    expect(applyInactivity(settled, new Date('2000-01-01'), now).rd).toBe(MAX_RD);
    expect(month.rating).toBe(1700);
  });

  it('leaves a player without rated games unchanged', () => {
    expect(applyInactivity(RATING_DEFAULT, null, now)).toEqual(RATING_DEFAULT);
  });
});

describe('isProvisional', () => {
  it('uses the lichess threshold of RD 110', () => {
    expect(isProvisional(350)).toBe(true);
    expect(isProvisional(111)).toBe(true);
    expect(isProvisional(110)).toBe(false);
    expect(isProvisional(60)).toBe(false);
  });
});
