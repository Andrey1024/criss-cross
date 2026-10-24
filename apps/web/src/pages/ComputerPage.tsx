import { useEffect, useMemo, useState } from 'react';
import {
  AI_LEVELS,
  boardFromMoves,
  findWinLine,
  isBoardFull,
  otherMark,
  type AiLevel,
  type Mark,
  type PlayedMove,
} from '@cc/shared';
import { Board, MarkIcon } from '../components/Board';
import { Avatar, Badge, Button, Card } from '../components/ui';
import { useAuth } from '../lib/auth';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useLang, useT } from '../i18n';
import { pageMeta } from '../seo';
import { useAiWorker } from '../lib/useAiWorker';
import { RAPFI_DIR, useRapfi, type RapfiStatus } from '../lib/rapfi';

/** Easy to Hard are our own engine; Expert is Rapfi, loaded on demand. */
type Level = AiLevel | 'expert';
const LEVELS: readonly Level[] = [...AI_LEVELS, 'expert'];

/** Keeps instant replies from feeling abrupt. */
const MIN_THINK_MS = 350;
const SETTINGS_KEY = 'cc.computer.settings';

interface Settings {
  level: Level;
  mark: Mark;
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return { level: 'medium', mark: 'X' }; // pre-rendering
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (LEVELS.includes(saved?.level) && (saved?.mark === 'X' || saved?.mark === 'O')) return saved;
  } catch {
    // Storage unavailable or corrupt: fall back to defaults.
  }
  return { level: 'medium', mark: 'X' };
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not important if it can't be remembered.
  }
}

/** A game against the computer. Runs entirely in the browser and is not saved anywhere. */
export function ComputerPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [playing, setPlaying] = useState(false);
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const think = useAiWorker();
  // Expert's download starts as soon as it is picked, so it is usually ready by Start.
  const rapfi = useRapfi(settings.level === 'expert');
  const { user } = useAuth();
  const t = useT();
  usePageTitle(pageMeta('/play/computer', useLang()).title);

  const myMark = settings.mark;
  const aiMark = otherMark(myMark);
  const { board, last, winLine, winner, draw, turn } = useMemo(() => {
    const board = boardFromMoves(moves);
    const last = moves.at(-1) ?? null;
    const winLine = last ? findWinLine(board, last.x, last.y) : null;
    return {
      board,
      last,
      winLine,
      winner: winLine ? last!.mark : null,
      draw: !winLine && isBoardFull(board),
      turn: (moves.length % 2 === 0 ? 'X' : 'O') as Mark,
    };
  }, [moves]);
  const over = !!winner || draw;
  const thinking = playing && !over && turn === aiMark;

  useEffect(() => {
    if (!thinking) return;
    let cancelled = false;
    const started = Date.now();
    const level = settings.level;
    (level === 'expert' ? rapfi.think(moves, aiMark) : think(board, aiMark, level))
      .then(async (move) => {
        const wait = MIN_THINK_MS - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (!cancelled && move) setMoves((prev) => [...prev, { ...move, mark: aiMark }]);
      })
      .catch(() => {
        // The worker was replaced (e.g. on unmount); a fresh request follows if still needed.
      });
    return () => {
      cancelled = true;
    };
  }, [thinking, board, moves, aiMark, settings.level, think, rapfi.think]);

  function start() {
    saveSettings(settings);
    setMoves([]);
    setPlaying(true);
  }

  function move(x: number, y: number) {
    if (thinking || over || board[y][x]) return;
    setMoves((prev) => [...prev, { x, y, mark: myMark }]);
  }

  /** Takes back the player's last move together with the computer's reply. */
  function undo() {
    setMoves((prev) => {
      const next = [...prev];
      while (next.length && next.at(-1)!.mark === aiMark) next.pop();
      next.pop();
      return next;
    });
  }

  const canUndo = playing && !thinking && moves.some((m) => m.mark === myMark);

  if (!playing) {
    return <Setup settings={settings} onChange={setSettings} onStart={start} expert={rapfi.status} />;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_minmax(18rem,1fr)]">
      <div className="space-y-3">
        {/* One line that never wraps, so the board doesn't jump as the status text changes. */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{t.computer.playing}</h1>
            <p className="truncate text-xs text-slate-500">
              {t.computer.subtitle(t.computer.levels[settings.level].label, t.common.moves(moves.length))}
            </p>
          </div>
          <div className="shrink-0">
            <Status
              thinking={thinking}
              winner={winner}
              draw={draw}
              myMark={myMark}
              loading={settings.level === 'expert' && rapfi.status?.state === 'loading' ? rapfi.status.progress : undefined}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Board
            board={board}
            lastMove={last}
            winLine={winLine}
            playable={!thinking && !over && turn === myMark ? myMark : null}
            onMove={move}
          />
        </div>
        {settings.level === 'expert' && rapfi.status?.state === 'error' && (
          <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-red-800">{t.computer.expertCantStart}</p>
            <Button size="sm" onClick={() => setSettings({ ...settings, level: 'hard' })}>
              {t.computer.switchToHard}
            </Button>
          </div>
        )}
      </div>

      <Card title={t.computer.players}>
        <div className="space-y-2">
          <PlayerRow mark={myMark} active={!over && turn === myMark} won={winner === myMark} you />
          <PlayerRow mark={aiMark} active={!over && turn === aiMark} won={winner === aiMark} level={settings.level} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={undo} disabled={!canUndo}>
            {t.computer.undo}
          </Button>
          <Button size="sm" variant={over ? 'primary' : 'secondary'} onClick={() => setPlaying(false)}>
            {t.computer.newGameButton}
          </Button>
          <Link to="/" className="ml-auto text-sm text-slate-600 hover:text-slate-900">
            {user ? t.computer.backLobby : t.computer.backHome}
          </Link>
        </div>
        {!user && over && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium">{t.computer.readyTitle}</p>
            <p className="mt-0.5 text-blue-800">{t.computer.readyText}</p>
            <Link to="/login?next=/" className="mt-2 inline-block font-medium text-blue-700 underline-offset-2 hover:underline">
              {t.computer.readyLink}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

function Setup({
  settings,
  onChange,
  onStart,
  expert,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  expert: RapfiStatus | null;
}) {
  const t = useT();
  const option = (selected: boolean) =>
    `rounded-md border px-3 py-2 text-left text-sm transition-colors ${
      selected ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'
    }`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t.computer.setupTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.computer.setupIntro}</p>
      </div>
      <Card title={t.computer.newGame}>
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">{t.computer.difficulty}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={settings.level === level}
                  className={option(settings.level === level)}
                  onClick={() => onChange({ ...settings, level })}
                >
                  <span className="block font-medium">{t.computer.levels[level].label}</span>
                  <span className="block text-xs text-slate-500">{t.computer.levels[level].hint}</span>
                </button>
              ))}
            </div>
            {settings.level === 'expert' && <ExpertNote status={expert} />}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">{t.computer.yourSide}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['X', 'O'] as const).map((mark) => (
                <button
                  key={mark}
                  type="button"
                  aria-pressed={settings.mark === mark}
                  aria-label={t.computer.play(mark)}
                  className={`${option(settings.mark === mark)} flex items-center gap-2`}
                  onClick={() => onChange({ ...settings, mark })}
                >
                  <MarkIcon mark={mark} className="h-5 w-5" />
                  <span>{mark === 'X' ? t.computer.youFirst : t.computer.computerFirst}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{t.computer.notSaved}</p>
            <Button onClick={onStart}>{t.computer.start}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Download progress for Expert, and credit for the engine (its GPL licence asks for the source to be offered). */
