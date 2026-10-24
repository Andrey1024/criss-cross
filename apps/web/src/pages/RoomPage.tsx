import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Events, otherMark, type ChatMessageDto, type EndReason, type Mark, type PublicUser, type RoomState } from '@cc/shared';
import { Board, MarkIcon } from '../components/Board';
import { Chat } from '../components/Chat';
import { RatingBadge, RatingDiff } from '../components/RatingBadge';
import { Avatar, Badge, Button, Card, ConfirmButton, Spinner } from '../components/ui';
import { useMe } from '../lib/auth';
import { Link, useT } from '../i18n';
import { endReasonLabel, errorText } from '../lib/format';
import { useNow, useOnSocketConnect, useSocketEvent } from '../lib/hooks';
import { emitAck, getSocket } from '../lib/socket';

export function RoomRoute() {
  const { id } = useParams();
  const me = useMe();
  return <RoomPage key={id} roomId={id!} me={me} />;
}

/** A live room, for a signed-in member or for a guest who joined an unrated room by link. */
export function RoomPage({ roomId, me }: { roomId: string; me: PublicUser }) {
  const t = useT();
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
        <h1 className="text-lg font-semibold">{closed ? t.room.closedTitle : t.room.unavailable}</h1>
        <p className="mt-1 text-sm text-slate-500">{closed ? t.room.reason(endReasonLabel(closed)) : errorText(joinError!)}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
          {me.guest ? t.common.homePage : t.room.backLobby}
        </Link>
      </Card>
    );
  }
  if (!state) return <Spinner label={t.room.joining} />;

  const myMark: Mark | null = state.players.X.id === me.id ? 'X' : state.players.O?.id === me.id ? 'O' : null;
  const myTurn = state.status === 'PLAYING' && myMark === state.turn;

  async function move(x: number, y: number) {
    const res = await emitAck(Events.GameMove, { roomId, x, y });
    setMoveError(res.ok ? null : errorText(res.error));
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_minmax(18rem,1fr)]">
      <div className="space-y-3">
        {/* One line that never wraps, so the board doesn't jump as the status text changes. */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <span className="truncate">{state.name}</span>
              {state.unrated && <span className="shrink-0"><Badge>{t.room.unrated}</Badge></span>}
              {state.status === 'PLAYING' && !state.timer.enabled && <span className="shrink-0"><Badge>{t.room.noTimer}</Badge></span>}
            </h1>
            <p className="truncate text-xs text-slate-500">
              {t.common.moves(state.moveCount)}
              {state.spectators > 0 && t.room.watching(state.spectators)}
              {state.status === 'FINISHED' && state.endReason && (
                <span className="sm:hidden"> · {endReasonLabel(state.endReason)}</span>
              )}
            </p>
          </div>
          <div className="shrink-0">
            <StatusLine state={state} myMark={myMark} secondsLeft={secondsLeft} />
          </div>
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
        <Card title={t.room.players}>
          <div className="space-y-2">
            <PlayerRow mark="X" user={state.players.X} state={state} isMe={myMark === 'X'} secondsLeft={secondsLeft} />
            <PlayerRow mark="O" user={state.players.O} state={state} isMe={myMark === 'O'} secondsLeft={secondsLeft} />
          </div>
          {state.status === 'FINISHED' && state.rated === false && !state.unrated && (
            <p className="mt-2 text-xs text-slate-500">{t.room.notRated}</p>
          )}
          {state.status === 'WAITING' && state.unrated && (
            <p className="mt-3 text-xs text-slate-500">{t.room.unratedHint}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {state.status === 'PLAYING' && myMark && (
              <ConfirmButton size="sm" prompt={t.room.resignPrompt} confirmLabel={t.room.resign} onConfirm={() => emitAck(Events.GameResign, { roomId })}>
                {t.room.resign}
              </ConfirmButton>
            )}
            {state.status === 'PLAYING' && myMark && !state.timer.proposal && (
              <Button size="sm" variant="secondary" onClick={() => emitAck(Events.GameTimer, { roomId, agree: true })}>
                {state.timer.enabled ? t.room.timerOff : t.room.timerOn}
              </Button>
            )}
            {state.status === 'WAITING' && <CopyInvite />}
            {me.guest ? (
              <Link to={`/login?next=/room/${roomId}`} className="ml-auto text-sm text-slate-600 hover:text-slate-900">
                {t.room.signInRated}
              </Link>
            ) : (
              <Link to="/" className="ml-auto text-sm text-slate-600 hover:text-slate-900">
                {t.room.backLobbyShort}
              </Link>
            )}
          </div>
        </Card>
        <Card title={t.room.chat} className="flex h-[26rem] flex-col" bodyClassName="flex min-h-0 flex-1 flex-col">
          <Chat roomId={roomId} messages={messages} />
        </Card>
      </div>
    </div>
  );
}

/** After a game: offer, accept or withdraw a rematch. Spectators just see who has offered. */
function Rematch({ state, myMark }: { state: RoomState; myMark: Mark | null }) {
  const t = useT();
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
    return <p className="text-sm text-slate-600">{t.room.rematchOffered(state.players[offered[0]]?.name ?? '')}</p>;
  }

  const opponentMark = otherMark(myMark);
  const opponent = state.players[opponentMark]!;
  const iOffered = state.rematch[myMark];
  const theyOffered = state.rematch[opponentMark];
  const opponentHere = state.connected[opponentMark];

  let message: string;
  let action: ReactNode;
  if (!opponentHere) {
    message = t.room.opponentLeft(opponent.name);
    action = (
      <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
        {myMark && state.players[myMark]?.guest ? t.common.homePage : t.room.findNewGame}
      </Link>
    );
  } else if (iOffered) {
    message = t.room.waitingAccept(opponent.name);
    action = (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => send(false)}>
        {t.common.cancel}
      </Button>
    );
  } else if (theyOffered) {
    message = t.room.wantsRematch(opponent.name);
    action = (
      <Button size="sm" disabled={busy} onClick={() => send(true)}>
        {t.room.acceptRematch}
      </Button>
    );
  } else {
    message = t.room.playAgain;
    action = (
      <Button size="sm" disabled={busy} onClick={() => send(true)}>
        {t.room.rematch}
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
          <p className="text-xs text-slate-500">{t.room.coloursSwap(opponentMark, opponentMark === 'X')}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {action}
    </div>
  );
}

