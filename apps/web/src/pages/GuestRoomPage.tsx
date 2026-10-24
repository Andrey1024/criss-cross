import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { GUEST_NAME_MAX_LENGTH, type PublicUser, type RoomInvite } from '@cc/shared';
import { MarkIcon } from '../components/Board';
import { Avatar, Button, Card, ErrorNote, inputClass, Spinner } from '../components/ui';
import { Link, Navigate, useT } from '../i18n';
import { api, ApiError } from '../lib/api';
import { disconnectSocket, getSocket } from '../lib/socket';
import { RoomPage } from './RoomPage';

/** An invite link opened while signed out: unrated rooms can be joined with just a name. */
export function GuestRoomRoute() {
  const { id } = useParams();
  return <GuestRoom key={id} roomId={id!} />;
}

function GuestRoom({ roomId }: { roomId: string }) {
  const [invite, setInvite] = useState<RoomInvite | 'missing' | null>(null);
  // undefined while loading; null when this browser has no guest identity yet.
  const [guest, setGuest] = useState<PublicUser | null | undefined>(undefined);
  const forgetGuest = useCallback(() => setGuest(null), []);
  const t = useT();

  useEffect(() => {
    api<RoomInvite>(`/rooms/${roomId}/invite`).then(setInvite, () => setInvite('missing'));
    api<{ guest: PublicUser | null }>('/auth/guest').then(
      (r) => setGuest(r.guest),
      () => setGuest(null),
    );
  }, [roomId]);

  if (invite === null || guest === undefined) return <Spinner label={t.guest.opening} />;
  if (invite === 'missing') return <RoomGone />;
  if (!invite.unrated) return <Navigate to={`/login?next=${encodeURIComponent(`/room/${roomId}`)}`} replace />;
  if (!guest) return <JoinForm invite={invite} onJoined={setGuest} />;
  return <GuestSession guest={guest} roomId={roomId} onSignedOut={forgetGuest} />;
}

/** Holds the guest's socket connection for as long as they are in the room. */
function GuestSession({ guest, roomId, onSignedOut }: { guest: PublicUser; roomId: string; onSignedOut: () => void }) {
  useEffect(() => {
    const socket = getSocket();
    const onConnectError = (err: Error) => {
      if (err.message === 'UNAUTHORIZED') onSignedOut();
    };
    socket.on('connect_error', onConnectError);
    socket.connect();
    return () => {
      socket.off('connect_error', onConnectError);
      disconnectSocket();
    };
  }, [onSignedOut]);

  return <RoomPage roomId={roomId} me={guest} />;
}

function JoinForm({ invite, onJoined }: { invite: RoomInvite; onJoined: (guest: PublicUser) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seatFree = invite.status === 'WAITING';

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onJoined(await api<PublicUser>(`/rooms/${invite.id}/guest`, { method: 'POST', json: { name } }));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t.guest.gone : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <Avatar user={invite.host} size={40} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{invite.name}</h1>
          <p className="text-sm text-slate-500">{t.guest.invited(invite.host.name)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        {seatFree ? (
          <>
            {t.guest.youllPlay} <MarkIcon mark="O" className="inline h-3.5 w-3.5 align-[-2px]" /> {t.guest.against(invite.host.name)}
          </>
        ) : (
          t.guest.started
        )}
      </p>
      <form onSubmit={join} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">{t.guest.yourName}</span>
          <input
            className={`${inputClass} w-full`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={GUEST_NAME_MAX_LENGTH}
            autoComplete="nickname"
            autoFocus
            required
          />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
          {busy ? t.guest.joining : seatFree ? t.guest.joinGame : t.guest.watchGame}
        </Button>
      </form>
      <p className="mt-4 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
        {t.guest.haveAccount}{' '}
        <Link to={`/login?next=${encodeURIComponent(`/room/${invite.id}`)}`} className="font-medium text-blue-700 hover:underline">
          {t.guest.signIn}
        </Link>
      </p>
    </Card>
  );
}

function RoomGone() {
  const t = useT();
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-lg font-semibold">{t.guest.unavailable}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.guest.gone}</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
        {t.common.homePage}
      </Link>
    </Card>
  );
}