function ExpertNote({ status }: { status: RapfiStatus | null }) {
  const t = useT();
  const link = 'font-medium text-blue-700 hover:underline';
  return (
    <p className="mt-2 text-xs text-slate-500">
      {status?.state === 'loading' && (
        <span className="font-medium text-slate-700">
          {t.computer.downloading(status.progress === null ? null : Math.round(status.progress * 100))}
        </span>
      )}
      {status?.state === 'ready' && <span className="font-medium text-emerald-700">{t.computer.engineReady}</span>}
      {status?.state === 'error' && <span className="font-medium text-red-700">{t.computer.engineFailed}</span>}
      {t.computer.expertRuns}{' '}
      <a href="https://github.com/dhbloo/rapfi" className={link} target="_blank" rel="noopener">
        Rapfi
      </a>{' '}
      {t.computer.expertBy}{' '}
      <a href={`${RAPFI_DIR}SOURCE.txt`} className={link} target="_blank" rel="noopener">
        {t.computer.sourceLicence}
      </a>
      .
    </p>
  );
}

function Status({
  thinking,
  winner,
  draw,
  myMark,
  loading,
}: {
  thinking: boolean;
  winner: Mark | null;
  draw: boolean;
  myMark: Mark;
  /** Expert's download progress while it is still loading (null when unknown). */
  loading?: number | null;
}) {
  const t = useT();
  if (winner) return winner === myMark ? <Badge tone="green">{t.computer.youWon}</Badge> : <Badge tone="red">{t.computer.youLost}</Badge>;
  if (draw) return <Badge>{t.computer.draw}</Badge>;
  if (thinking && loading !== undefined) {
    return (
      <Badge tone="amber">
        <span className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" aria-hidden />
        {t.computer.loadingEngine(loading === null ? null : Math.round(loading * 100))}
      </Badge>
    );
  }
  if (thinking) {
    return (
      <Badge tone="amber">
        <span className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" aria-hidden />
        <span className="sm:hidden">{t.computer.thinkingShort}</span>
        <span className="hidden sm:inline">{t.computer.thinking}</span>
      </Badge>
    );
  }
  return <Badge tone="green">{t.computer.yourTurn}</Badge>;
}

function PlayerRow({ mark, active, won, you, level }: { mark: Mark; active: boolean; won: boolean; you?: boolean; level?: Level }) {
  const { user } = useAuth();
  const t = useT();
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2 ${active ? 'border-slate-400 bg-slate-50' : 'border-slate-100'}`}>
      <MarkIcon mark={mark} className="h-5 w-5 shrink-0" />
      {you ? (
        <Avatar user={user ?? { name: t.computer.you, avatarUrl: null }} size={28} />
      ) : (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white" aria-hidden>
          AI
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {you ? (
          <>
            {user ? (
              <>
                {user.name} <span className="font-normal text-slate-400">{t.common.you}</span>
              </>
            ) : (
              t.computer.you
            )}
          </>
        ) : (
          <>
            {t.computer.computerName}{' '}
            <span className="font-normal text-slate-400">({t.computer.levels[level!].label.toLowerCase()})</span>
          </>
        )}
      </p>
      {won && <Badge tone="green">{t.common.winner}</Badge>}
    </div>
  );
}
