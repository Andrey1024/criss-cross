import type { BanInfo } from '@cc/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: any,
  ) {
    super(typeof body?.message === 'string' ? body.message : `Request failed (${status})`);
  }
}

let onBanned: ((ban: BanInfo) => void) | null = null;
/** Any request rejected because the user is banned switches the app to the banned screen. */
export function setBannedHandler(handler: typeof onBanned) {
  onBanned = handler;
}

export async function api<T>(path: string, init: Omit<RequestInit, 'body'> & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 403 && data?.code === 'BANNED') onBanned?.({ reason: data.reason, expiresAt: data.expiresAt });
    throw new ApiError(res.status, data);
  }
  return data as T;
}
