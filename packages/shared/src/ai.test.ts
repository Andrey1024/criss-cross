import { describe, expect, it } from 'vitest';
import { chooseMove, type AiLevel } from './ai';
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

  it.each(['medium', 'hard'] as const)('%s answers an open three', (level) => {
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

  it('hard stays within its time budget', () => {
    const b = createBoard();
    place(b, 'X', [[7, 7], [8, 8], [6, 8], [9, 6]]);
    place(b, 'O', [[8, 7], [7, 8], [6, 6], [9, 9]]);
    const started = performance.now();
    chooseMove(b, 'X', 'hard');
    expect(performance.now() - started).toBeLessThan(1200 + 400);
  });

  it('hard beats easy', { timeout: 60_000 }, () => {
    let hardWins = 0;
    for (let game = 0; game < 3; game++) {
      const random = seeded(100 + game);
      const b = createBoard();
      // Alternate who moves first.
      const hardMark: Mark = game % 2 === 0 ? 'X' : 'O';
      let mark: Mark = 'X';
      for (;;) {
        const level = mark === hardMark ? 'hard' : 'easy';
        const move = chooseMove(b, mark, level, { random, timeMs: 100 })!;
        b[move.y][move.x] = mark;
        if (findWinLine(b, move.x, move.y)) {
          if (mark === hardMark) hardWins++;
          break;
        }
        if (isBoardFull(b)) break;
        mark = otherMark(mark);
      }
    }
    expect(hardWins).toBeGreaterThanOrEqual(2);
  });
});
