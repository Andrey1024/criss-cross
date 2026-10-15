import { otherMark, type Board, type Mark, type Point } from './game';

export type AiLevel = 'easy' | 'medium' | 'hard';
export const AI_LEVELS: readonly AiLevel[] = ['easy', 'medium', 'hard'];

export interface AiOptions {
  /** Overrides the level's thinking-time budget, in ms. */
  timeMs?: number;
  /** Random source in [0, 1); injectable so tests are deterministic. */
  random?: () => number;
}

const SEARCH_LEVELS = {
  medium: { maxDepth: 2, timeMs: 300 },
  hard: { maxDepth: 6, timeMs: 1200 },
} as const;
/** How many of the best-ordered moves are searched at each node. */
const BREADTH = 12;
/** Easy picks randomly among this many top heuristic moves. */
const EASY_POOL = 5;
const WIN = 1e9;
/**
 * Value of a 5-cell window holding n marks of one player and none of the other. Open shapes
 * fit in more windows than blocked ones, so this rewards e.g. an open three over a closed one.
 */
const WINDOW_VALUE = [0, 1, 10, 100, 1000, 100_000];
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];
const TIMEOUT = Symbol('timeout');

interface Candidate extends Point {
  /** Change of the board score (X-positive) if the mover plays here. */
  delta: number;
  /** Playing here makes five for the mover. */
  five: boolean;
  /** The opponent would make five here, so this cell must be blocked. */
  blocksFive: boolean;
  /** Ordering key, higher is better for the mover. */
  gain: number;
}

interface State {
  board: Board;
  stones: Point[];
  /** Sum of all window values, positive when good for X. */
  score: number;
}

interface SearchContext {
  deadline: number;
  nodes: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Picks the computer's move: minimax (negamax with alpha-beta pruning) over candidate cells
 * near existing marks, with iterative deepening under a time budget. Returns null on a full board.
 */
export function chooseMove(board: Board, mark: Mark, level: AiLevel, opts: AiOptions = {}): Point | null {
  const random = opts.random ?? Math.random;
  const size = board.length;
  const state: State = { board: board.map((row) => [...row]), stones: [], score: 0 };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (board[y][x]) state.stones.push({ x, y });
  if (state.stones.length === 0) {
    const c = Math.floor(size / 2);
    return { x: c, y: c };
  }
  state.score = evaluateBoard(state.board);

  const moves = orderMoves(state, mark, random);
  if (moves.length === 0) return null;
  // Winning now, or blocking the opponent's five, needs no search.
  if (moves[0].five || moves[0].blocksFive) return toPoint(moves[0]);

  if (level === 'easy') {
    const pool = moves.slice(0, EASY_POOL);
    return toPoint(pool[Math.floor(random() * pool.length)]);
  }

  const { maxDepth, timeMs } = SEARCH_LEVELS[level];
  const deadline = now() + (opts.timeMs ?? timeMs);
  let best: Point = moves[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      // Depth 1 always completes, so there is always a searched move.
      const ctx: SearchContext = { deadline: depth === 1 ? Infinity : deadline, nodes: 0 };
      const result = searchRoot(state, mark, depth, ctx, best, random);
      best = result.move;
      if (result.score >= WIN - 100) break; // found a forced win
    } catch (err) {
      if (err === TIMEOUT) break;
      throw err;
    }
    if (now() > deadline) break;
  }
  return toPoint(best);
}

function searchRoot(base: State, side: Mark, depth: number, ctx: SearchContext, previousBest: Point, random: () => number) {
  // Work on a copy: a timeout can unwind the search with moves still on the board.
  const s: State = { board: base.board.map((row) => [...row]), stones: [...base.stones], score: base.score };
  const moves = orderMoves(s, side, random);
  const threats = moves.filter((m) => m.blocksFive);
  const list = threats.length ? threats : moves.slice(0, BREADTH);
  // Search the previous iteration's best move first for better pruning.
  const i = list.findIndex((m) => m.x === previousBest.x && m.y === previousBest.y);
  if (i > 0) list.unshift(...list.splice(i, 1));

  let alpha = -Infinity;
  let best = list[0];
  let bestScore = -Infinity;
  for (const m of list) {
    play(s, m, side);
    const v = -search(s, otherMark(side), depth - 1, -Infinity, -alpha, 1, ctx);
    undo(s, m);
    if (v > bestScore) {
      bestScore = v;
      best = m;
    }
    if (v > alpha) alpha = v;
  }
  return { move: best, score: bestScore };
}

