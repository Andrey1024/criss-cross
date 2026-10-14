import { describe, expect, it } from 'vitest';
import { boardFromMoves, createBoard, findWinLine, isBoardFull, type Board, type Mark } from './game';

function place(board: Board, mark: Mark, cells: Array<[number, number]>) {
  for (const [x, y] of cells) board[y][x] = mark;
}

describe('findWinLine', () => {
  it('detects a horizontal five', () => {
    const b = createBoard();
    place(b, 'X', [[3, 7], [4, 7], [5, 7], [6, 7], [7, 7]]);
    expect(findWinLine(b, 5, 7)).toEqual([
      { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 },
    ]);
  });

  it('detects a vertical five', () => {
    const b = createBoard();
    place(b, 'O', [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
    expect(findWinLine(b, 2, 4)).toHaveLength(5);
  });

  it('detects a down-right diagonal', () => {
    const b = createBoard();
    place(b, 'X', [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(findWinLine(b, 0, 0)).toHaveLength(5);
  });

  it('detects an up-right diagonal', () => {
    const b = createBoard();
    place(b, 'X', [[10, 14], [11, 13], [12, 12], [13, 11], [14, 10]]);
    expect(findWinLine(b, 12, 12)).toEqual([
      { x: 10, y: 14 }, { x: 11, y: 13 }, { x: 12, y: 12 }, { x: 13, y: 11 }, { x: 14, y: 10 },
    ]);
  });

  it('handles lines touching the board edge', () => {
    const b = createBoard();
    place(b, 'O', [[10, 14], [11, 14], [12, 14], [13, 14], [14, 14]]);
    expect(findWinLine(b, 14, 14)).toHaveLength(5);
  });

  it('counts an overline (six) as a win', () => {
    const b = createBoard();
    place(b, 'X', [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]);
    expect(findWinLine(b, 2, 5)).toHaveLength(6);
  });

  it('returns null for four in a row', () => {
    const b = createBoard();
    place(b, 'X', [[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(findWinLine(b, 3, 0)).toBeNull();
  });

  it('is not fooled by an opponent mark in the middle', () => {
    const b = createBoard();
    place(b, 'X', [[0, 0], [1, 0], [3, 0], [4, 0], [5, 0]]);
    place(b, 'O', [[2, 0]]);
    expect(findWinLine(b, 4, 0)).toBeNull();
  });

  it('returns null for an empty cell', () => {
    expect(findWinLine(createBoard(), 7, 7)).toBeNull();
  });
});

describe('isBoardFull / boardFromMoves', () => {
  it('detects a full board', () => {
    const b = createBoard(3);
    expect(isBoardFull(b)).toBe(false);
    for (const row of b) row.fill('X');
    expect(isBoardFull(b)).toBe(true);
  });

  it('rebuilds a board from moves', () => {
    const b = boardFromMoves([{ x: 1, y: 2, mark: 'X' }, { x: 0, y: 0, mark: 'O' }], 3);
    expect(b).toEqual([
      ['O', null, null],
      [null, null, null],
      [null, 'X', null],
    ]);
  });
});
