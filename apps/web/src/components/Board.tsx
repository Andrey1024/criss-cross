import type { CSSProperties } from 'react';
import type { Board as BoardType, Mark, Point } from '@cc/shared';

export const MARK_COLOR: Record<Mark, string> = { X: 'text-blue-600', O: 'text-red-500' };

export function MarkIcon({ mark, className = '' }: { mark: Mark; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${MARK_COLOR[mark]} ${className}`} aria-hidden>
      {mark === 'X' ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      ) : (
        <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="2.6" fill="none" />
      )}
    </svg>
  );
}

interface BoardProps {
  board: BoardType;
  lastMove?: Point | null;
  winLine?: Point[] | null;
  /** The viewer's mark when it's their turn; enables clicks and the hover preview. */
  playable?: Mark | null;
  onMove?: (x: number, y: number) => void;
}

/** White grid of square cells; X and O are drawn inside the cells. */
export function Board({ board, lastMove, winLine, playable, onMove }: BoardProps) {
  const size = board.length;
  const winSet = new Set(winLine?.map((p) => `${p.x},${p.y}`));
  const style = {
    '--cell': `min(2.25rem, calc((100vw - 2.5rem) / ${size}))`,
    gridTemplateColumns: `repeat(${size}, var(--cell))`,
    gridAutoRows: 'var(--cell)',
  } as CSSProperties;

  return (
    <div className="relative inline-block rounded-md border border-slate-300 bg-slate-200 p-px shadow-sm">
      <div className="grid gap-px" style={style} role="grid" aria-label="Game board">
        {board.map((row, y) =>
          row.map((cell, x) => {
            const isLast = lastMove?.x === x && lastMove?.y === y;
            const isWin = winSet.has(`${x},${y}`);
            const canPlay = !cell && !!playable;
            return (
              <button
                key={`${x},${y}`}
                type="button"
                role="gridcell"
                aria-label={`Row ${y + 1}, column ${x + 1}${cell ? `: ${cell}` : ''}`}
                data-x={x}
                data-y={y}
                disabled={!canPlay}
                onClick={() => onMove?.(x, y)}
                className={[
                  'group flex items-center justify-center bg-white p-[12%] transition-colors',
                  canPlay ? 'hover:bg-slate-50' : 'cursor-default',
                  isWin ? '!bg-emerald-50' : isLast ? '!bg-amber-100' : '',
                ].join(' ')}
              >
                {cell ? (
                  <MarkIcon mark={cell} className="h-full w-full" />
                ) : canPlay ? (
                  <MarkIcon mark={playable!} className="h-full w-full opacity-0 transition-opacity group-hover:opacity-25" />
                ) : null}
              </button>
            );
          }),
        )}
      </div>
      {winLine && winLine.length > 1 && <WinStroke line={winLine} size={size} />}
    </div>
  );
}

function WinStroke({ line, size }: { line: Point[]; size: number }) {
  const a = line[0];
  const b = line[line.length - 1];
  return (
    <svg
      className="pointer-events-none absolute inset-px h-[calc(100%-2px)] w-[calc(100%-2px)]"
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <line
        x1={a.x + 0.5}
        y1={a.y + 0.5}
        x2={b.x + 0.5}
        y2={b.y + 0.5}
        className="stroke-emerald-500/70"
        strokeWidth={0.18}
        strokeLinecap="round"
      />
    </svg>
  );
}
