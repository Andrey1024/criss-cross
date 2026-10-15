import type { Board, Mark, Point } from './game';

export type AiLevel = 'easy' | 'medium' | 'hard';
export const AI_LEVELS: readonly AiLevel[] = ['easy', 'medium', 'hard'];

export interface AiSearchInfo {
  /** Deepest fully completed search iteration. */
  depth: number;
  nodes: number;
  ms: number;
  /** Score of the chosen move for the computer (large positive = forced win). */
  score: number;
}

export interface AiOptions {
  /** Overrides the level's thinking-time budget, in ms. */
  timeMs?: number;
  /** Random source in [0, 1); injectable so tests are deterministic. */
  random?: () => number;
  /** Receives search statistics after the move is chosen. */
  onInfo?: (info: AiSearchInfo) => void;
  /** Testing: search exactly this depth, with no time limit and no VCF. */
  depth?: number;
  /** Testing: plain alpha-beta, without transposition table, PVS, killers or history. */
  plain?: boolean;
}

interface LevelConfig {
  maxDepth: number;
  timeMs: number;
  /** Use the "victory by continuous fours" threat search. */
  vcf: boolean;
}

const LEVELS: Record<AiLevel, LevelConfig> = {
  easy: { maxDepth: 2, timeMs: 300, vcf: false },
  medium: { maxDepth: 6, timeMs: 1200, vcf: false },
  hard: { maxDepth: 16, timeMs: 3000, vcf: true },
};

/**
 * Value of a 5-cell window holding n marks of one player and none of the other. Open shapes
 * fit in more windows than blocked ones, so this rewards e.g. an open three over a closed one.
 */
const VAL = [0, 1, 10, 100, 1000, 100_000];
const WIN = 1_000_000_000;
/** Scores beyond this are forced wins/losses (WIN minus distance in plies). */
const WIN_THRESHOLD = WIN - 10_000;
const INF = 2_000_000_000;
const MAX_PLY = 96;
/** Moves searched per node: wider near the root. */
const BREADTH_NEAR = 12;
const BREADTH_DEEP = 10;
const KILLER_BONUS = 2_000;
/** Own four-moves in a row the VCF search may chain. */
const VCF_ROOT_DEPTH = 10;
const VCF_DEFENSE_DEPTH = 8;
/** Iterative deepening stops starting new iterations after this share of the budget. */
const NEXT_ITERATION_LIMIT = 0.45;
const TT_BITS = 19;
const TT_MASK = (1 << TT_BITS) - 1;
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;
const TIMEOUT = Symbol('timeout');
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Picks the computer's move with negamax + alpha-beta, using principal variation search, a
 * transposition table, killer/history move ordering and iterative deepening under a time
 * budget. Hard also runs a VCF (continuous fours) search to find and refute forced wins.
 * Returns null on a full board.
 */
export function chooseMove(board: Board, mark: Mark, level: AiLevel, opts: AiOptions = {}): Point | null {
  const size = board.length;
  const side = mark === 'X' ? 1 : 2;
  const random = opts.random ?? Math.random;
  const cfg = LEVELS[level];
  const fixedDepth = opts.depth;
  const useVcf = cfg.vcf && fixedDepth === undefined;
  const budget = opts.timeMs ?? cfg.timeMs;
  const start = now();

  if (board.every((row) => row.every((c) => c === null))) {
    const c = Math.floor(size / 2);
    return { x: c, y: c };
  }

  const e = engineFor(size);
  e.load(board);
  e.reset(opts.plain ?? false);
  const done = (cell: number, depth: number, score: number) => {
    opts.onInfo?.({ depth, nodes: e.nodes, ms: now() - start, score });
    return e.point(cell);
  };

  const n = e.genMoves(side, 0);
  if (e.genFive >= 0) return done(e.genFive, 0, WIN); // win now
  if (n === 0) return null; // board full
  if (e.genBlocks > 0) {
    // The opponent threatens five: block it.
    e.selectMoves(0, n, -1);
    return done(e.moves[0][0], 0, 0);
  }

  let best = -1;
  let bestScore = 0;
  let depthDone = 0;
  let rootList: RootMove[] = [];

  if (useVcf) {
    e.deadline = start + budget * 0.25;
    try {
      const win = e.vcf(side, VCF_ROOT_DEPTH);
      if (win >= 0) return done(win, 0, WIN);
    } catch (err) {
      if (err !== TIMEOUT) throw err;
      e.load(board);
    }
  }

  const deadline = start + budget;
  const maxDepth = fixedDepth ?? cfg.maxDepth;
  for (let depth = 1; depth <= maxDepth; depth++) {
    // Depth 1 always completes, so there is always a searched move.
    e.deadline = depth === 1 || fixedDepth !== undefined ? Infinity : deadline;
    try {
      const result = e.searchRoot(side, depth, random, useVcf);
      best = result.move;
      bestScore = result.score;
      rootList = result.list;
      depthDone = depth;
    } catch (err) {
      if (err !== TIMEOUT) throw err;
      e.load(board);
      break;
    }
    if (Math.abs(bestScore) >= WIN_THRESHOLD) break; // forced result found
    if (fixedDepth === undefined && now() - start > budget * NEXT_ITERATION_LIMIT) break;
  }

  if (useVcf && bestScore < WIN_THRESHOLD) {
    e.deadline = Math.max(deadline, now() + 300);
    best = e.avoidOpponentVcf(side, best, rootList, board);
  }

  return done(best, depthDone, bestScore);
}

