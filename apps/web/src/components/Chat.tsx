import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CHAT_MAX_LENGTH, Events, type ChatMessageDto } from '@cc/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errorText, formatTime } from '../lib/format';
import { emitAck } from '../lib/socket';
import { Avatar, Button, inputClass } from './ui';

export function Chat({ roomId, messages, disabled }: { roomId: string; messages: ChatMessageDto[]; disabled?: boolean }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const res = await emitAck(Events.ChatSend, { roomId, text: trimmed });
    setSending(false);
    if (res.ok) {
      setText('');
      setError(null);
    } else setError(errorText(res.error));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No messages yet. Say hi!</p>}
        {messages.map((m) => (
          <div key={m.id} className="group flex gap-2">
            <Avatar user={m.user} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`truncate text-xs font-semibold ${m.user.id === user?.id ? 'text-blue-700' : 'text-slate-800'}`}>
                  {m.user.name}
                </span>
                <span className="text-[11px] text-slate-400">{formatTime(m.createdAt)}</span>
                {user?.role === 'ADMIN' && (
                  <button
                    className="ml-auto hidden text-[11px] text-red-600 hover:underline group-hover:inline"
                    onClick={() => api(`/admin/messages/${m.id}`, { method: 'DELETE' })}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          placeholder={disabled ? 'Chat is unavailable' : 'Write a message…'}
          disabled={disabled}
          aria-label="Chat message"
        />
        <Button type="submit" disabled={disabled || sending || !text.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
