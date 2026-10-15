import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { LeaderboardResponse } from '@cc/shared';
import { RatingDiff } from '../components/RatingBadge';
import { Avatar, Card, ErrorNote, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';

export function LeaderboardPage() {
  const me = useMe();
  const { data, error, isPending } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api<LeaderboardResponse>('/leaderboard'),
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorNote>{(error as Error).message}</ErrorNote>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Leaderboard</h1>
        <p className="text-sm text-slate-500">
          Best players by rating over the last {data.days} days. You need at least {data.minGames} rated games in that time
          and a settled (non-provisional) rating to be listed.
        </p>
      </div>

      <MyStatus data={data} />

      <Card>
        {data.entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nobody qualifies yet. Play rated games in the <Link to="/" className="text-blue-700 hover:underline">lobby</Link> to
            get on the board.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-10 pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Player</th>
                  <th className="pb-2 text-right font-medium">Rating</th>
                  <th className="pb-2 text-right font-medium">{data.days} days</th>
                  <th className="pb-2 text-right font-medium">Games</th>
                  <th className="pb-2 text-right font-medium">W / L / D</th>
                  <th className="pb-2 text-right font-medium">Win %</th>
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
                        {e.user.id === me.id && <span className="text-xs text-slate-400">(you)</span>}
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
  let text: string;
  if (me.rank !== null) text = `You are #${me.rank} on the leaderboard.`;
  else if (me.gamesNeeded > 0)
    text = `Play ${me.gamesNeeded} more rated ${me.gamesNeeded === 1 ? 'game' : 'games'} in the next ${data.days} days to qualify.`;
  else if (me.provisional) text = 'Your rating is still provisional. It settles after a few more rated games.';
  else text = `You qualify, but you're outside the top ${data.entries.length}.`;
  return (
    <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
      <span className="font-medium text-slate-800">
        Your rating: {me.rating}
        {me.provisional && '?'}
      </span>{' '}
      · {text}
    </p>
  );
}