interface RootMove {
  move: number;
  score: number;
}

/** Precomputed board geometry, shared by all searches on boards of one size. */
interface Geometry {
  size: number;
  cells: number;
  windows: number;
  /** 5 cell indices per window. */
  winCells: Int16Array;
  /** Windows through each cell: cellWin[cellWinStart[c] .. cellWinStart[c+1]). */
  cellWinStart: Int32Array;
  cellWin: Int32Array;
  /** Cells within distance 2 of each cell. */
  nbStart: Int32Array;
  nb: Int16Array;
  /** Zobrist keys, index (mark - 1) * cells + cell; two halves give a 64-bit hash. */
  zLo: Int32Array;
  zHi: Int32Array;
}

function buildGeometry(size: number): Geometry {
  const cells = size * size;
  const win: number[] = [];
  for (const [dx, dy] of DIRS) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const ex = x + 4 * dx;
        const ey = y + 4 * dy;
        if (ex < 0 || ey < 0 || ex >= size || ey >= size) continue;
        for (let i = 0; i < 5; i++) win.push((y + i * dy) * size + x + i * dx);
      }
    }
  }
  const windows = win.length / 5;
  const cellWinStart = new Int32Array(cells + 1);
  for (const c of win) cellWinStart[c + 1]++;
  for (let c = 0; c < cells; c++) cellWinStart[c + 1] += cellWinStart[c];
  const cellWin = new Int32Array(cellWinStart[cells]);
  const fill = cellWinStart.slice(0, cells);
  for (let w = 0; w < windows; w++) for (let i = 0; i < 5; i++) cellWin[fill[win[w * 5 + i]]++] = w;

  const nbList: number[] = [];
  const nbStart = new Int32Array(cells + 1);
  for (let c = 0; c < cells; c++) {
    const x = c % size;
    const y = (c - x) / size;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < size && ny < size) nbList.push(ny * size + nx);
      }
    }
    nbStart[c + 1] = nbList.length;
  }

  let seed = 0x9e3779b9 ^ size;
  const rand32 = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) | 0;
  };
  const zLo = new Int32Array(2 * cells).map(rand32);
  const zHi = new Int32Array(2 * cells).map(rand32);

  return { size, cells, windows, winCells: Int16Array.from(win), cellWinStart, cellWin, nbStart, nb: Int16Array.from(nbList), zLo, zHi };
}

const engines = new Map<number, Engine>();
function engineFor(size: number): Engine {
  let e = engines.get(size);
  if (!e) engines.set(size, (e = new Engine(buildGeometry(size))));
  return e;
}

/** Window value from X's point of view. */
function windowValue(nx: number, no: number): number {
  if (nx && no) return 0;
  return nx ? VAL[nx] : -VAL[no];
}

const toTT = (s: number, ply: number) => (s >= WIN_THRESHOLD ? s + ply : s <= -WIN_THRESHOLD ? s - ply : s);
const fromTT = (s: number, ply: number) => (s >= WIN_THRESHOLD ? s - ply : s <= -WIN_THRESHOLD ? s + ply : s);

