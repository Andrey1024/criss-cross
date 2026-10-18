import { Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { Me } from '@cc/shared';
import { useAuth } from '../lib/auth';
import { useSocketConnected } from '../lib/hooks';
import { setTheme, useTheme } from '../lib/theme';
import { MarkIcon } from './Board';
import { BookIcon, ComputerIcon, HistoryIcon, HomeIcon, MoonIcon, SunIcon, TrophyIcon } from './icons';
import { Avatar, Button, Spinner } from './ui';

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`;

interface Tab {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const MEMBER_TABS: Tab[] = [
  { to: '/', label: 'Lobby', icon: HomeIcon, end: true },
  { to: '/play/computer', label: 'Computer', icon: ComputerIcon },
  { to: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
  { to: '/account', label: 'My games', icon: HistoryIcon },
];

const GUEST_TABS: Tab[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/play/computer', label: 'Computer', icon: ComputerIcon },
  { to: '/rules', label: 'Rules', icon: BookIcon },
];

/**
 * Desktop: one header row with all links. Phones (< 640px): a slim top bar with the logo and
 * the account menu (or Sign in), plus a bottom tab bar within thumb reach.
 */
export function Layout() {
  const { user } = useAuth();
  return (
    // Bottom padding keeps content clear of the fixed mobile tab bar.
    <div className="flex min-h-screen flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-13 max-w-6xl items-center gap-4 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-1 text-base font-semibold tracking-tight text-slate-700">
            <MarkIcon mark="X" className="h-5 w-5" />
            <MarkIcon mark="O" className="-ml-1 h-5 w-5" />
            Five in a Row
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
          <span className="hidden sm:inline">© {new Date().getFullYear()} Play Five in a Row · playfiveinarow.com</span>
          <Link to="/rules" className="hover:text-slate-800">
            Rules &amp; strategy
          </Link>
          <Link to="/play/computer" className="hover:text-slate-800">
            Play vs computer
          </Link>
          <Link to="/privacy" className="hover:text-slate-800">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-slate-800">
            Terms
          </Link>
        </div>
      </footer>
      <TabBar tabs={user ? MEMBER_TABS : GUEST_TABS} />
    </div>
  );
}

function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav
      aria-label="Main"
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ to, label, icon: TabIcon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-15 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-500 active:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-slate-900" aria-hidden />}
                  <TabIcon className={`h-6 w-6 ${isActive ? 'stroke-[2.2]' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function GuestNav() {
  return (
    <>
      <nav className="hidden items-center gap-1 sm:flex">
        <NavLink to="/play/computer" className={link}>
          Play vs computer
        </NavLink>
        <NavLink to="/rules" className={link}>
          Rules
        </NavLink>
      </nav>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Link
          to="/login"
          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3.5 text-sm font-medium text-white hover:bg-slate-700"
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
      <nav className="hidden flex-wrap items-center gap-1 sm:flex">
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
      <div className="ml-auto hidden items-center gap-3 sm:flex">
        <ThemeToggle />
        {!connected && <span className="text-xs text-amber-700">Reconnecting…</span>}
        <span className="flex items-center gap-2 text-sm text-slate-700">
          <Avatar user={user} size={26} />
          <span className="hidden md:inline">{user.name}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:hidden">
        <ThemeToggle />
        <AccountMenu user={user} connected={connected} onLogout={logout} />
      </div>
    </>
  );
}

/** Sun/moon button. The icon is chosen by CSS, so pre-rendered pages show the right one at once. */
function ThemeToggle() {
  const dark = useTheme() === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9"
    >
      <MoonIcon className="h-5 w-5 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 dark:block" />
    </button>
  );
}

const MENU_ITEM = 'flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-slate-100';

/** Phone-only account menu behind the avatar: rating, Rules, Admin and Sign out. */
function AccountMenu({ user, connected, onLogout }: { user: Me; connected: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu${connected ? '' : ' (reconnecting)'}`}
        onClick={() => setOpen((o) => !o)}
        className="relative -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
      >
        <Avatar user={user} size={32} />
        {!connected && (
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden />
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">
              Rating {user.rating}
              {user.provisional && '?'}
              {!connected && <span className="text-amber-700"> · reconnecting…</span>}
            </p>
          </div>
          <Link role="menuitem" to="/rules" className={`${MENU_ITEM} text-slate-700`}>
            Rules &amp; strategy
          </Link>
          {user.role === 'ADMIN' && (
            <Link role="menuitem" to="/admin" className={`${MENU_ITEM} text-slate-700`}>
              Admin panel
            </Link>
          )}
          <button role="menuitem" type="button" onClick={onLogout} className={`${MENU_ITEM} text-red-700`}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
