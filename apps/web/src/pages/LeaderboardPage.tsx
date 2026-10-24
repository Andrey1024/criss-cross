import { useQuery } from '@tanstack/react-query';
import type { LeaderboardResponse } from '@cc/shared';
import { RatingDiff } from '../components/RatingBadge';
import { Avatar, Card, ErrorNote, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';
import { Link, useT } from '../i18n';

export function LeaderboardPage() {
  const me = useMe();
  const t = useT();
  const { data, error, isPending } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api<LeaderboardResponse>('/leaderboard'),
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorNote>{(error as Error).message}</ErrorNote>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t.leaderboard.title}</h1>
        <p className="text-sm text-slate-500">{t.leaderboard.intro(data.days, data.minGames)}</p>
      </div>

      <MyStatus data={data} />

      <Card>
        {data.entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t.leaderboard.nobody}{' '}
            <Link to="/" className="text-blue-700 hover:underline">
              {t.leaderboard.lobby}
            </Link>{' '}
            {t.leaderboard.nobodyRest}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-10 pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">{t.leaderboard.player}</th>
                  <th className="pb-2 text-right font-medium">{t.leaderboard.rating}</th>
                  <th className="pb-2 text-right font-medium">{t.leaderboard.days(data.days)}</th>
                  <th className="pb-2 text-right font-medium">{t.leaderboard.games}</th>
                  <th className="pb-2 text-right font-medium">{t.leaderboard.wld}</th>
                  <th className="pb-2 text-right font-medium">{t.leaderboard.winPct}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((e) => (
                  <tr key={e.user.id} className={e.user.id === me.id ? 'bg-amber-50' : undefined}>
                    <td className="py-2.5 pl-1 font-semibold tabular-nums text-slate-500">{e.rank}</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar user={e.user} size={24} />
                        <span className="truncate font-medium">{e.user.name}</span>
                        {e.user.id === me.id && <span className="text-xs text-slate-400">{t.leaderboard.you}</span>}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{e.rating}</td>
                    <td className="py-2.5 text-right">
                      <RatingDiff diff={e.ratingChange} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">{e.games}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      {e.wins} / {e.losses} / {e.draws}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">{Math.round((e.wins / e.games) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MyStatus({ data }: { data: LeaderboardResponse }) {
  const { me } = data;
  const t = useT();
  let text: string;
  if (me.rank !== null) text = t.leaderboard.rank(me.rank);
  else if (me.gamesNeeded > 0) text = t.leaderboard.needMore(me.gamesNeeded, data.days);
  else if (me.provisional) text = t.leaderboard.provisional;
  else text = t.leaderboard.outside(data.entries.length);
  return (
    <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
      <span className="font-medium text-slate-800">
        {t.leaderboard.yourRating(`${me.rating}${me.provisional ? '?' : ''}`)}
      </span>{' '}
      · {text}
    </p>
  );
}