/**
 * Mutable search state. Cells are flat indices; marks are 1 (X) and 2 (O). Every 5-cell window
 * keeps a count of X and O marks, so evaluating or playing a move touches ~20 counters.
 */
class Engine {
  readonly board: Int8Array;
  readonly cntX: Uint8Array;
  readonly cntO: Uint8Array;
  /** Number of marks within distance 2; candidate moves are empty cells with near > 0. */
  readonly near: Uint8Array;
  /** Sum of all window values, X-positive. */
  score = 0;
  hashLo = 0;
  hashHi = 0;

  deadline = Infinity;
  nodes = 0;
  plain = false;
  readonly killers = new Int16Array(MAX_PLY * 2);
  readonly history: Int32Array;

  // Transposition table (fixed size, replace-always; `gen` invalidates old entries per call).
  readonly ttLo = new Int32Array(1 << TT_BITS);
  readonly ttHi = new Int32Array(1 << TT_BITS);
  readonly ttGen = new Uint16Array(1 << TT_BITS);
  readonly ttDepth = new Int8Array(1 << TT_BITS);
  readonly ttFlag = new Int8Array(1 << TT_BITS);
  readonly ttScore = new Int32Array(1 << TT_BITS);
  readonly ttMove = new Int16Array(1 << TT_BITS);
  gen = 0;

  /** Per-ply move buffers, so the search allocates nothing. */
  readonly moves: Int16Array[] = [];
  readonly gains: Float64Array[] = [];
  readonly keys: Float64Array[] = [];
  /** Results of the last genMoves call. */
  genFive = -1;
  genBlocks = 0;
  /** Results of the last evalCell call. */
  private eDelta = 0;
  private eFive = false;
  private eBlock = false;
  private readonly stamp: Uint32Array;
  private stampGen = 0;
  private readonly tmpA = new Int16Array(2);
  private readonly tmpB = new Int16Array(2);
  private readonly fourBufs: Int16Array[] = [];

  constructor(readonly g: Geometry) {
    this.board = new Int8Array(g.cells);
    this.cntX = new Uint8Array(g.windows);
    this.cntO = new Uint8Array(g.windows);
    this.near = new Uint8Array(g.cells);
    this.history = new Int32Array(g.cells);
    this.stamp = new Uint32Array(g.cells);
    for (let p = 0; p < MAX_PLY; p++) {
      this.moves.push(new Int16Array(g.cells));
      this.gains.push(new Float64Array(g.cells));
      this.keys.push(new Float64Array(g.cells));
      this.fourBufs.push(new Int16Array(g.cells));
    }
  }