/** Asks the opponent to switch the move timer on or off; spectators just see the request. */
function TimerProposal({ state, myMark }: { state: RoomState; myMark: Mark | null }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const proposer = state.timer.proposal!;
  const what = state.timer.enabled ? t.room.timerWhatOff : t.room.timerWhatOn;

  async function vote(agree: boolean) {
    setBusy(true);
    await emitAck(Events.GameTimer, { roomId: state.id, agree });
    setBusy(false);
  }

  if (!myMark) return <p className="text-sm text-slate-600">{t.room.wantsTo(state.players[proposer]?.name ?? '', what)}</p>;
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
        {mine ? t.room.waitingAgree(opponent.name) : t.room.wantsTo(opponent.name, what)}
      </p>
      {mine ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => vote(false)}>
          {t.common.cancel}
        </Button>
      ) : (
        <span className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => vote(false)}>
            {t.common.decline}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => vote(true)}>
            {t.common.accept}
          </Button>
        </span>
      )}
    </div>
  );
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function StatusLine({ state, myMark, secondsLeft }: { state: RoomState; myMark: Mark | null; secondsLeft: number | null }) {
  const t = useT();
  if (state.status === 'WAITING') return <Badge tone="amber">{t.room.waitingOpponent}</Badge>;
  if (state.status === 'PLAYING') {
    const time = secondsLeft === null ? '' : ` · ${clock(secondsLeft)}`;
    if (!myMark) {
      return (
        <Badge tone="blue">
          {t.room.turnOf.before}
          <ShortName name={state.players[state.turn]?.name} />
          {t.room.turnOf.after}
          {time}
        </Badge>
      );
    }
    if (state.turn !== myMark) return <Badge>{t.room.opponentsTurn}{time}</Badge>;
    // Your own clock warns as it runs low.
    const tone = secondsLeft === null || secondsLeft > 10 ? 'green' : secondsLeft > 5 ? 'amber' : 'red';
    return <Badge tone={tone}>{t.room.yourTurn}{time}</Badge>;
  }
  // On phones the reason is shown under the room name instead, keeping the badge short.
  const reason = state.endReason && <span className="hidden sm:inline"> — {endReasonLabel(state.endReason)}</span>;
  if (!state.winner) return <Badge>{t.room.gameOver}{reason}</Badge>;
  if (myMark) {
    return state.winner === myMark ? (
      <Badge tone="green">
        {t.room.youWon}
        {reason}
        {t.room.exclamation}
      </Badge>
    ) : (
      <Badge tone="red">
        {t.room.youLost}
        {reason}
      </Badge>
    );
  }
  return (
    <Badge tone="blue">
      <ShortName name={state.players[state.winner]?.name} />
      {t.room.won}
      {reason}
    </Badge>
  );
}

/** A player's name cut short, so a long name can't push the status badge off a phone screen. */
function ShortName({ name }: { name?: string }) {
  return <span className="max-w-[8rem] truncate">{name}</span>;
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
  const t = useT();
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
              {user.name} {isMe && <span className="font-normal text-slate-400">{t.common.you}</span>}{' '}
              {user.guest && <span className="font-normal text-slate-400">{t.common.guest}</span>}{' '}
              {!state.unrated && state.ratings[mark] && (
                <RatingBadge rating={state.ratings[mark]!} className="font-normal text-slate-500" />
              )}
              {state.ratingChange && <RatingDiff diff={state.ratingChange[mark]} className="ml-1 text-xs" />}
            </p>
            <p className="text-xs text-slate-500">
              {deadline !== null ? (
                <span className="text-amber-700">
                  {t.room.disconnected(state.status === 'WAITING', Math.max(0, Math.ceil((deadline - now) / 1000)))}
                </span>
              ) : state.connected[mark] ? (
                t.room.online
              ) : (
                t.room.offline
              )}
              {active && secondsLeft !== null && t.room.timeLeft(clock(secondsLeft))}
            </p>
          </div>
          {won && <Badge tone="green">{t.common.winner}</Badge>}
          <span className={`h-2 w-2 rounded-full ${state.connected[mark] ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
        </>
      ) : (
        <p className="text-sm text-slate-400">{t.room.emptySeat}</p>
      )}
    </div>
  );
}

function CopyInvite() {
  const t = useT();
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
      {copied ? t.room.linkCopied : t.room.copyInvite}
    </Button>
  );
}
