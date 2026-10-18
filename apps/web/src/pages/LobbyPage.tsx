import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Events, ROOM_NAME_MAX_LENGTH, type LobbyRoom } from '@cc/shared';
import { MarkIcon } from '../components/Board';
import { RatingBadge } from '../components/RatingBadge';
import { Avatar, Badge, Button, Card, ErrorNote, inputClass, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';
import { formatTime } from '../lib/format';
import { useOnSocketConnect, useSocketEvent } from '../lib/hooks';
import { getSocket } from '../lib/socket';

export function LobbyPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<LobbyRoom[] | null>(null);
  const [name, setName] = useState(`${me.name}'s room`.slice(0, ROOM_NAME_MAX_LENGTH));
  const [unrated, setUnrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSocketEvent<LobbyRoom[]>(Events.LobbyRooms, setRooms);
  useOnSocketConnect(() => getSocket().emit(Events.LobbySubscribe));
  useEffect(() => () => void getSocket().emit(Events.LobbyUnsubscribe), []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const room = await api<LobbyRoom>('/rooms', { method: 'POST', json: { name, unrated } });
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  }

  const waiting = rooms?.filter((r) => r.status === 'WAITING') ?? [];
  const playing = rooms?.filter((r) => r.status === 'PLAYING') ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card title={<>Open rooms {rooms && <span className="font-normal text-slate-400">· {waiting.length}</span>}</>}>
          {!rooms ? (
            <Spinner />
          ) : waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No open rooms right now. Create one and invite a friend.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {waiting.map((r) => (
                <RoomRow key={r.id} room={r} action={r.host.id === me.id ? 'Open' : 'Join'} onOpen={() => navigate(`/room/${r.id}`)} />
              ))}
            </ul>
          )}
        </Card>

        {playing.length > 0 && (
          <Card title={<>Games in progress <span className="font-normal text-slate-400">· {playing.length}</span></>}>
            <ul className="divide-y divide-slate-100">
              {playing.map((r) => (
                <RoomRow
                  key={r.id}
                  room={r}
                  action={r.players.X.id === me.id || r.players.O?.id === me.id ? 'Return' : 'Watch'}
                  onOpen={() => navigate(`/room/${r.id}`)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="space-y-6 self-start">
        <Card title="Create a room">
          <form onSubmit={create} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Room name</span>
              <input className={`${inputClass} w-full`} value={name} onChange={(e) => setName(e.target.value)} maxLength={ROOM_NAME_MAX_LENGTH} required />
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 p-3 text-sm has-[:checked]:border-slate-400 has-[:checked]:bg-slate-50">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-slate-900"
                checked={unrated}
                onChange={(e) => setUnrated(e.target.checked)}
              />
              <span>
                <span className="block font-medium text-slate-800">Unrated, invite only</span>
                <span className="block text-xs text-slate-500">
                  Hidden from the lobby. Anyone with the link can join, no account needed.
                </span>
              </span>
            </label>
            <p className="text-xs text-slate-500">
              You play <MarkIcon mark="X" className="inline h-3.5 w-3.5 align-[-2px]" /> and move first. The game starts when someone joins. Each move has a 30-second limit, which you can both agree to turn off.
            </p>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" className="w-full" disabled={creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create room'}
            </Button>
          </form>
        </Card>

        <Card title="Play vs computer">
          <p className="text-sm text-slate-600">No one around? Practise against the computer on easy, medium or hard. These games aren't saved.</p>
          <Link
            to="/play/computer"
            className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Play vs computer
          </Link>
        </Card>
      </div>
    </div>
  );
}

function RoomRow({ room, action, onOpen }: { room: LobbyRoom; action: string; onOpen: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar user={room.host} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{room.name}</p>
        <p className="truncate text-xs text-slate-500">
          {room.status === 'WAITING' ? (
            <>
              Host {room.host.name} (<RatingBadge rating={room.ratings.X} />) · created {formatTime(room.createdAt)}
            </>
          ) : (
            <>
              {room.players.X.name} (<RatingBadge rating={room.ratings.X} />) vs {room.players.O?.name}
              {room.ratings.O && (
                <>
                  {' '}
                  (<RatingBadge rating={room.ratings.O} />)
                </>
              )}
            </>
          )}
        </p>
      </div>
      {room.status === 'WAITING' ? <Badge tone="green">Waiting for player</Badge> : <Badge tone="blue">Playing</Badge>}
      <Button size="sm" variant={action === 'Join' ? 'primary' : 'secondary'} onClick={onOpen}>
        {action}
      </Button>
    </li>
  );
}
