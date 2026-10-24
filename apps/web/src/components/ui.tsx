import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { PublicUser } from '@cc/shared';
import { useT } from '../i18n';

const BUTTON_VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/** Two-step button: the first click asks for confirmation inline. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel,
  prompt,
  variant = 'danger',
  size = 'md',
  disabled,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  prompt?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const t = useT();
  if (!asking) {
    return (
      <Button variant={variant === 'danger' ? 'secondary' : variant} size={size} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-600">{prompt ?? t.common.areYouSure}</span>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel ?? t.common.confirm}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)}>
        {t.common.cancel}
      </Button>
    </span>
  );
}

export function Avatar({ user, size = 32 }: { user: Pick<PublicUser, 'name' | 'avatarUrl'>; size?: number }) {
  const style = { width: size, height: size };
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={style} className="shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600"
      aria-hidden
    >
      {initials}
    </span>
  );
}

const BADGE_TONES = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
} as const;

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>;
}

export function Card({
  title,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Spinner({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      {label ?? t.common.loading}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm text-slate-600">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t.common.previous}
      </Button>
      <span>{t.common.pageOf(page, pages)}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t.common.next}
      </Button>
    </div>
  );
}

export const inputClass =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200';
