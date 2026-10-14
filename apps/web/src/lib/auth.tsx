import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Events, type AuthConfig, type BanInfo, type DevLoginInput, type Me } from '@cc/shared';
import { api, ApiError, setBannedHandler } from './api';
import { disconnectSocket, getSocket } from './socket';

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; user: Me }
  | { status: 'banned'; ban: BanInfo };

interface AuthContextValue {
  state: AuthState;
  config: AuthConfig | null;
  user: Me | null;
  loginWithGoogle(credential: string): Promise<void>;
  devLogin(input: DevLoginInput): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const queryClient = useQueryClient();

  const handleError = useCallback((err: unknown) => {
    // A banned response is already handled by the banned handler.
    if (!(err instanceof ApiError && err.body?.code === 'BANNED')) setState({ status: 'anon' });
  }, []);

  useEffect(() => {
    const banned = (ban: BanInfo) => {
      disconnectSocket();
      queryClient.clear();
      setState({ status: 'banned', ban });
    };
    setBannedHandler(banned);

    api<AuthConfig>('/auth/config').then(setConfig, () => setConfig({ googleClientId: null, devLogin: false }));
    api<Me>('/me').then((user) => setState({ status: 'authed', user }), handleError);
    return () => setBannedHandler(null);
  }, [handleError, queryClient]);

  // One socket per signed-in session.
  useEffect(() => {
    if (state.status !== 'authed') return;
    const socket = getSocket();
    const onBanned = (ban: BanInfo) => setState({ status: 'banned', ban });
    const onConnectError = (err: Error & { data?: BanInfo }) => {
      if (err.message === 'BANNED' && err.data) onBanned(err.data);
      else if (err.message === 'UNAUTHORIZED') setState({ status: 'anon' });
    };
    socket.on(Events.AuthBanned, onBanned);
    socket.on('connect_error', onConnectError);
    socket.connect();
    return () => {
      socket.off(Events.AuthBanned, onBanned);
      socket.off('connect_error', onConnectError);
    };
  }, [state.status]);

  const value = useMemo<AuthContextValue>(() => {
    const signedIn = (user: Me) => setState({ status: 'authed', user });
    return {
      state,
      config,
      user: state.status === 'authed' ? state.user : null,
      loginWithGoogle: (credential) => api<Me>('/auth/google', { method: 'POST', json: { credential } }).then(signedIn),
      devLogin: (input) => api<Me>('/auth/dev', { method: 'POST', json: input }).then(signedIn),
      logout: async () => {
        await api('/auth/logout', { method: 'POST' });
        disconnectSocket();
        queryClient.clear();
        setState({ status: 'anon' });
      },
    };
  }, [state, config, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For pages rendered only when signed in. */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('useMe used while signed out');
  return user;
}
