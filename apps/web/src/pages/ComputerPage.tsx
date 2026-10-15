import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
import { useMe } from '../lib/auth';
import { useAiWorker } from '../lib/useAiWorker';

const LEVEL_INFO: Record<AiLevel, { label: string; hint: string }> = {
  easy: { label: 'Easy', hint: 'Plays casually. Good for learning the game.' },
  medium: { label: 'Medium', hint: 'Looks two moves ahead and answers your threats.' },
  hard: { label: 'Hard', hint: 'Searches up to six moves ahead.' },
};
/** Keeps instant replies from feeling abrupt. */
const MIN_THINK_MS = 350;
const SETTINGS_KEY = 'cc.computer.settings';

interface Settings {
  level: AiLevel;
  mark: Mark;
}

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (AI_LEVELS.includes(saved?.level) && (saved?.mark === 'X' || saved?.mark === 'O')) return saved;
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
    think(board, aiMark, settings.level)
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
  }, [thinking, board, aiMark, settings.level, think]);

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
    return <Setup settings={settings} onChange={setSettings} onStart={start} />;
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(18rem,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Playing the computer</h1>
            <p className="text-xs text-slate-500">
              {LEVEL_INFO[settings.level].label} · {moves.length} moves · not saved to history
            </p>
          </div>
          <Status thinking={thinking} winner={winner} draw={draw} myMark={myMark} />
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
      </div>

      <Card title="Players">
        <div className="space-y-2">
          <PlayerRow mark={myMark} active={!over && turn === myMark} won={winner === myMark} you />
          <PlayerRow mark={aiMark} active={!over && turn === aiMark} won={winner === aiMark} level={settings.level} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={undo} disabled={!canUndo}>
            Undo
          </Button>
          <Button size="sm" variant={over ? 'primary' : 'secondary'} onClick={() => setPlaying(false)}>
            New game
          </Button>
          <Link to="/" className="ml-auto text-sm text-slate-600 hover:text-slate-900">
            ← Lobby
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Setup({ settings, onChange, onStart }: { settings: Settings; onChange: (s: Settings) => void; onStart: () => void }) {
  const option = (selected: boolean) =>
    `rounded-md border px-3 py-2 text-left text-sm transition-colors ${
      selected ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-400'
    }`;

  return (
    <Card title="Play against the computer" className="mx-auto max-w-lg">
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Difficulty</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {AI_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={settings.level === level}
                className={option(settings.level === level)}
                onClick={() => onChange({ ...settings, level })}
              >
                <span className="block font-medium">{LEVEL_INFO[level].label}</span>
                <span className="block text-xs text-slate-500">{LEVEL_INFO[level].hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Your side</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['X', 'O'] as const).map((mark) => (
              <button
                key={mark}
                type="button"
                aria-pressed={settings.mark === mark}
                aria-label={`Play ${mark}`}
                className={`${option(settings.mark === mark)} flex items-center gap-2`}
                onClick={() => onChange({ ...settings, mark })}
              >
                <MarkIcon mark={mark} className="h-5 w-5" />
                <span>{mark === 'X' ? 'You move first' : 'Computer moves first'}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Games against the computer are not saved to your history.</p>
          <Button onClick={onStart}>Start</Button>
        </div>
      </div>
    </Card>
  );
}

function Status({ thinking, winner, draw, myMark }: { thinking: boolean; winner: Mark | null; draw: boolean; myMark: Mark }) {
  if (winner) return winner === myMark ? <Badge tone="green">You won!</Badge> : <Badge tone="red">You lost</Badge>;
  if (draw) return <Badge>Draw — the board is full</Badge>;
  if (thinking) {
    return (
      <Badge tone="amber">
        <span className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" aria-hidden />
        Computer is thinking…
      </Badge>
    );
  }
  return <Badge tone="green">Your turn</Badge>;
}

function PlayerRow({ mark, active, won, you, level }: { mark: Mark; active: boolean; won: boolean; you?: boolean; level?: AiLevel }) {
  const me = useMe();
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2 ${active ? 'border-slate-400 bg-slate-50' : 'border-slate-100'}`}>
      <MarkIcon mark={mark} className="h-5 w-5 shrink-0" />
      {you ? (
        <Avatar user={me} size={28} />
      ) : (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white" aria-hidden>
          AI
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {you ? (
          <>
            {me.name} <span className="font-normal text-slate-400">(you)</span>
          </>
        ) : (
          <>
            Computer <span className="font-normal text-slate-400">({LEVEL_INFO[level!].label.toLowerCase()})</span>
          </>
        )}
      </p>
      {won && <Badge tone="green">Winner</Badge>}
    </div>
  );
}
