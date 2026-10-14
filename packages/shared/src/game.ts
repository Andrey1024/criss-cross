export type Mark = 'X' | 'O';
export type Cell = Mark | null;
/** Rows of cells: `board[y][x]`. */
export type Board = Cell[][];

export interface Point {
  x: number;
  y: number;
}

export interface PlayedMove extends Point {
  mark: Mark;
}

export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export function createBoard(size = BOARD_SIZE): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function otherMark(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

export function isInside(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < board[y].length;
}

const DIRECTIONS: ReadonlyArray<Point> = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
];

/**
 * Returns the winning line passing through (x, y) — five or more equal marks in a row —
 * or null. Only lines through the last move need checking, so this is O(1) per move.
 */
export function findWinLine(board: Board, x: number, y: number, winLength = WIN_LENGTH): Point[] | null {
  const mark = board[y]?.[x];
  if (!mark) return null;

  for (const dir of DIRECTIONS) {
    const line: Point[] = [{ x, y }];
    for (const sign of [1, -1]) {
      let cx = x + dir.x * sign;
      let cy = y + dir.y * sign;
      while (isInside(board, cx, cy) && board[cy][cx] === mark) {
        if (sign === 1) line.push({ x: cx, y: cy });
        else line.unshift({ x: cx, y: cy });
        cx += dir.x * sign;
        cy += dir.y * sign;
      }
    }
    if (line.length >= winLength) return line;
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

/** Rebuilds a board from a move list (used for replays). */
export function boardFromMoves(moves: PlayedMove[], size = BOARD_SIZE): Board {
  const board = createBoard(size);
  for (const m of moves) board[m.y][m.x] = m.mark;
  return board;
}
