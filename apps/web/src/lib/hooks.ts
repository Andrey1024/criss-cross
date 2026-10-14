import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

/** Subscribes to a socket event for the lifetime of the component. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const socket = getSocket();
    const listener = (payload: T) => ref.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/** Runs `onConnect` now (if connected) and after every reconnect. */
export function useOnSocketConnect(onConnect: () => void) {
  const ref = useRef(onConnect);
  ref.current = onConnect;
  useEffect(() => {
    const socket = getSocket();
    const listener = () => ref.current();
    if (socket.connected) listener();
    socket.on('connect', listener);
    return () => {
      socket.off('connect', listener);
    };
  }, []);
}

export function useSocketConnected(): boolean {
  const [connected, setConnected] = useState(() => getSocket().connected);
  useSocketEvent('connect', () => setConnected(true));
  useSocketEvent('disconnect', () => setConnected(false));
  return connected;
}

/** Re-renders every `ms` while `active`; returns the current time. */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
