import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { GameHistoryPage, Me, Outcome, RatingPoint } from '@cc/shared';
import { MarkIcon } from '../components/Board';
import { RatingBadge, RatingDiff } from '../components/RatingBadge';
import { RatingChart } from '../components/RatingChart';
import { Avatar, Badge, Card, ErrorNote, Pager, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';
import { formatDate, formatDateTime, OUTCOME_LABEL, RESULT_LABEL } from '../lib/format';

const OUTCOME_TONE: Record<Outcome, 'green' | 'red' | 'gray' | 'amber'> = { win: 'green', loss: 'red', draw: 'amber', none: 'gray' };

export function AccountPage() {
  const me = useMe();
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
            {me.email} · member since {formatDate(me.createdAt)}
            {me.role === 'ADMIN' && <> · <Badge tone="blue">Admin</Badge></>}
          </p>
        </div>
      </div>

      <Card title="Rating">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div>
            <p className="text-3xl font-semibold">
              <RatingBadge rating={rating} />
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {rating.ratedGames} rated {rating.ratedGames === 1 ? 'game' : 'games'}
            </p>
            {rating.provisional && (
              <p className="mt-2 text-xs text-amber-700">Provisional: your rating settles after a few more rated games.</p>
            )}
            <Link to="/leaderboard" className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline">
              View leaderboard →
            </Link>
          </div>
          {ratingHistory ? <RatingChart points={ratingHistory} /> : <Spinner />}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Games" value={stats?.played} />
        <Stat label="Wins" value={stats?.wins} tone="text-emerald-700" />
        <Stat label="Losses" value={stats?.losses} tone="text-red-700" />
        <Stat label="Draws" value={stats?.draws} />
        <Stat label="Win rate" value={winRate === null ? '—' : `${winRate}%`} />
      </div>

      <Card title="Game history">
        {isPending ? (
          <Spinner />
        ) : error ? (
          <ErrorNote>{(error as Error).message}</ErrorNote>
        ) : data.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No finished games yet. <Link to="/" className="text-blue-700 hover:underline">Find a game</Link>.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Opponent</th>
                    <th className="pb-2 font-medium">You</th>
                    <th className="pb-2 font-medium">Result</th>
                    <th className="pb-2 font-medium">Moves</th>
                    <th className="pb-2 font-medium">Rating</th>
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
                        <Badge tone={OUTCOME_TONE[g.outcome]}>{OUTCOME_LABEL[g.outcome]}</Badge>{' '}
                        <span className="text-xs text-slate-400">{RESULT_LABEL[g.result]}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{g.moveCount}</td>
                      <td className="py-2.5">{g.ratingDiff === null ? <span className="text-slate-400">—</span> : <RatingDiff diff={g.ratingDiff} />}</td>
                      <td className="py-2.5 text-right">
                        <Link to={`/games/${g.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                          Replay
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
