import type { RatingView } from '@cc/shared';
import { useT } from '../i18n';

/** "1612", or "1540?" while the rating is provisional (lichess style). */
export function RatingBadge({ rating, className = '' }: { rating: RatingView; className?: string }) {
  const t = useT();
  return (
    <span className={`tabular-nums ${className}`} title={rating.provisional ? t.chart.provisional : undefined}>
      {rating.rating}
      {rating.provisional && '?'}
    </span>
  );
}

/** Signed rating change: green for gains, red for losses. */
export function RatingDiff({ diff, className = '' }: { diff: number; className?: string }) {
  const tone = diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-slate-500';
  const text = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : '±0';
  return <span className={`tabular-nums font-medium ${tone} ${className}`}>{text}</span>;
}