  load(board: Board) {
    this.board.fill(0);
    this.cntX.fill(0);
    this.cntO.fill(0);
    this.near.fill(0);
    this.score = 0;
    this.hashLo = 0;
    this.hashHi = 0;
    const { size } = this.g;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const m = board[y][x];
        if (m) this.play(y * size + x, m === 'X' ? 1 : 2);
      }
    }
  }

  reset(plain: boolean) {
    this.plain = plain;
    this.nodes = 0;
    this.killers.fill(-1);
    this.history.fill(0);
    this.gen = (this.gen + 1) & 0xffff || 1;
  }

  point(c: number): Point {
    return { x: c % this.g.size, y: Math.floor(c / this.g.size) };
  }

  play(c: number, side: number) {
    const { cellWinStart, cellWin, nbStart, nb, zLo, zHi, cells } = this.g;
    const { cntX, cntO } = this;
    let d = 0;
    for (let i = cellWinStart[c]; i < cellWinStart[c + 1]; i++) {
      const w = cellWin[i];
      const before = windowValue(cntX[w], cntO[w]);
      if (side === 1) cntX[w]++;
      else cntO[w]++;
      d += windowValue(cntX[w], cntO[w]) - before;
    }
    this.score += d;
    this.board[c] = side;
    const z = (side - 1) * cells + c;
    this.hashLo ^= zLo[z];
    this.hashHi ^= zHi[z];
    for (let i = nbStart[c]; i < nbStart[c + 1]; i++) this.near[nb[i]]++;
  }

  undo(c: number, side: number) {
    const { cellWinStart, cellWin, nbStart, nb, zLo, zHi, cells } = this.g;
    const { cntX, cntO } = this;
    let d = 0;
    for (let i = cellWinStart[c]; i < cellWinStart[c + 1]; i++) {
      const w = cellWin[i];
      const before = windowValue(cntX[w], cntO[w]);
      if (side === 1) cntX[w]--;
      else cntO[w]--;
      d += windowValue(cntX[w], cntO[w]) - before;
    }
    this.score += d;
    this.board[c] = 0;
    const z = (side - 1) * cells + c;
    this.hashLo ^= zLo[z];
    this.hashHi ^= zHi[z];
    for (let i = nbStart[c]; i < nbStart[c + 1]; i++) this.near[nb[i]]--;
  }

  /** Effect of `side` playing the empty cell c: score delta (X-positive) and five/block flags. */
  private evalCell(c: number, side: number) {
    const { cellWinStart, cellWin } = this.g;
    const { cntX, cntO } = this;
    let d = 0;
    let five = false;
    let block = false;
    if (side === 1) {
      for (let i = cellWinStart[c]; i < cellWinStart[c + 1]; i++) {
        const w = cellWin[i];
        const nx = cntX[w];
        const no = cntO[w];
        if (no === 0) {
          d += VAL[nx + 1] - VAL[nx];
          if (nx === 4) five = true;
        } else if (nx === 0) {
          d += VAL[no];
          if (no === 4) block = true;
        }
      }
    } else {
      for (let i = cellWinStart[c]; i < cellWinStart[c + 1]; i++) {
        const w = cellWin[i];
        const nx = cntX[w];
        const no = cntO[w];
        if (nx === 0) {
          d -= VAL[no + 1] - VAL[no];
          if (no === 4) five = true;
        } else if (no === 0) {
          d -= VAL[nx];
          if (nx === 4) block = true;
        }
      }
    }
    this.eDelta = d;
    this.eFive = five;
    this.eBlock = block;
  }

  /**
   * Fills moves[ply]/gains[ply] with candidate cells for `side`. Stops early and sets genFive if
   * a move makes five; counts cells that block an opponent five in genBlocks.
   */
  genMoves(side: number, ply: number, random?: () => number): number {
    const moves = this.moves[ply];
    const gains = this.gains[ply];
    const { board, near } = this;
    const sign = side === 1 ? 1 : -1;
    let n = 0;
    let blocks = 0;
    this.genFive = -1;
    for (let c = 0; c < this.g.cells; c++) {
      if (board[c] !== 0 || near[c] === 0) continue;
      this.evalCell(c, side);
      if (this.eFive) {
        this.genFive = c;
        break;
      }
      let gain = sign * this.eDelta;
      if (this.eBlock) {
        gain += WIN / 2;
        blocks++;
      }
      if (random) gain += random() * 0.5;
      moves[n] = c;
      gains[n] = gain;
      n++;
    }
    this.genBlocks = blocks;
    return n;
  }

  /**
   * Keeps the moves worth searching at the front of moves[ply] and returns how many. The set is
   * chosen by static gain only, so every search variant explores the same tree; the TT move,
   * killers and history only change the order within it.
   */
  selectMoves(ply: number, n: number, ttMove: number): number {
    const moves = this.moves[ply];
    const gains = this.gains[ply];
    const k = this.genBlocks > 0 ? this.genBlocks : Math.min(n, ply < 4 ? BREADTH_NEAR : BREADTH_DEEP);
    for (let i = 0; i < k; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) if (gains[j] > gains[m]) m = j;
      if (m !== i) {
        const tm = moves[i];
        moves[i] = moves[m];
        moves[m] = tm;
        const tg = gains[i];
        gains[i] = gains[m];
        gains[m] = tg;
      }
    }
    if (this.plain || k < 2) return k;

    const keys = this.keys[ply];
    const k1 = this.killers[ply * 2];
    const k2 = this.killers[ply * 2 + 1];
    for (let i = 0; i < k; i++) {
      const c = moves[i];
      keys[i] = gains[i] + this.history[c] + (c === k1 || c === k2 ? KILLER_BONUS : 0) + (c === ttMove ? INF : 0);
    }
    // Insertion sort of the (at most 12) selected moves by key.
    for (let i = 1; i < k; i++) {
      const c = moves[i];
      const key = keys[i];
      let j = i - 1;
      while (j >= 0 && keys[j] < key) {
        moves[j + 1] = moves[j];
        keys[j + 1] = keys[j];
        j--;
      }
      moves[j + 1] = c;
      keys[j + 1] = key;
    }
    return k;
  }

  searchRoot(side: number, depth: number, random: () => number, vcfLeaves: boolean): { move: number; score: number; list: RootMove[] } {
    const n = this.genMoves(side, 0, random);
    const ttMove = this.probeMove();
    const k = this.selectMoves(0, n, ttMove);
    const moves = this.moves[0];
    const list: RootMove[] = [];
    let alpha = -INF;
    let best = moves[0];
    for (let i = 0; i < k; i++) {
      const c = moves[i];
      this.play(c, side);
      let v: number;
      if (i === 0 || this.plain) v = -this.search(3 - side, depth - 1, -INF, -alpha, 1, vcfLeaves);
      else {
        v = -this.search(3 - side, depth - 1, -alpha - 1, -alpha, 1, vcfLeaves);
        if (v > alpha) v = -this.search(3 - side, depth - 1, -INF, -alpha, 1, vcfLeaves);
      }
      this.undo(c, side);
      list.push({ move: c, score: v });
      if (v > alpha) {
        alpha = v;
        best = c;
      }
    }
    this.store(depth, alpha, EXACT, best, 0);
    return { move: best, score: alpha, list };
  }

  /** Negamax with alpha-beta and PVS: the value of the position for `side`, who is to move. */
  private search(side: number, depth: number, alpha: number, beta: number, ply: number, vcfLeaves: boolean): number {
    if ((++this.nodes & 1023) === 0 && now() > this.deadline) throw TIMEOUT;

    let ttMove = -1;
    if (!this.plain && depth > 0) {
      const i = this.hashLo & TT_MASK;
      if (this.ttGen[i] === this.gen && this.ttLo[i] === this.hashLo && this.ttHi[i] === this.hashHi) {
        ttMove = this.ttMove[i];
        if (this.ttDepth[i] >= depth) {
          const s = fromTT(this.ttScore[i], ply);
          const flag = this.ttFlag[i];
          if (flag === EXACT || (flag === LOWER && s >= beta) || (flag === UPPER && s <= alpha)) return s;
        }
      }
    }

    const n = this.genMoves(side, ply);
    if (this.genFive >= 0) return WIN - ply; // prefer faster wins
    if (n === 0) return 0; // board full: draw
    if (depth <= 0 || ply >= MAX_PLY - 1) {
      // The opponent can make five in two different places; only one can be blocked.
      if (this.genBlocks >= 2) return -(WIN - ply - 1);
      if (vcfLeaves && this.genBlocks === 0 && this.vcf(side, 3) >= 0) return WIN - ply - 20;
      return side === 1 ? this.score : -this.score;
    }

    const k = this.selectMoves(ply, n, ttMove);
    const moves = this.moves[ply];
    const alphaOrig = alpha;
    let best = -INF;
    let bestMove = moves[0];
    for (let i = 0; i < k; i++) {
      const c = moves[i];
      this.play(c, side);
      let v: number;
      if (i === 0 || this.plain) v = -this.search(3 - side, depth - 1, -beta, -alpha, ply + 1, vcfLeaves);
      else {
        // Null-window probe; re-search only if this move might beat the current best.
        v = -this.search(3 - side, depth - 1, -alpha - 1, -alpha, ply + 1, vcfLeaves);
        if (v > alpha && v < beta) v = -this.search(3 - side, depth - 1, -beta, -alpha, ply + 1, vcfLeaves);
      }
      this.undo(c, side);
      if (v > best) {
        best = v;
        bestMove = c;
      }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!this.plain) {
          const ki = ply * 2;
          if (this.killers[ki] !== c) {
            this.killers[ki + 1] = this.killers[ki];
            this.killers[ki] = c;
          }
          this.history[c] += depth * depth;
        }
        break;
      }
    }
    if (!this.plain) this.store(depth, best, best <= alphaOrig ? UPPER : best >= beta ? LOWER : EXACT, bestMove, ply);
    return best;
  }

  private probeMove(): number {
    if (this.plain) return -1;
    const i = this.hashLo & TT_MASK;
    return this.ttGen[i] === this.gen && this.ttLo[i] === this.hashLo && this.ttHi[i] === this.hashHi ? this.ttMove[i] : -1;
  }

  private store(depth: number, score: number, flag: number, move: number, ply: number) {
    if (this.plain) return;
    const i = this.hashLo & TT_MASK;
    this.ttGen[i] = this.gen;
    this.ttLo[i] = this.hashLo;
    this.ttHi[i] = this.hashHi;
    this.ttDepth[i] = depth;
    this.ttFlag[i] = flag;
    this.ttScore[i] = toTT(score, ply);
    this.ttMove[i] = move;
  }

  /** Writes up to 2 distinct cells where `side` would complete five into out; returns the count. */
  private fiveCells(side: number, out: Int16Array): number {
    const { windows, winCells } = this.g;
    const own = side === 1 ? this.cntX : this.cntO;
    const opp = side === 1 ? this.cntO : this.cntX;
    let n = 0;
    for (let w = 0; w < windows; w++) {
      if (own[w] !== 4 || opp[w] !== 0) continue;
      for (let i = 0; i < 5; i++) {
        const c = winCells[w * 5 + i];
        if (this.board[c] === 0) {
          if (n === 0 || out[0] !== c) out[n++] = c;
          break;
        }
      }
      if (n === 2) break;
    }
    return n;
  }

  /** Cells where `side` makes a four (a window with 3 own marks and no opponent marks). */
  private fourMoves(side: number, out: Int16Array): number {
    const { windows, winCells } = this.g;
    const own = side === 1 ? this.cntX : this.cntO;
    const opp = side === 1 ? this.cntO : this.cntX;
    const mark = ++this.stampGen;
    let n = 0;
    for (let w = 0; w < windows; w++) {
      if (own[w] !== 3 || opp[w] !== 0) continue;
      for (let i = 0; i < 5; i++) {
        const c = winCells[w * 5 + i];
        if (this.board[c] === 0 && this.stamp[c] !== mark) {
          this.stamp[c] = mark;
          out[n++] = c;
        }
      }
    }
    return n;
  }

  /**
   * VCF: can `side` (to move) force five using only moves that make a four, each leaving the
   * opponent a single forced reply? Returns the first move of such a win, or -1.
   */
  vcf(side: number, depth: number, level = 0): number {
    if ((++this.nodes & 1023) === 0 && now() > this.deadline) throw TIMEOUT;
    const opp = 3 - side;
    if (this.fiveCells(side, this.tmpA) > 0) return this.tmpA[0];
    const oppThreats = this.fiveCells(opp, this.tmpB);
    if (oppThreats >= 2 || depth === 0) return -1;
    const mustBlock = oppThreats === 1 ? this.tmpB[0] : -1;

    const buf = this.fourBufs[level];
    const n = this.fourMoves(side, buf);
    for (let i = 0; i < n; i++) {
      const c = buf[i];
      if (mustBlock >= 0 && c !== mustBlock) continue;
      this.play(c, side);
      let win = false;
      const threats = this.fiveCells(side, this.tmpA);
      if (threats >= 2) win = true; // two ways to make five: unstoppable
      else if (threats === 1) {
        const reply = this.tmpA[0];
        this.play(reply, opp);
        win = this.vcf(side, depth - 1, level + 1) >= 0;
        this.undo(reply, opp);
      }
      this.undo(c, side);
      if (win) return c;
    }
    return -1;
  }

  /**
   * Among the best root moves, picks the first that leaves the opponent no VCF. Falls back to
   * `best` if every candidate loses or time runs out.
   */
  avoidOpponentVcf(side: number, best: number, list: RootMove[], board: Board): number {
    const candidates = [best, ...list.filter((m) => m.move !== best).sort((a, b) => b.score - a.score).map((m) => m.move)].slice(0, 6);
    try {
      for (const c of candidates) {
        this.play(c, side);
        const refuted = this.vcf(3 - side, VCF_DEFENSE_DEPTH) >= 0;
        this.undo(c, side);
        if (!refuted) return c;
      }
    } catch (err) {
      if (err !== TIMEOUT) throw err;
      this.load(board);
    }
    return best;
  }
}
