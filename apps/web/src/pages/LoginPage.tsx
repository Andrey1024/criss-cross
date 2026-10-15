import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { MarkIcon } from '../components/Board';
import { Button, ErrorNote, inputClass } from '../components/ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { config, loginWithGoogle, devLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handle = (p: Promise<void>) =>
    p.catch((err) => {
      if (!(err instanceof ApiError && err.body?.code === 'BANNED')) setError(err.message);
    });

  function submitDev(e: FormEvent) {
    e.preventDefault();
    handle(devLogin({ email, name: name || email.split('@')[0] }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid grid-cols-3 gap-px rounded border border-slate-300 bg-slate-200 p-px">
            {(['X', 'O', 'X', null, 'X', 'O', 'O', null, 'X'] as const).map((m, i) => (
              <span key={i} className="flex h-7 w-7 items-center justify-center bg-white p-1">
                {m && <MarkIcon mark={m} className="h-full w-full" />}
              </span>
            ))}
          </div>
          <h1 className="text-xl font-bold">Sign in to Criss-Cross</h1>
          <p className="mt-1 text-sm text-slate-500">Five in a row, online. Sign in to play.</p>
        </div>

        {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

        {config?.googleClientId ? (
          <div className="flex justify-center">
            <GoogleOAuthProvider clientId={config.googleClientId}>
              <GoogleLogin
                onSuccess={(r) => r.credential && handle(loginWithGoogle(r.credential))}
                onError={() => setError('Google sign-in failed')}
              />
            </GoogleOAuthProvider>
          </div>
        ) : (
          config && !config.devLogin && <ErrorNote>Google sign-in is not configured on the server (GOOGLE_CLIENT_ID).</ErrorNote>
        )}

        {config?.devLogin && (
          <form onSubmit={submitDev} className="mt-6 space-y-2 border-t border-dashed border-slate-200 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Dev login (DEV_LOGIN=true)</p>
            <input className={`${inputClass} w-full`} type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <input className={`${inputClass} w-full`} placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
            <Button type="submit" variant="secondary" className="w-full">
              Sign in without Google
            </Button>
          </form>
        )}

        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Just want to try it?{' '}
          <Link to="/play/computer" className="font-medium text-blue-700 hover:underline">
            Play the computer without an account
          </Link>
          <br />
          <Link to="/" className="mt-2 inline-block hover:text-slate-800">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
