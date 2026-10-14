import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Events, type ChatMessageDto, type EndReason, type Mark, type PublicUser, type RoomState } from '@cc/shared';
import { Board, MarkIcon } from '../components/Board';
import { Chat } from '../components/Chat';
import { Avatar, Badge, Button, Card, ConfirmButton, Spinner } from '../components/ui';
import { useMe } from '../lib/auth';
import { END_REASON_LABEL, errorText } from '../lib/format';
import { useNow, useOnSocketConnect, useSocketEvent } from '../lib/hooks';
import { emitAck, getSocket } from '../lib/socket';

export function RoomRoute() {
  const { id } = useParams();
  return <RoomPage key={id} roomId={id!} />;
}

function RoomPage({ roomId }: { roomId: string }) {
  const me = useMe();
  const [state, setState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [closed, setClosed] = useState<EndReason | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useSocketEvent<RoomState>(Events.RoomState, (s) => s.id === roomId && setState(s));
  useSocketEvent<ChatMessageDto[]>(Events.ChatHistory, (msgs) => setMessages(msgs.filter((m) => m.roomId === roomId)));
  useSocketEvent<ChatMessageDto>(Events.ChatMessage, (m) => m.roomId === roomId && setMessages((prev) => [...prev, m]));
  useSocketEvent<{ id: string }>(Events.ChatDeleted, ({ id }) => setMessages((prev) => prev.filter((m) => m.id !== id)));
  useSocketEvent<{ reason: EndReason }>(Events.RoomClosed, ({ reason }) => setClosed(reason));
  // (Re)join on every connect, so a dropped connection resumes the game.
  useOnSocketConnect(() => {
    emitAck<RoomState>(Events.RoomJoin, { roomId }).then((res) => {
      if (res.ok) setState(res.data);
      else setJoinError(res.error);
    });
  });
  useEffect(() => () => void getSocket().emit(Events.RoomLeave), []);

  if (closed || joinError) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold">{closed ? 'This room was closed' : 'Room unavailable'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {closed ? `Reason: ${END_REASON_LABEL[closed]}.` : errorText(joinError!)}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
          Back to the lobby
        </Link>
      </Card>
    );
  }
  if (!state) return <Spinner label="Joining room…" />;

  const myMark: Mark | null = state.players.X.id === me.id ? 'X' : state.players.O?.id === me.id ? 'O' : null;
  const myTurn = state.status === 'PLAYING' && myMark === state.turn;

  async function move(x: number, y: number) {
    const res = await emitAck(Events.GameMove, { roomId, x, y });
    setMoveError(res.ok ? null : errorText(res.error));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(18rem,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{state.name}</h1>
            <p className="text-xs text-slate-500">
              {state.moveCount} moves{state.spectators > 0 && ` · ${state.spectators} watching`}
            </p>
          </div>
          <StatusLine state={state} myMark={myMark} />
        </div>
        <div className="overflow-x-auto">
          <Board
            board={state.board}
            lastMove={state.lastMove}
            winLine={state.winLine}
            playable={myTurn ? myMark : null}
            onMove={move}
          />
        </div>
        {moveError && <p className="text-sm text-red-600">{moveError}</p>}
      </div>

      <div className="space-y-4">
        <Card title="Players">
          <div className="space-y-2">
            <PlayerRow mark="X" user={state.players.X} state={state} isMe={myMark === 'X'} />
            <PlayerRow mark="O" user={state.players.O} state={state} isMe={myMark === 'O'} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {state.status === 'PLAYING' && myMark && (
              <ConfirmButton size="sm" prompt="Resign this game?" confirmLabel="Resign" onConfirm={() => emitAck(Events.GameResign, { roomId })}>
                Resign
              </ConfirmButton>
            )}
            {state.status === 'WAITING' && <CopyInvite />}
            <Link to="/" className="ml-auto text-sm text-slate-600 hover:text-slate-900">
              ← Lobby
            </Link>
          </div>
        </Card>
        <Card title="Chat" className="flex h-[26rem] flex-col" bodyClassName="flex min-h-0 flex-1 flex-col">
          <Chat roomId={roomId} messages={messages} />
        </Card>
      </div>
    </div>
  );
}

function StatusLine({ state, myMark }: { state: RoomState; myMark: Mark | null }) {
  if (state.status === 'WAITING') return <Badge tone="amber">Waiting for an opponent…</Badge>;
  if (state.status === 'PLAYING') {
    const turnName = state.players[state.turn]?.name;
    if (!myMark) return <Badge tone="blue">{turnName}'s turn</Badge>;
    return state.turn === myMark ? <Badge tone="green">Your turn</Badge> : <Badge>Opponent's turn</Badge>;
  }
  const how = state.endReason ? END_REASON_LABEL[state.endReason] : '';
  if (!state.winner) return <Badge>Game over — {how}</Badge>;
  if (myMark) {
    return state.winner === myMark ? (
      <Badge tone="green">You won — {how}!</Badge>
    ) : (
      <Badge tone="red">You lost — {how}</Badge>
    );
  }
  return <Badge tone="blue">{state.players[state.winner]?.name} won — {how}</Badge>;
}

function PlayerRow({ mark, user, state, isMe }: { mark: Mark; user: PublicUser | null; state: RoomState; isMe: boolean }) {
  const deadline = state.awayDeadline[mark];
  const now = useNow(deadline !== null);
  const active = state.status === 'PLAYING' && state.turn === mark;
  const won = state.status === 'FINISHED' && state.winner === mark;

  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2 ${active ? 'border-slate-400 bg-slate-50' : 'border-slate-100'}`}>
      <MarkIcon mark={mark} className="h-5 w-5 shrink-0" />
      {user ? (
        <>
          <Avatar user={user} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user.name} {isMe && <span className="font-normal text-slate-400">(you)</span>}
            </p>
            <p className="text-xs text-slate-500">
              {deadline !== null ? (
                <span className="text-amber-700">
                  Disconnected — {state.status === 'WAITING' ? 'room closes' : 'forfeits'} in {Math.max(0, Math.ceil((deadline - now) / 1000))}s
                </span>
              ) : state.connected[mark] ? (
                'Online'
              ) : (
                'Offline'
              )}
            </p>
          </div>
          {won && <Badge tone="green">Winner</Badge>}
          <span className={`h-2 w-2 rounded-full ${state.connected[mark] ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
        </>
      ) : (
        <p className="text-sm text-slate-400">Empty seat — waiting for someone to join</p>
      )}
    </div>
  );
}

function CopyInvite() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? 'Link copied' : 'Copy invite link'}
    </Button>
  );
}
