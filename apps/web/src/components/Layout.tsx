import { Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { Outlet, useLocation, useNavigate as useRouterNavigate } from 'react-router';
import type { Me } from '@cc/shared';
import { LANG_NAME, LANGS, Link, localizePath, MESSAGES, NavLink, saveLang, savedLang, stripLang, useLang, useT, type Lang } from '../i18n';
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

/**
 * Desktop: one header row with all links. Phones (< 640px): a slim top bar with the logo and
 * the account menu (or Sign in), plus a bottom tab bar within thumb reach.
 */
export function Layout() {
  const { user } = useAuth();
  const t = useT();
  const tabs: Tab[] = user
    ? [
        { to: '/', label: t.nav.lobby, icon: HomeIcon, end: true },
        { to: '/play/computer', label: t.nav.computer, icon: ComputerIcon },
        { to: '/leaderboard', label: t.nav.leaderboard, icon: TrophyIcon },
        { to: '/account', label: t.nav.myGames, icon: HistoryIcon },
      ]
    : [
        { to: '/', label: t.nav.home, icon: HomeIcon, end: true },
        { to: '/play/computer', label: t.nav.computer, icon: ComputerIcon },
        { to: '/rules', label: t.nav.rules, icon: BookIcon },
      ];
  return (
    // Bottom padding keeps content clear of the fixed mobile tab bar.
    <div className="flex min-h-screen flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-13 max-w-6xl items-center gap-4 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-1 text-base font-semibold tracking-tight text-slate-700">
            <MarkIcon mark="X" className="h-5 w-5" />
            <MarkIcon mark="O" className="-ml-1 h-5 w-5" />
            {t.siteName}
          </NavLink>
          {user ? <MemberNav user={user} /> : <GuestNav />}
        </div>
      </header>
      <LanguageSuggestion />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4 text-xs text-slate-500">
          <span className="hidden sm:inline">{t.nav.copyright(new Date().getFullYear())}</span>
          <Link to="/rules" className="hover:text-slate-800">
            {t.nav.rulesStrategy}
          </Link>
          <Link to="/play/computer" className="hover:text-slate-800">
            {t.nav.playVsComputer}
          </Link>
          <Link to="/privacy" className="hover:text-slate-800">
            {t.nav.privacy}
          </Link>
          <Link to="/terms" className="hover:text-slate-800">
            {t.nav.terms}
          </Link>
          <LanguageLinks />
        </div>
      </footer>
      <TabBar tabs={tabs} />
    </div>
  );
}

/** Goes to the same page in another language and remembers the choice. */
function useSwitchLanguage() {
  const navigate = useRouterNavigate();
  const { pathname, search, hash } = useLocation();
  return (target: Lang) => {
    saveLang(target);
    navigate(localizePath(stripLang(pathname) + search + hash, target));
  };
}

/** Footer list of languages, each in its own name. */
function LanguageLinks() {
  const lang = useLang();
  const t = useT();
  const switchTo = useSwitchLanguage();
  return (
    <span className="flex items-center gap-2 sm:ml-auto" aria-label={t.nav.language}>
      {LANGS.map((l) =>
        l === lang ? (
          <span key={l} className="font-semibold text-slate-700" aria-current="true" lang={l}>
            {LANG_NAME[l]}
          </span>
        ) : (
          <button key={l} type="button" className="hover:text-slate-800" lang={l} onClick={() => switchTo(l)}>
            {LANG_NAME[l]}
          </button>
        ),
      )}
    </span>
  );
}

/** Header button that flips to the other language (there are two). */
function LanguageToggle() {
  const lang = useLang();
  const t = useT();
  const switchTo = useSwitchLanguage();
  const other = LANGS.find((l) => l !== lang)!;
  return (
    <button
      type="button"
      onClick={() => switchTo(other)}
      lang={other}
      title={LANG_NAME[other]}
      aria-label={`${t.nav.language}: ${LANG_NAME[other]}`}
      className="flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs font-semibold tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:min-w-9"
    >
      {other.toUpperCase()}
    </button>
  );
}

/**
 * Suggests the visitor's browser language when the page is in another one and they haven't
 * picked a language yet. Never redirects on its own.
 */
function LanguageSuggestion() {
  const lang = useLang();
  const switchTo = useSwitchLanguage();
  const [suggested, setSuggested] = useState<Lang | null>(null);

  useEffect(() => {
    if (savedLang()) return setSuggested(null);
    const preferred = navigator.languages?.map((l) => l.slice(0, 2).toLowerCase()).find((l) => (LANGS as readonly string[]).includes(l));
    setSuggested(preferred && preferred !== lang ? (preferred as Lang) : null);
  }, [lang]);

  if (!suggested) return null;
  const m = MESSAGES[suggested].suggest;
  return (
    <div lang={suggested} className="border-b border-blue-200 bg-blue-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm text-blue-900">
        <span>{m.text}</span>
        <button type="button" className="font-medium text-blue-700 hover:underline" onClick={() => switchTo(suggested)}>
          {m.action}
        </button>
        <button
          type="button"
          className="ml-auto text-blue-700 hover:text-blue-900"
          aria-label={m.dismiss}
          onClick={() => {
            saveLang(lang);
            setSuggested(null);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TabBar({ tabs }: { tabs: Tab[] }) {
  const t = useT();
  return (
    <nav
      aria-label={t.nav.main}
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
  const t = useT();
  return (
    <>
      <nav className="hidden items-center gap-1 sm:flex">
        <NavLink to="/play/computer" className={link}>
          {t.nav.playVsComputer}
        </NavLink>
        <NavLink to="/rules" className={link}>
          {t.nav.rules}
        </NavLink>
      </nav>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <Link
          to="/login"
          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          {t.nav.signIn}
        </Link>
      </div>
    </>
  );
}

/** Rendered only when signed in, so the socket hooks never run for guests or during pre-rendering. */
function MemberNav({ user }: { user: Me }) {
  const { logout } = useAuth();
  const t = useT();
  const connected = useSocketConnected();
  return (
    <>
      <nav className="hidden flex-wrap items-center gap-1 sm:flex">
        <NavLink to="/" end className={link}>
          {t.nav.lobby}
        </NavLink>
        <NavLink to="/leaderboard" className={link}>
          {t.nav.leaderboard}
        </NavLink>
        <NavLink to="/account" className={link}>
          {t.nav.myGames}
        </NavLink>
        <NavLink to="/rules" className={link}>
          {t.nav.rules}
        </NavLink>
        {user.role === 'ADMIN' && (
          <NavLink to="/admin" className={link}>
            {t.nav.admin}
          </NavLink>
        )}
      </nav>
      <div className="ml-auto hidden items-center gap-3 sm:flex">
        <LanguageToggle />
        <ThemeToggle />
        {!connected && <span className="text-xs text-amber-700">{t.nav.reconnecting}</span>}
        <span className="flex items-center gap-2 text-sm text-slate-700">
          <Avatar user={user} size={26} />
          <span className="hidden md:inline">{user.name}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          {t.nav.signOut}
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:hidden">
        <LanguageToggle />
        <ThemeToggle />
        <AccountMenu user={user} connected={connected} onLogout={logout} />
      </div>
    </>
  );
}

/** Sun/moon button. The icon is chosen by CSS, so pre-rendered pages show the right one at once. */
function ThemeToggle() {
  const dark = useTheme() === 'dark';
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={t.nav.darkTheme}
      aria-pressed={dark}
      title={dark ? t.nav.switchToLight : t.nav.switchToDark}
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
  const t = useT();

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
        aria-label={t.nav.accountMenu(connected)}
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
              {t.nav.rating(`${user.rating}${user.provisional ? '?' : ''}`)}
              {!connected && <span className="text-amber-700"> · {t.nav.reconnecting}</span>}
            </p>
          </div>
          <Link role="menuitem" to="/rules" className={`${MENU_ITEM} text-slate-700`}>
            {t.nav.rulesStrategy}
          </Link>
          {user.role === 'ADMIN' && (
            <Link role="menuitem" to="/admin" className={`${MENU_ITEM} text-slate-700`}>
              {t.nav.adminPanel}
            </Link>
          )}
          <button role="menuitem" type="button" onClick={onLogout} className={`${MENU_ITEM} text-red-700`}>
            {t.nav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
