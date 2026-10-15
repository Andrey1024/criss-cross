import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import type { Me } from '@cc/shared';
import { useAuth } from '../lib/auth';
import { useSocketConnected } from '../lib/hooks';
import { MarkIcon } from './Board';
import { Avatar, Button, Spinner } from './ui';

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`;

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-1 text-base font-bold tracking-tight">
            <MarkIcon mark="X" className="h-5 w-5" />
            <MarkIcon mark="O" className="-ml-1 h-5 w-5" />
            Criss-Cross
          </NavLink>
          {user ? <MemberNav user={user} /> : <GuestNav />}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Criss-Cross · five in a row online</span>
          <Link to="/rules" className="hover:text-slate-800">
            Rules &amp; strategy
          </Link>
          <Link to="/play/computer" className="hover:text-slate-800">
            Play vs computer
          </Link>
        </div>
      </footer>
    </div>
  );
}

function GuestNav() {
  return (
    <>
      <nav className="flex items-center gap-1">
        <NavLink to="/play/computer" className={link}>
          Play vs computer
        </NavLink>
        <NavLink to="/rules" className={link}>
          Rules
        </NavLink>
      </nav>
      <div className="ml-auto">
        <Link
          to="/login"
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}

/** Rendered only when signed in, so the socket hooks never run for guests or during pre-rendering. */
function MemberNav({ user }: { user: Me }) {
  const { logout } = useAuth();
  const connected = useSocketConnected();
  return (
    <>
      <nav className="flex flex-wrap items-center gap-1">
        <NavLink to="/" end className={link}>
          Lobby
        </NavLink>
        <NavLink to="/leaderboard" className={link}>
          Leaderboard
        </NavLink>
        <NavLink to="/account" className={link}>
          My games
        </NavLink>
        <NavLink to="/rules" className={link}>
          Rules
        </NavLink>
        {user.role === 'ADMIN' && (
          <NavLink to="/admin" className={link}>
            Admin
          </NavLink>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {!connected && <span className="text-xs text-amber-700">Reconnecting…</span>}
        <span className="flex items-center gap-2 text-sm text-slate-700">
          <Avatar user={user} size={26} />
          <span className="hidden sm:inline">{user.name}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </>
  );
}
