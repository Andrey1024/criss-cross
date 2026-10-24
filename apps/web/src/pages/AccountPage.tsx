import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { GameHistoryPage, Me, Outcome, RatingPoint } from '@cc/shared';
import { MarkIcon } from '../components/Board';
import { RatingBadge, RatingDiff } from '../components/RatingBadge';
import { RatingChart } from '../components/RatingChart';
import { Avatar, Badge, Card, ErrorNote, Pager, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';
import { formatDate, formatDateTime, outcomeLabel, resultLabel } from '../lib/format';
import { Link, useT } from '../i18n';

const OUTCOME_TONE: Record<Outcome, 'green' | 'red' | 'gray' | 'amber'> = { win: 'green', loss: 'red', draw: 'amber', none: 'gray' };

export function AccountPage() {
  const me = useMe();
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, error, isPending } = useQuery({
    queryKey: ['history', page],
    queryFn: () => api<GameHistoryPage>(`/me/games?page=${page}`),
    placeholderData: keepPreviousData,
  });
  // The signed-in user object is loaded once; fetch fresh rating fields for this page.
  const { data: fresh } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') });
  const { data: ratingHistory } = useQuery({ queryKey: ['rating-history'], queryFn: () => api<RatingPoint[]>('/me/rating-history') });
  const rating = fresh ?? me;
  const stats = data?.stats;
  const winRate = stats && stats.played ? Math.round((stats.wins / stats.played) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar user={me} size={56} />
        <div>
          <h1 className="text-xl font-semibold">{me.name}</h1>
          <p className="text-sm text-slate-500">
            {me.email} · {t.account.memberSince(formatDate(me.createdAt))}
            {me.role === 'ADMIN' && <> · <Badge tone="blue">{t.account.admin}</Badge></>}
          </p>
        </div>
      </div>

      <Card title={t.account.rating}>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div>
            <p className="text-3xl font-semibold">
              <RatingBadge rating={rating} />
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t.account.ratedGames(rating.ratedGames)}
            </p>
            {rating.provisional && (
              <p className="mt-2 text-xs text-amber-700">{t.account.provisional}</p>
            )}
            <Link to="/leaderboard" className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline">
              {t.account.viewLeaderboard}
            </Link>
          </div>
          {ratingHistory ? <RatingChart points={ratingHistory} /> : <Spinner />}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={t.account.games} value={stats?.played} />
        <Stat label={t.account.wins} value={stats?.wins} tone="text-emerald-700" />
        <Stat label={t.account.losses} value={stats?.losses} tone="text-red-700" />
        <Stat label={t.account.draws} value={stats?.draws} />
        <Stat label={t.account.winRate} value={winRate === null ? '—' : `${winRate}%`} />
      </div>

      <Card title={t.account.history}>
        {isPending ? (
          <Spinner />
        ) : error ? (
          <ErrorNote>{(error as Error).message}</ErrorNote>
        ) : data.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t.account.noGames}{' '}
            <Link to="/" className="text-blue-700 hover:underline">
              {t.account.findGame}
            </Link>
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-2 font-medium">{t.account.date}</th>
                    <th className="pb-2 font-medium">{t.account.opponent}</th>
                    <th className="pb-2 font-medium">{t.account.you}</th>
                    <th className="pb-2 font-medium">{t.account.result}</th>
                    <th className="pb-2 font-medium">{t.account.moves}</th>
                    <th className="pb-2 font-medium">{t.account.rating}</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((g) => (
                    <tr key={g.id}>
                      <td className="py-2.5 text-slate-600">{formatDateTime(g.endedAt)}</td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2">
                          <Avatar user={g.opponent} size={22} />
                          {g.opponent.name}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <MarkIcon mark={g.myMark} className="h-4 w-4" />
                      </td>
                      <td className="py-2.5">
                        <Badge tone={OUTCOME_TONE[g.outcome]}>{outcomeLabel(g.outcome)}</Badge>{' '}
                        <span className="text-xs text-slate-400">{resultLabel(g.result)}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{g.moveCount}</td>
                      <td className="py-2.5">{g.ratingDiff === null ? <span className="text-slate-400">—</span> : <RatingDiff diff={g.ratingDiff} />}</td>
                      <td className="py-2.5 text-right">
                        <Link to={`/games/${g.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                          {t.account.replay}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: number | string | undefined; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${tone}`}>{value ?? '—'}</p>
    </div>
  );
}
