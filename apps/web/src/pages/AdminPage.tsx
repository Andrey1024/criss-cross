import { useState, type FormEvent } from 'react';
import { Link } from '../i18n';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BAN_DURATIONS_DAYS,
  type AdminChatMessage,
  type AdminUser,
  type AdminUsersPage,
  type BanRecord,
  type RoomState,
} from '@cc/shared';
import { Avatar, Badge, Button, Card, ConfirmButton, ErrorNote, inputClass, Pager, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useMe } from '../lib/auth';
import { banUntil, formatDate, formatDateTime } from '../lib/format';

const TABS = { users: 'Users', rooms: 'Rooms', chat: 'Chat moderation' } as const;
type Tab = keyof typeof TABS;

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin panel</h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? 'bg-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {TABS[t]}
            </button>
          ))}
        </div>
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'chat' && <ChatTab />}
    </div>
  );
}

// ---- users ---------------------------------------------------------------------------------

function UsersTab() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [bannedOnly, setBannedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set('search', search);
  if (bannedOnly) params.set('banned', 'true');

  const { data, error, isPending } = useQuery({
    queryKey: ['admin-users', search, bannedOnly, page],
    queryFn: () => api<AdminUsersPage>(`/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  }

  return (
    <Card
      title={<>Users {data && <span className="font-normal text-slate-400">· {data.total}</span>}</>}
      actions={
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <label className="mr-1 flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={bannedOnly}
              onChange={(e) => {
                setPage(1);
                setBannedOnly(e.target.checked);
              }}
            />
            Banned only
          </label>
          <input className={`${inputClass} w-56`} placeholder="Search name or email" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Search users" />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      }
    >
      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorNote>{(error as Error).message}</ErrorNote>
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No users found.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {data.items.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </ul>
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const me = useMe();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<'ban' | 'history' | null>(null);
  const isSelf = user.id === me.id;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    qc.invalidateQueries({ queryKey: ['bans', user.id] });
  };

  const unban = useMutation({ mutationFn: () => api(`/admin/users/${user.id}/ban`, { method: 'DELETE' }), onSuccess: refresh });
  const setRole = useMutation({
    mutationFn: (role: 'USER' | 'ADMIN') => api(`/admin/users/${user.id}`, { method: 'PATCH', json: { role } }),
    onSuccess: refresh,
  });
  const actionError = (unban.error ?? setRole.error) as Error | null;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar user={user} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {user.name}
            {isSelf && <span className="font-normal text-slate-400">(you)</span>}
            {user.role === 'ADMIN' && <Badge tone="blue">Admin</Badge>}
            {user.activeBan && <Badge tone="red">Banned {banUntil(user.activeBan)}</Badge>}
          </p>
          <p className="truncate text-xs text-slate-500">
            {user.email} · joined {formatDate(user.createdAt)} · {user.gamesPlayed} {user.gamesPlayed === 1 ? 'game' : 'games'} · rating{' '}
            {user.rating}
            {user.provisional && '?'}
          </p>
          {user.activeBan && <p className="mt-0.5 text-xs text-red-700">Reason: {user.activeBan.reason}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPanel(panel === 'history' ? null : 'history')}>
            Ban history
          </Button>
          {!isSelf && (
            <ConfirmButton
              size="sm"
              variant="secondary"
              prompt={user.role === 'ADMIN' ? 'Remove admin role?' : 'Make admin?'}
              onConfirm={() => setRole.mutate(user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
              disabled={setRole.isPending}
            >
              {user.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
            </ConfirmButton>
          )}
          {user.activeBan ? (
            <ConfirmButton size="sm" variant="secondary" prompt="Lift the ban?" confirmLabel="Unban" onConfirm={() => unban.mutate()} disabled={unban.isPending}>
              Unban
            </ConfirmButton>
          ) : (
            !isSelf &&
            user.role !== 'ADMIN' && (
              <Button variant="secondary" size="sm" className="!text-red-700" onClick={() => setPanel(panel === 'ban' ? null : 'ban')}>
                Ban
              </Button>
            )
          )}
        </div>
      </div>
      {actionError && <div className="mt-2"><ErrorNote>{actionError.message}</ErrorNote></div>}
      {panel === 'ban' && (
        <BanForm
          user={user}
          onDone={() => {
            setPanel(null);
            refresh();
          }}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === 'history' && <BanHistory userId={user.id} />}
    </li>
  );
}

function BanForm({ user, onDone, onCancel }: { user: AdminUser; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<string>('7');
  const ban = useMutation({
    mutationFn: () =>
      api(`/admin/users/${user.id}/ban`, {
        method: 'POST',
        json: { reason, durationDays: duration === 'permanent' ? null : Number(duration) },
      }),
    onSuccess: onDone,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ban.mutate();
      }}
      className="mt-3 space-y-3 rounded-md border border-red-200 bg-red-50/50 p-3"
    >
      <p className="text-sm font-medium text-red-800">Ban {user.name}</p>
      <textarea
        className={`${inputClass} w-full`}
        rows={2}
        maxLength={500}
        required
        placeholder="Reason (shown to the user)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-label="Ban reason"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Ban duration">
          {BAN_DURATIONS_DAYS.map((d) => (
            <option key={d} value={d}>
              {d === 1 ? '1 day' : `${d} days`}
            </option>
          ))}
          <option value="permanent">Permanent</option>
        </select>
        <Button type="submit" variant="danger" size="sm" disabled={ban.isPending || !reason.trim()}>
          {ban.isPending ? 'Banning…' : 'Ban user'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        The user is disconnected right away. A game they are playing ends as a forfeit, and rooms they host are closed.
      </p>
      {ban.error && <ErrorNote>{(ban.error as Error).message}</ErrorNote>}
    </form>
  );
}

function BanHistory({ userId }: { userId: string }) {
  const { data, isPending } = useQuery({ queryKey: ['bans', userId], queryFn: () => api<BanRecord[]>(`/admin/users/${userId}/bans`) });
  if (isPending) return <Spinner />;
  if (!data?.length) return <p className="mt-3 text-sm text-slate-500">No bans on record.</p>;
  const now = Date.now();
  return (
    <ul className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-sm">
      {data.map((b) => {
        const status = b.revokedAt
          ? `Lifted ${formatDateTime(b.revokedAt)}`
          : b.expiresAt && new Date(b.expiresAt).getTime() <= now
            ? `Expired ${formatDateTime(b.expiresAt)}`
            : 'Active';
        return (
          <li key={b.id} className="flex flex-wrap gap-x-3">
            <span className="text-slate-500">{formatDateTime(b.createdAt)}</span>
            <span>
              by {b.admin.name} · {b.expiresAt ? `until ${formatDateTime(b.expiresAt)}` : 'permanent'}
            </span>
            <Badge tone={status === 'Active' ? 'red' : 'gray'}>{status}</Badge>
            <span className="w-full text-slate-700">“{b.reason}”</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---- rooms ---------------------------------------------------------------------------------

function RoomsTab() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ['admin-rooms'], queryFn: () => api<RoomState[]>('/admin/rooms'), refetchInterval: 5000 });
  const close = useMutation({
    mutationFn: (id: string) => api(`/admin/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rooms'] }),
  });

  return (
    <Card title={<>Live rooms {data && <span className="font-normal text-slate-400">· {data.length}</span>}</>}>
      {isPending ? (
        <Spinner />
      ) : !data?.length ? (
        <p className="py-6 text-center text-sm text-slate-500">No live rooms.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <Link to={`/room/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </p>
                <p className="text-xs text-slate-500">
                  {r.players.X.name} vs {r.players.O?.name ?? '—'} · {r.moveCount} moves · {r.spectators} watching
                </p>
              </div>
              <Badge tone={r.status === 'WAITING' ? 'green' : r.status === 'PLAYING' ? 'blue' : 'gray'}>{r.status.toLowerCase()}</Badge>
              <ConfirmButton size="sm" prompt="Close room?" confirmLabel="Close" onConfirm={() => close.mutate(r.id)}>
                Close
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---- chat ----------------------------------------------------------------------------------

function ChatTab() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => api<AdminChatMessage[]>('/admin/messages'),
    refetchInterval: 10_000,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-messages'] }),
  });

  return (
    <Card title="Recent chat messages">
      {isPending ? (
        <Spinner />
      ) : !data?.length ? (
        <p className="py-6 text-center text-sm text-slate-500">No messages yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-2.5">
              <Avatar user={m.user} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{m.user.name}</span> in {m.roomName} · {formatDateTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove.mutate(m.id)} disabled={remove.isPending}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
