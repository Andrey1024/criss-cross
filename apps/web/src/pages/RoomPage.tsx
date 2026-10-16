import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Events, otherMark, type ChatMessageDto, type EndReason, type Mark, type PublicUser, type RoomState } from '@cc/shared';
import { Board, MarkIcon } from '../components/Board';
import { Chat } from '../components/Chat';
import { RatingBadge, RatingDiff } from '../components/RatingBadge';
import { Avatar, Badge, Button, Card, ConfirmButton, Spinner } from '../components/ui';
import { useMe } from '../lib/auth';
import { END_REASON_LABEL, errorText } from '../lib/format';
import { useNow, useOnSocketConnect, useSocketEvent } from '../lib/hooks';
import { emitAck, getSocket } from '../lib/socket';

export function RoomRoute() {
  const { id } = useParams();
  const me = useMe();
  return <RoomPage key={id} roomId={id!} me={me} />;
}

/** A live room, for a signed-in member or for a guest who joined an unrated room by link. */
export function RoomPage({ roomId, me }: { roomId: string; me: PublicUser }) {
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

  // The server sends the time left rather than a timestamp, so clock differences don't matter.
  const turnDeadline = useMemo(() => (state?.timer.msLeft == null ? null : Date.now() + state.timer.msLeft), [state]);
  const now = useNow(turnDeadline !== null, 250);
  // `now` can lag the moment the state arrived by one tick, so never show more than the server sent.
  const secondsLeft =
    turnDeadline === null
      ? null
      : Math.max(0, Math.min(Math.ceil(state!.timer.msLeft! / 1000), Math.ceil((turnDeadline - now) / 1000)));

  if (closed || joinError) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold">{closed ? 'This room was closed' : 'Room unavailable'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {closed ? `Reason: ${END_REASON_LABEL[closed]}.` : errorText(joinError!)}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
          {me.guest ? 'Go to the home page' : 'Back to the lobby'}
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
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {state.name}
              {state.unrated && <Badge>Unrated</Badge>}
              {state.status === 'PLAYING' && !state.timer.enabled && <Badge>No timer</Badge>}
            </h1>
            <p className="text-xs text-slate-500">
              {state.moveCount} moves{state.spectators > 0 && ` · ${state.spectators} watching`}
            </p>
          </div>
          <StatusLine state={state} myMark={myMark} secondsLeft={secondsLeft} />
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
        {state.status === 'PLAYING' && state.timer.proposal && <TimerProposal state={state} myMark={myMark} />}
        {state.status === 'FINISHED' && state.players.O && <Rematch state={state} myMark={myMark} />}
      </div>

      <div className="space-y-4">
        <Card title="Players">
          <div className="space-y-2">
            <PlayerRow mark="X" user={state.players.X} state={state} isMe={myMark === 'X'} secondsLeft={secondsLeft} />
            <PlayerRow mark="O" user={state.players.O} state={state} isMe={myMark === 'O'} secondsLeft={secondsLeft} />
          </div>
          {state.status === 'FINISHED' && state.rated === false && !state.unrated && (
            <p className="mt-2 text-xs text-slate-500">This game was not rated.</p>
          )}
          {state.status === 'WAITING' && state.unrated && (
            <p className="mt-3 text-xs text-slate-500">
              This room isn't listed in the lobby. Send the invite link to a friend: they can join without an account.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {state.status === 'PLAYING' && myMark && (
              <ConfirmButton size="sm" prompt="Resign this game?" confirmLabel="Resign" onConfirm={() => emitAck(Events.GameResign, { roomId })}>
                Resign
              </ConfirmButton>
            )}
            {state.status === 'PLAYING' && myMark && !state.timer.proposal && (
              <Button size="sm" variant="secondary" onClick={() => emitAck(Events.GameTimer, { roomId, agree: true })}>
                {state.timer.enabled ? 'Turn off timer' : 'Turn on timer'}
              </Button>
            )}
            {state.status === 'WAITING' && <CopyInvite />}
            {me.guest ? (
              <Link to={`/login?next=/room/${roomId}`} className="ml-auto text-sm text-slate-600 hover:text-slate-900">
                Sign in for rated games
              </Link>
            ) : (
              <Link to="/" className="ml-auto text-sm text-slate-600 hover:text-slate-900">
                ← Lobby
              </Link>
            )}
          </div>
        </Card>
        <Card title="Chat" className="flex h-[26rem] flex-col" bodyClassName="flex min-h-0 flex-1 flex-col">
          <Chat roomId={roomId} messages={messages} />
        </Card>
      </div>
    </div>
  );
}

