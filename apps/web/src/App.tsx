import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { BannedPage } from './pages/BannedPage';
import { LobbyPage } from './pages/LobbyPage';
import { LoginPage } from './pages/LoginPage';
import { ReplayPage } from './pages/ReplayPage';
import { RoomRoute } from './pages/RoomPage';

export function App() {
  const { state } = useAuth();
  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'banned') return <BannedPage ban={state.ban} />;
  if (state.status === 'anon') return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LobbyPage />} />
        <Route path="room/:id" element={<RoomRoute />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="games/:id" element={<ReplayPage />} />
        {state.user.role === 'ADMIN' && <Route path="admin" element={<AdminPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
