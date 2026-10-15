import { describe, expect, it } from 'vitest';
import { chooseMove, type AiLevel, type AiSearchInfo } from './ai';
import { createBoard, findWinLine, isBoardFull, otherMark, type Board, type Mark } from './game';

function place(board: Board, mark: Mark, cells: Array<[number, number]>) {
  for (const [x, y] of cells) board[y][x] = mark;
}

/** Deterministic PRNG for reproducible games. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays from `board` with `mark` to move; returns the winner (or null) within `maxMoves` plies. */
function playOut(board: Board, mark: Mark, levels: Record<Mark, AiLevel>, maxMoves: number, timeMs?: number): Mark | null {
  for (let i = 0; i < maxMoves; i++) {
    const move = chooseMove(board, mark, levels[mark], { timeMs })!;
    board[move.y][move.x] = mark;
    if (findWinLine(board, move.x, move.y)) return mark;
    if (isBoardFull(board)) return null;
    mark = otherMark(mark);
  }
  return null;
}

/**
 * X can win by continuous fours: (8,4) makes a diagonal four and, after O's forced block at (9,5),
 * (8,7) makes two fours at once.
 */
function vcfPosition(): Board {
  const b = createBoard();
  place(b, 'X', [[5, 7], [6, 7], [7, 7], [8, 5], [8, 6], [5, 1], [6, 2], [7, 3]]);
  place(b, 'O', [[4, 7], [8, 3], [4, 0], [12, 12], [13, 10], [1, 13], [10, 13]]);
  return b;
}

const LEVELS: AiLevel[] = ['easy', 'medium', 'hard'];

describe('chooseMove', () => {
  it('opens in the centre of an empty board', () => {
    expect(chooseMove(createBoard(), 'X', 'hard')).toEqual({ x: 7, y: 7 });
  });

  it.each(LEVELS)('%s completes its own four', (level) => {
    const b = createBoard();
    place(b, 'X', [[3, 7], [4, 7], [5, 7], [6, 7]]);
    place(b, 'O', [[2, 7], [3, 8], [4, 8], [5, 8]]);
    expect(chooseMove(b, 'X', level)).toEqual({ x: 7, y: 7 });
  });

  it.each(LEVELS)('%s blocks the opponent four', (level) => {
    const b = createBoard();
    place(b, 'O', [[3, 7], [4, 7], [5, 7], [6, 7]]);
    place(b, 'X', [[2, 7], [10, 10], [11, 11]]);
    expect(chooseMove(b, 'X', level)).toEqual({ x: 7, y: 7 });
  });

  it.each(LEVELS)('%s prefers winning over blocking', (level) => {
    const b = createBoard();
    place(b, 'O', [[3, 2], [4, 2], [5, 2], [6, 2]]);
    place(b, 'X', [[3, 9], [4, 9], [5, 9], [6, 9], [2, 2]]);
    const move = chooseMove(b, 'X', level);
    expect([{ x: 2, y: 9 }, { x: 7, y: 9 }]).toContainEqual(move);
  });

  it.each(LEVELS)('%s answers an open three', (level) => {
    const b = createBoard();
    place(b, 'O', [[5, 7], [6, 7], [7, 7]]);
    place(b, 'X', [[6, 8], [7, 6]]);
    const move = chooseMove(b, 'X', level, { random: seeded(1) });
    expect([{ x: 4, y: 7 }, { x: 8, y: 7 }, { x: 3, y: 7 }, { x: 9, y: 7 }]).toContainEqual(move);
  });

  it('always returns an empty cell', () => {
    const random = seeded(7);
    for (const level of LEVELS) {
      const b = createBoard();
      let mark: Mark = 'X';
      for (let i = 0; i < 30; i++) {
        const move = chooseMove(b, mark, level, { random, timeMs: 50 })!;
        expect(b[move.y][move.x]).toBeNull();
        b[move.y][move.x] = mark;
        if (findWinLine(b, move.x, move.y)) break;
        mark = otherMark(mark);
      }
    }
  });

  it('returns null on a full board', () => {
    const b = createBoard(3);
    for (const row of b) row.fill('X');
    expect(chooseMove(b, 'O', 'hard')).toBeNull();
  });

  it.each([
    ['medium', 1200],
    ['hard', 3000],
  ] as const)('%s stays within its %i ms budget', (level, budget) => {
    const b = createBoard();
    place(b, 'X', [[7, 7], [8, 8], [6, 8], [9, 6]]);
    place(b, 'O', [[8, 7], [7, 8], [6, 6], [9, 9]]);
    const started = performance.now();
    chooseMove(b, 'X', level);
    expect(performance.now() - started).toBeLessThan(budget + 500);
  });

  it('hard finds a win by continuous fours and converts it', () => {
    const b = vcfPosition();
    let info: AiSearchInfo | undefined;
    const first = chooseMove(b, 'X', 'hard', { onInfo: (i) => (info = i) })!;
    expect(info!.score).toBeGreaterThan(1e8);
    b[first.y][first.x] = 'X';
    // O defends with medium; X must finish within its next 3 moves.
    expect(playOut(b, 'O', { X: 'hard', O: 'medium' }, 6)).toBe('X');
  });

  it('hard defends against the opponent continuous-four win', () => {
    const b = vcfPosition(); // O to move (one O stone fewer)
    const block = chooseMove(b, 'O', 'hard')!;
    b[block.y][block.x] = 'O';
    expect(playOut(b, 'X', { X: 'hard', O: 'hard' }, 8, 500)).not.toBe('X');
  });

  it('optimised search returns the same score as plain alpha-beta', () => {
    const random = seeded(42);
    for (let game = 0; game < 6; game++) {
      const b = createBoard();
      let mark: Mark = 'X';
      for (let i = 0; i < 10 + game * 2; i++) {
        const m = chooseMove(b, mark, 'easy', { random })!;
        b[m.y][m.x] = mark;
        if (findWinLine(b, m.x, m.y)) {
          b[m.y][m.x] = null;
          break;
        }
        mark = otherMark(mark);
      }
      const toMove: Mark = b.flat().filter(Boolean).length % 2 ? 'O' : 'X';
      for (const depth of [2, 4]) {
        const scores: number[] = [];
        for (const plain of [true, false]) {
          chooseMove(b, toMove, 'medium', { depth, plain, random: () => 0, onInfo: (i) => scores.push(i.score) });
        }
        expect(scores[1]).toBe(scores[0]);
      }
    }
  });

  it('hard searches deeper than medium', () => {
    const b = createBoard();
    place(b, 'X', [[7, 7], [8, 6]]);
    place(b, 'O', [[8, 7], [6, 8]]);
    const depth: Partial<Record<AiLevel, number>> = {};
    for (const level of ['medium', 'hard'] as const) chooseMove(b, 'X', level, { onInfo: (i) => (depth[level] = i.depth) });
    expect(depth.medium).toBe(6);
    expect(depth.hard).toBeGreaterThan(6);
  });

  it('hard beats easy', { timeout: 120_000 }, () => {
    let hardWins = 0;
    for (let game = 0; game < 3; game++) {
      const hardMark: Mark = game % 2 === 0 ? 'X' : 'O';
      const b = createBoard();
      place(b, 'X', [[7, 7]]);
      place(b, 'O', [[8, 6 + game]]);
      const levels = { [hardMark]: 'hard', [otherMark(hardMark)]: 'easy' } as Record<Mark, AiLevel>;
      if (playOut(b, 'X', levels, 200, 500) === hardMark) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(2);
  });
});