/** Negamax: the value of the position for `side`, who is to move. */
function search(s: State, side: Mark, depth: number, alpha: number, beta: number, ply: number, ctx: SearchContext): number {
  if (++ctx.nodes % 256 === 0 && now() > ctx.deadline) throw TIMEOUT;

  const moves = orderMoves(s, side);
  if (moves.length === 0) return 0; // board full: draw
  if (moves[0].five) return WIN - ply; // prefer faster wins
  const threats = moves.filter((m) => m.blocksFive);
  if (depth === 0) {
    // The opponent can make five in two different places; only one can be blocked.
    if (threats.length >= 2) return -(WIN - ply - 1);
    return side === 'X' ? s.score : -s.score;
  }

  // If the opponent threatens five, blocking is the only option.
  const list = threats.length ? threats : moves.slice(0, BREADTH);
  let best = -Infinity;
  for (const m of list) {
    play(s, m, side);
    const v = -search(s, otherMark(side), depth - 1, -beta, -alpha, ply + 1, ctx);
    undo(s, m);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function play(s: State, m: Candidate, mark: Mark) {
  s.board[m.y][m.x] = mark;
  s.stones.push(m);
  s.score += m.delta;
}

function undo(s: State, m: Candidate) {
  s.board[m.y][m.x] = null;
  s.stones.pop();
  s.score -= m.delta;
}

/** Empty cells within two cells of a mark, best first for `side`. */
function orderMoves(s: State, side: Mark, random?: () => number): Candidate[] {
  const { board } = s;
  const size = board.length;
  const sign = side === 'X' ? 1 : -1;
  const seen = new Uint8Array(size * size);
  const out: Candidate[] = [];
  for (const stone of s.stones) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = stone.x + dx;
        const y = stone.y + dy;
        if (x < 0 || y < 0 || x >= size || y >= size || board[y][x] || seen[y * size + x]) continue;
        seen[y * size + x] = 1;
        const e = cellEffect(board, x, y, side);
        const gain = sign * e.delta + (e.five ? WIN : 0) + (e.blocksFive ? WIN / 2 : 0) + (random ? random() * 0.5 : 0);
        out.push({ x, y, ...e, gain });
      }
    }
  }
  return out.sort((a, b) => b.gain - a.gain);
}

/** How placing `mark` on the empty cell (x, y) changes every 5-cell window through it. */
function cellEffect(board: Board, x: number, y: number, mark: Mark) {
  const size = board.length;
  let delta = 0;
  let five = false;
  let blocksFive = false;
  for (const [dx, dy] of DIRS) {
    for (let k = 0; k < 5; k++) {
      const sx = x - k * dx;
      const sy = y - k * dy;
      const ex = sx + 4 * dx;
      const ey = sy + 4 * dy;
      if (sx < 0 || sy < 0 || sx >= size || sy >= size || ex < 0 || ey < 0 || ex >= size || ey >= size) continue;
      let nx = 0;
      let no = 0;
      for (let i = 0; i < 5; i++) {
        const c = board[sy + i * dy][sx + i * dx];
        if (c === 'X') nx++;
        else if (c === 'O') no++;
      }
      const before = windowScore(nx, no);
      const after = mark === 'X' ? windowScore(nx + 1, no) : windowScore(nx, no + 1);
      delta += after - before;
      const own = mark === 'X' ? nx : no;
      const opp = mark === 'X' ? no : nx;
      if (own === 4 && opp === 0) five = true;
      if (opp === 4 && own === 0) blocksFive = true;
    }
  }
  return { delta, five, blocksFive };
}

function windowScore(nx: number, no: number): number {
  if (nx && no) return 0;
  return nx ? WINDOW_VALUE[nx] : -WINDOW_VALUE[no];
}

function evaluateBoard(board: Board): number {
  const size = board.length;
  let score = 0;
  for (const [dx, dy] of DIRS) {
    for (let sy = 0; sy < size; sy++) {
      for (let sx = 0; sx < size; sx++) {
        const ex = sx + 4 * dx;
        const ey = sy + 4 * dy;
        if (ex < 0 || ey < 0 || ex >= size || ey >= size) continue;
        let nx = 0;
        let no = 0;
        for (let i = 0; i < 5; i++) {
          const c = board[sy + i * dy][sx + i * dx];
          if (c === 'X') nx++;
          else if (c === 'O') no++;
        }
        score += windowScore(nx, no);
      }
    }
  }
  return score;
}

function toPoint(p: Point): Point {
  return { x: p.x, y: p.y };
}
