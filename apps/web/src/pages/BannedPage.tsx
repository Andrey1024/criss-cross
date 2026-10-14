import type { BanInfo } from '@cc/shared';
import { Button } from '../components/ui';
import { useAuth } from '../lib/auth';
import { banUntil } from '../lib/format';

export function BannedPage({ ban }: { ban: BanInfo }) {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-red-700">Your account is banned</h1>
        <p className="mt-2 text-sm text-slate-600">You are banned {banUntil(ban)}.</p>
        <blockquote className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-left text-sm text-slate-700">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">Reason</span>
          {ban.reason}
        </blockquote>
        <Button variant="secondary" className="mt-6" onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
