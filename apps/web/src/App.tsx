import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { BannedPage } from './pages/BannedPage';
import { ComputerPage } from './pages/ComputerPage';
import { LandingPage } from './pages/LandingPage';
import { RulesPage } from './pages/RulesPage';

// Everything except the public pages is loaded on demand, keeping the landing page light.
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const ReplayPage = lazy(() => import('./pages/ReplayPage').then((m) => ({ default: m.ReplayPage })));
const RoomRoute = lazy(() => import('./pages/RoomPage').then((m) => ({ default: m.RoomRoute })));
const LobbyPage = lazy(() => import('./pages/LobbyPage').then((m) => ({ default: m.LobbyPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

export function App() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'banned') return <BannedPage ban={state.ban} />;
  const user = state.status === 'authed' ? state.user : null;

  return (
    <Routes>
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
          <Route path="*" element={<RedirectToLogin />} />
        )}
      </Route>
    </Routes>
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
