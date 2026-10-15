/**
 * Glicko-2 rating system (Mark Glickman, http://www.glicko.net/glicko/glicko2.pdf), as used by
 * lichess. Every game is treated as its own rating period.
 */

export interface GlickoRating {
  rating: number;
  /** Rating deviation: how uncertain the rating is. */
  rd: number;
  /** Volatility: how erratic the player's results are. */
  vol: number;
}

export interface GlickoResult {
  opponent: GlickoRating;
  /** 1 = win, 0.5 = draw, 0 = loss. */
  score: number;
}

export const RATING_DEFAULT: GlickoRating = { rating: 1500, rd: 350, vol: 0.06 };
/** System constant: how much volatility may change. */
export const TAU = 0.5;
export const MIN_RD = 45;
export const MAX_RD = 350;
export const MIN_RATING = 100;
/** Ratings with a deviation above this are provisional (shown with "?"), as on lichess. */
export const PROVISIONAL_RD = 110;

const SCALE = 173.7178;
const EPSILON = 1e-6;
const DAY_MS = 24 * 60 * 60 * 1000;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function isProvisional(rd: number): boolean {
  return rd > PROVISIONAL_RD;
}

/** Rating after one rating period with the given results. */
export function glicko2Rate(player: GlickoRating, results: GlickoResult[]): GlickoRating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.vol;

  if (results.length === 0) {
    // No games: only the uncertainty grows.
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { ...player, rd: clamp(phiStar * SCALE, MIN_RD, MAX_RD) };
  }

  // Step 3-4: estimated variance v and improvement delta.
  let vInv = 0;
  let deltaSum = 0;
  for (const { opponent, score } of results) {
    const muJ = (opponent.rating - 1500) / SCALE;
    const phiJ = opponent.rd / SCALE;
    const gJ = g(phiJ);
    const eJ = expected(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Step 5: new volatility, found with the Illinois algorithm.
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d = phi * phi + v + ex;
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * d * d) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const sigmaNew = Math.exp(A / 2);

  // Steps 6-8: new deviation and rating.
  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * deltaSum;

  return {
    rating: Math.max(MIN_RATING, muNew * SCALE + 1500),
    rd: clamp(phiNew * SCALE, MIN_RD, MAX_RD),
    vol: sigmaNew,
  };
}

/** Grows the deviation for the time since the player's last rated game (capped at MAX_RD). */
export function applyInactivity(player: GlickoRating, lastRatedAt: Date | null, now: Date): GlickoRating {
  if (!lastRatedAt) return player;
  const days = Math.max(0, (now.getTime() - lastRatedAt.getTime()) / DAY_MS);
  const phi = player.rd / SCALE;
  const phiNew = Math.sqrt(phi * phi + player.vol * player.vol * days);
  return { ...player, rd: Math.min(MAX_RD, phiNew * SCALE) };
}
