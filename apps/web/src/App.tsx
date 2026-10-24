import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate as useRouterNavigate, useSearchParams } from 'react-router';
import type { Me } from '@cc/shared';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import {
  DEFAULT_LANG,
  LANGS,
  LangProvider,
  LOCALE,
  langFromPath,
  localizePath,
  Navigate,
  savedLang,
  setCurrentLang,
  stripLang,
} from './i18n';
import { useAuth } from './lib/auth';
import { BannedPage } from './pages/BannedPage';
import { ComputerPage } from './pages/ComputerPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { RulesPage } from './pages/RulesPage';

// Everything except the public pages is loaded on demand, keeping the landing page light.
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const ReplayPage = lazy(() => import('./pages/ReplayPage').then((m) => ({ default: m.ReplayPage })));
const GuestRoomRoute = lazy(() => import('./pages/GuestRoomPage').then((m) => ({ default: m.GuestRoomRoute })));
const RoomRoute = lazy(() => import('./pages/RoomPage').then((m) => ({ default: m.RoomRoute })));
const LobbyPage = lazy(() => import('./pages/LobbyPage').then((m) => ({ default: m.LobbyPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

/** The language comes from the URL: English at the root, others under their prefix (/ru…). */
export function App() {
  const { pathname, search } = useLocation();
  const navigate = useRouterNavigate();
  const lang = langFromPath(pathname);
  setCurrentLang(lang);

  useEffect(() => {
    document.documentElement.lang = LOCALE[lang];
    // A visitor who picked a language with the switcher keeps it when a link leads elsewhere.
    const saved = savedLang();
    if (saved && saved !== lang) navigate(localizePath(stripLang(pathname) + search, saved), { replace: true });
    // Only when the language changes, not on every navigation within it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <LangProvider value={lang}>
      <AppRoutes />
    </LangProvider>
  );
}

function AppRoutes() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'banned') return <BannedPage ban={state.ban} />;
  const user = state.status === 'authed' ? state.user : null;

  return (
    <Routes>
      {LANGS.map((l) => (
        <Route key={l} path={l === DEFAULT_LANG ? '/' : `/${l}`}>
          {routes(user)}
        </Route>
      ))}
    </Routes>
  );
}

/** The site's routes, mounted once per language. */
function routes(user: Me | null) {
  return (
    <>
      {/* Signed in: /login just forwards to where the visitor was heading. */}
      <Route
        path="login"
        element={
          user ? (
            <AfterLogin />
          ) : (
            <Suspense fallback={<Spinner />}>
              <LoginPage />
            </Suspense>
          )
        }
      />
      <Route element={<Layout />}>
        <Route index element={user ? <LobbyPage /> : <LandingPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="play/computer" element={<ComputerPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        {user ? (
          <>
            <Route path="room/:id" element={<RoomRoute />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="games/:id" element={<ReplayPage />} />
            {user.role === 'ADMIN' && <Route path="admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {/* Unrated rooms can be joined by link without an account. */}
            <Route path="room/:id" element={<GuestRoomRoute />} />
            <Route path="*" element={<RedirectToLogin />} />
          </>
        )}
      </Route>
    </>
  );
}

function RedirectToLogin() {
  const { pathname, search } = useLocation();
  return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}

function AfterLogin() {
  const [params] = useSearchParams();
  const next = params.get('next');
  // Only same-site paths, never an external URL.
  return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />;
}