/** After a game: offer, accept or withdraw a rematch. Spectators just see who has offered. */
function Rematch({ state, myMark }: { state: RoomState; myMark: Mark | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(offer: boolean) {
    setBusy(true);
    const res = await emitAck(Events.GameRematch, { roomId: state.id, offer });
    setBusy(false);
    setError(res.ok ? null : errorText(res.error));
  }

  if (!myMark) {
    const offered = (['X', 'O'] as const).filter((m) => state.rematch[m]);
    if (offered.length === 0) return null;
    return <p className="text-sm text-slate-600">{state.players[offered[0]]?.name} has offered a rematch.</p>;
  }

  const opponentMark = otherMark(myMark);
  const opponent = state.players[opponentMark]!;
  const iOffered = state.rematch[myMark];
  const theyOffered = state.rematch[opponentMark];
  const opponentHere = state.connected[opponentMark];

  let message: string;
  let action: ReactNode;
  if (!opponentHere) {
    message = `${opponent.name} has left the room.`;
    action = (
      <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
        {myMark && state.players[myMark]?.guest ? 'Go to the home page' : 'Find a new game'}
      </Link>
    );
  } else if (iOffered) {
    message = `Waiting for ${opponent.name} to accept…`;
    action = (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => send(false)}>
        Cancel
      </Button>
    );
  } else if (theyOffered) {
    message = `${opponent.name} wants a rematch.`;
    action = (
      <Button size="sm" disabled={busy} onClick={() => send(true)}>
        Accept rematch
      </Button>
    );
  } else {
    message = 'Play again in this room?';
    action = (
      <Button size="sm" disabled={busy} onClick={() => send(true)}>
        Rematch
      </Button>
    );
  }

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 ${
        theyOffered && !iOffered && opponentHere ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{message}</p>
        {opponentHere && (
          <p className="text-xs text-slate-500">
            Colours swap: you'll play {opponentMark}
            {opponentMark === 'X' ? ' and move first' : ''}.
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {action}
    </div>
  );
}

/** Asks the opponent to switch the move timer on or off; spectators just see the request. */
function TimerProposal({ state, myMark }: { state: RoomState; myMark: Mark | null }) {
  const [busy, setBusy] = useState(false);
  const proposer = state.timer.proposal!;
  const what = state.timer.enabled ? 'turn off the move timer' : 'turn the move timer back on';

  async function vote(agree: boolean) {
    setBusy(true);
    await emitAck(Events.GameTimer, { roomId: state.id, agree });
    setBusy(false);
  }

  if (!myMark) return <p className="text-sm text-slate-600">{state.players[proposer]?.name} wants to {what}.</p>;
  const mine = proposer === myMark;
  const opponent = state.players[otherMark(myMark)]!;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 ${
        mine ? 'border-slate-200 bg-white' : 'border-emerald-300 bg-emerald-50'
      }`}
    >
      <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">
        {mine ? `Waiting for ${opponent.name} to agree…` : `${opponent.name} wants to ${what}.`}
      </p>
      {mine ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => vote(false)}>
          Cancel
        </Button>
      ) : (
        <span className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => vote(false)}>
            Decline
          </Button>
          <Button size="sm" disabled={busy} onClick={() => vote(true)}>
            Accept
          </Button>
        </span>
      )}
    </div>
  );
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function StatusLine({ state, myMark, secondsLeft }: { state: RoomState; myMark: Mark | null; secondsLeft: number | null }) {
  if (state.status === 'WAITING') return <Badge tone="amber">Waiting for an opponent…</Badge>;
  if (state.status === 'PLAYING') {
    const time = secondsLeft === null ? '' : ` · ${clock(secondsLeft)}`;
    if (!myMark) return <Badge tone="blue">{state.players[state.turn]?.name}'s turn{time}</Badge>;
    if (state.turn !== myMark) return <Badge>Opponent's turn{time}</Badge>;
    // Your own clock warns as it runs low.
    const tone = secondsLeft === null || secondsLeft > 10 ? 'green' : secondsLeft > 5 ? 'amber' : 'red';
    return <Badge tone={tone}>Your turn{time}</Badge>;
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

function PlayerRow({
  mark,
  user,
  state,
  isMe,
  secondsLeft,
}: {
  mark: Mark;
  user: PublicUser | null;
  state: RoomState;
  isMe: boolean;
  secondsLeft: number | null;
}) {
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
              {user.name} {isMe && <span className="font-normal text-slate-400">(you)</span>}{' '}
              {user.guest && <span className="font-normal text-slate-400">· guest</span>}{' '}
              {!state.unrated && state.ratings[mark] && (
                <RatingBadge rating={state.ratings[mark]!} className="font-normal text-slate-500" />
              )}
              {state.ratingChange && <RatingDiff diff={state.ratingChange[mark]} className="ml-1 text-xs" />}
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
              {active && secondsLeft !== null && ` · ${clock(secondsLeft)} left`}
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
