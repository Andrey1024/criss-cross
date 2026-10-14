import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../lib/auth';
import { useSocketConnected } from '../lib/hooks';
import { MarkIcon } from './Board';
import { Avatar, Button } from './ui';

export function Layout() {
  const { user, logout } = useAuth();
  const connected = useSocketConnected();
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-1 text-base font-bold tracking-tight">
            <MarkIcon mark="X" className="h-5 w-5" />
            <MarkIcon mark="O" className="-ml-1 h-5 w-5" />
            Criss-Cross
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={link}>
              Lobby
            </NavLink>
            <NavLink to="/account" className={link}>
              My games
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={link}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {!connected && <span className="text-xs text-amber-700">Reconnecting…</span>}
            {user && (
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <Avatar user={user} size={26} />
                <span className="hidden sm:inline">{user.name}</span>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
