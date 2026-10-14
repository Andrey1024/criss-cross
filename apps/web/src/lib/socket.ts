import { io, type Socket } from 'socket.io-client';
import type { Ack } from '@cc/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  socket ??= io({ withCredentials: true, autoConnect: false });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Emits an event and resolves with the server's acknowledgement. */
export function emitAck<T = undefined>(event: string, payload?: unknown): Promise<Ack<T>> {
  return getSocket()
    .timeout(10_000)
    .emitWithAck(event, payload)
    .catch(() => ({ ok: false, error: 'TIMEOUT' }) as Ack<T>);
}
