import { useState, type FormEvent } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { MarkIcon } from '../components/Board';
import { Button, ErrorNote, inputClass } from '../components/ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { Link, useLang, useT } from '../i18n';

export function LoginPage() {
  const { config, loginWithGoogle, devLogin } = useAuth();
  const theme = useTheme();
  const t = useT();
  const lang = useLang();
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
          <h1 className="text-xl font-bold">{t.login.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>
        </div>

        {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

        {config?.googleClientId ? (
          // Google's button is an iframe with a light colour scheme. Under the dark theme the
          // browser would paint an opaque white box behind it unless the schemes match.
          <div className="flex justify-center [color-scheme:light]">
            <GoogleOAuthProvider clientId={config.googleClientId}>
              <GoogleLogin
                key={`${theme}-${lang}`}
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
                locale={lang}
                onSuccess={(r) => r.credential && handle(loginWithGoogle(r.credential))}
                onError={() => setError(t.login.googleFailed)}
              />
            </GoogleOAuthProvider>
          </div>
        ) : (
          config && !config.devLogin && <ErrorNote>{t.login.googleMissing}</ErrorNote>
        )}

        {config?.devLogin && (
          <form onSubmit={submitDev} className="mt-6 space-y-2 border-t border-dashed border-slate-200 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{t.login.devTitle}</p>
            <input className={`${inputClass} w-full`} type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t.login.email} />
            <input className={`${inputClass} w-full`} placeholder={t.login.displayNameOptional} value={name} onChange={(e) => setName(e.target.value)} aria-label={t.login.displayName} />
            <Button type="submit" variant="secondary" className="w-full">
              {t.login.devSubmit}
            </Button>
          </form>
        )}

        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          {t.login.tryIt}{' '}
          <Link to="/play/computer" className="font-medium text-blue-700 hover:underline">
            {t.login.playWithoutAccount}
          </Link>
          <br />
          <Link to="/" className="mt-2 inline-block hover:text-slate-800">
            {t.login.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
