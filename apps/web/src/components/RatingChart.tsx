import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { RatingPoint } from '@cc/shared';
import { formatDate } from '../lib/format';

const W = 640;
const H = 180;
const PAD = { top: 12, right: 52, bottom: 24, left: 40 };

/** Rating after each rated game, evenly spaced by game, with a crosshair tooltip. */
export function RatingChart({ points }: { points: RatingPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    const ratings = points.map((p) => p.rating);
    // Clean 50-point ticks around the data, with a little headroom.
    const lo = Math.floor((Math.min(...ratings) - 10) / 50) * 50;
    const hi = Math.ceil((Math.max(...ratings) + 10) / 50) * 50;
    const step = hi - lo > 300 ? 100 : 50;
    const ticks: number[] = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length === 1 ? innerW : (i / (points.length - 1)) * innerW);
    const y = (r: number) => PAD.top + (1 - (r - lo) / (hi - lo)) * innerH;
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join('');
    return { ticks, x, y, path };
  }, [points]);

  if (points.length < 2) {
    return <p className="py-6 text-center text-sm text-slate-500">Your rating chart appears after your first rated game.</p>;
  }

  const last = points.length - 1;
  const shown = active ?? last;

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const t = (px - PAD.left) / (W - PAD.left - PAD.right);
    setActive(Math.min(last, Math.max(0, Math.round(t * last))));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowLeft') setActive(Math.max(0, shown - 1));
    else if (e.key === 'ArrowRight') setActive(Math.min(last, shown + 1));
    else return;
    e.preventDefault();
  }

  const ax = geo.x(shown);
  const ay = geo.y(points[shown].rating);
  const tooltipLeft = `${(ax / W) * 100}%`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        role="img"
        aria-label={`Rating history: from ${points[0].rating} to ${points[last].rating} over ${last} rated games`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={geo.y(t)} y2={geo.y(t)} className="stroke-slate-200" strokeWidth={1} />
            <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} className="fill-slate-500 text-[11px]">
          {formatDate(points[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-slate-500 text-[11px]">
          {formatDate(points[last].date)}
        </text>

        <path d={geo.path} fill="none" className="stroke-blue-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {active !== null && (
          <line x1={ax} x2={ax} y1={PAD.top} y2={H - PAD.bottom} className="stroke-slate-400" strokeWidth={1} />
        )}
        <circle cx={ax} cy={ay} r={4} className="fill-blue-600 stroke-white" strokeWidth={2} />
        {/* Current rating labelled at the line's end, in text colour. */}
        <text x={geo.x(last) + 8} y={geo.y(points[last].rating)} dy="0.32em" className="fill-slate-800 text-[12px] font-semibold">
          {points[last].rating}
        </text>
      </svg>

      {active !== null && (
        <div
          className={`pointer-events-none absolute -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm ${
            ay < H / 2 ? 'bottom-8' : 'top-0'
          }`}
          style={{ left: tooltipLeft }}
        >
          <p className="text-sm font-semibold tabular-nums text-slate-900">{points[active].rating}</p>
          <p className="text-slate-500">
            {active === 0 ? 'Start' : `After game ${active}`} · {formatDate(points[active].date)}
          </p>
        </div>
      )}
    </div>
  );
}
