import { useCallback, useEffect, useRef } from 'react';
import type { AiLevel, Board, Mark, Point } from '@cc/shared';
import type { AiRequest } from './ai.worker';

interface WorkerHandle {
  worker: Worker;
  seq: number;
  pending: Map<number, (move: Point | null) => void>;
}

/** Returns `think(board, mark, level)`, which resolves with the computer's move. */
export function useAiWorker() {
  const ref = useRef<WorkerHandle | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    const handle: WorkerHandle = { worker, seq: 0, pending: new Map() };
    worker.onmessage = (e: MessageEvent<{ id: number; move: Point | null }>) => {
      handle.pending.get(e.data.id)?.(e.data.move);
      handle.pending.delete(e.data.id);
    };
    ref.current = handle;
    return () => {
      worker.terminate();
      ref.current = null;
    };
  }, []);

  return useCallback((board: Board, mark: Mark, level: AiLevel) => {
    return new Promise<Point | null>((resolve, reject) => {
      const handle = ref.current;
      if (!handle) return reject(new Error('AI worker is not running'));
      const id = ++handle.seq;
      handle.pending.set(id, resolve);
      handle.worker.postMessage({ id, board, mark, level } satisfies AiRequest);
    });
  }, []);
}
