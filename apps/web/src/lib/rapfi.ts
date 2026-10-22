import { useCallback, useEffect, useRef, useState } from 'react';
import { BOARD_SIZE, type Mark, type Point } from '@cc/shared';

/**
 * The Expert level runs Rapfi (https://github.com/dhbloo/rapfi, GPL-3.0), compiled to
 * WebAssembly by scripts/build-rapfi.sh. The folder name pins the engine version, so its files
 * can be cached for good. It talks the Gomocup (Piskvork) text protocol.
 */
export const RAPFI_DIR = '/engine/rapfi-3c94c2a/';
/** Thinking time per move. */
const TURN_MS = 4000;
const NO_LIMIT = 100_000_000;

// A minimal module using one SIMD instruction: it validates only where WebAssembly SIMD works.
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
]);

export type RapfiStatus =
  | { state: 'loading'; progress: number | null }
  | { state: 'ready' }
  | { state: 'error' };

export interface PlayedMove extends Point {
  mark: Mark;
}

interface Request {
  resolve: (move: Point) => void;
  reject: (err: Error) => void;
}

class Rapfi {
  /** Null when the browser can't run the engine. */
  private readonly worker: Worker | null;
  /** Replies come in request order; a cancelled request still takes its reply. */
  private readonly queue: Request[] = [];
  private failed: Error | null = null;
  readonly ready: Promise<void>;

  constructor(onStatus: (s: RapfiStatus) => void) {
    // Rapfi's networks need WebAssembly SIMD (every major browser since 2023). Without it, don't
    // download anything; the page offers Hard instead.
    if (typeof WebAssembly !== 'object' || !WebAssembly.validate(SIMD_PROBE)) {
      this.worker = null;
      this.failed = new Error('This browser does not support WebAssembly SIMD');
      this.ready = Promise.reject(this.failed);
      this.ready.catch(() => {});
      onStatus({ state: 'error' });
      return;
    }
    const worker = new Worker('/engine/rapfi-worker.js');
    this.worker = worker;
    onStatus({ state: 'loading', progress: null });
    this.ready = new Promise((resolve, reject) => {
      const fail = (message: string) => {
        this.failed = new Error(message);
        onStatus({ state: 'error' });
        reject(this.failed);
        for (const r of this.queue.splice(0)) r.reject(this.failed);
      };
      worker.onerror = (e) => fail(e.message || 'Engine worker failed');
      worker.onmessage = (e: MessageEvent<{ type: string; data?: string }>) => {
        const { type, data = '' } = e.data;
        if (type === 'status') {
          // Emscripten reports "Downloading data... (loaded/total)".
          const m = /\((\d+)\/(\d+)\)/.exec(data);
          if (m && +m[2] > 0) onStatus({ state: 'loading', progress: +m[1] / +m[2] });
        } else if (type === 'ready') {
          for (const cmd of [
            `START ${BOARD_SIZE}`,
            'INFO RULE 0', // freestyle: five or more in a row wins
            'INFO THREAD_NUM 1',
            'INFO SHOW_DETAIL 0',
            `INFO TIMEOUT_TURN ${TURN_MS}`,
            `INFO TIMEOUT_MATCH ${NO_LIMIT}`,
          ]) {
            this.send(cmd);
          }
          onStatus({ state: 'ready' });
          resolve();
        } else if (type === 'stdout') {
          this.onLine(data.trim());
        } else if (type === 'error') {
          fail(data);
        }
      };
    });
    this.ready.catch(() => {}); // reported through onStatus; think() rethrows it
    worker.postMessage({ type: 'init', dir: RAPFI_DIR, script: 'rapfi-single-simd128.js' });
  }

  /** The engine's move for `mark`, given the game so far. */
  async think(moves: PlayedMove[], mark: Mark): Promise<Point> {
    if (moves.length === 0) return { x: (BOARD_SIZE - 1) / 2, y: (BOARD_SIZE - 1) / 2 };
    await this.ready;
    if (this.failed) throw this.failed;
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.send(`INFO TIME_LEFT ${NO_LIMIT}`);
      // Side 1 is the engine's own stones, 2 the opponent's.
      this.send(`BOARD ${moves.map((m) => `${m.x},${m.y},${m.mark === mark ? 1 : 2}`).join(' ')} DONE`);
    });
  }

  terminate() {
    this.worker?.terminate();
    const err = new Error('Engine stopped');
    for (const r of this.queue.splice(0)) r.reject(err);
  }

  private send(cmd: string) {
    this.worker?.postMessage({ type: 'command', data: cmd });
  }

  private onLine(line: string) {
    const move = /^(\d+),(\d+)$/.exec(line);
    if (move) this.queue.shift()?.resolve({ x: +move[1], y: +move[2] });
    else if (line.startsWith('ERROR')) this.queue.shift()?.reject(new Error(line));
  }
}

/**
 * Loads Rapfi while `active` (the download starts as soon as Expert is picked) and returns its
 * status and `think`. The engine is shut down when `active` turns false or on unmount.
 */
export function useRapfi(active: boolean) {
  const [status, setStatus] = useState<RapfiStatus | null>(null);
  const ref = useRef<Rapfi | null>(null);

  useEffect(() => {
    if (!active) return;
    const engine = new Rapfi(setStatus);
    ref.current = engine;
    return () => {
      engine.terminate();
      ref.current = null;
      setStatus(null);
    };
  }, [active]);

  const think = useCallback((moves: PlayedMove[], mark: Mark) => {
    const engine = ref.current;
    return engine ? engine.think(moves, mark) : Promise.reject(new Error('Expert engine is not running'));
  }, []);

  return { status, think };
}
