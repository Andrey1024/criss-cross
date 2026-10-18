import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { boardFromMoves, findWinLine, type GameDetail } from '@cc/shared';
import { Board, MarkIcon } from '../components/Board';
import { Avatar, Badge, Button, Card, ErrorNote, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime, RESULT_LABEL } from '../lib/format';

export function ReplayPage() {
  const { id } = useParams();
  const { data: game, error } = useQuery({ queryKey: ['game', id], queryFn: () => api<GameDetail>(`/games/${id}`) });
  if (error) return <ErrorNote>{(error as Error).message}</ErrorNote>;
  if (!game) return <Spinner />;
  return <Replay game={game} />;
}

function Replay({ game }: { game: GameDetail }) {
  const total = game.moves.length;
  const [step, setStep] = useState(total);
  const go = (n: number) => setStep(Math.min(total, Math.max(0, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
      if (e.key === 'ArrowRight') setStep((s) => Math.min(total, s + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const { board, last, winLine } = useMemo(() => {
    const board = boardFromMoves(game.moves.slice(0, step), game.boardSize);
    const last = step > 0 ? game.moves[step - 1] : null;
    const winLine = step === total && last && game.result === 'WIN' ? findWinLine(board, last.x, last.y) : null;
    return { board, last, winLine };
  }, [game, step, total]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_minmax(16rem,1fr)]">
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <Board board={board} lastMove={last} winLine={winLine} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => go(0)} aria-label="First move">⏮</Button>
          <Button variant="secondary" size="sm" onClick={() => go(step - 1)} aria-label="Previous move">◀</Button>
          <input type="range" min={0} max={total} value={step} onChange={(e) => go(Number(e.target.value))} className="min-w-32 flex-1" aria-label="Move" />
          <Button variant="secondary" size="sm" onClick={() => go(step + 1)} aria-label="Next move">▶</Button>
          <Button variant="secondary" size="sm" onClick={() => go(total)} aria-label="Last move">⏭</Button>
          <span className="w-20 text-right text-sm tabular-nums text-slate-600">
            {step} / {total}
          </span>
        </div>
      </div>

      <Card title={game.roomName}>
        <div className="space-y-2">
          {(['X', 'O'] as const).map((mark) => (
            <div key={mark} className="flex items-center gap-2 text-sm">
              <MarkIcon mark={mark} className="h-4 w-4" />
              <Avatar user={game.players[mark]} size={24} />
              <span className="flex-1 truncate">{game.players[mark].name}</span>
              {game.winner === mark && <Badge tone="green">Winner</Badge>}
            </div>
          ))}
        </div>
        <dl className="mt-4 space-y-1 text-sm text-slate-600">
          <div className="flex justify-between"><dt>Result</dt><dd>{game.result ? RESULT_LABEL[game.result] : 'In progress'}</dd></div>
          <div className="flex justify-between"><dt>Started</dt><dd>{formatDateTime(game.startedAt)}</dd></div>
          {game.endedAt && <div className="flex justify-between"><dt>Ended</dt><dd>{formatDateTime(game.endedAt)}</dd></div>}
        </dl>
        <p className="mt-4 text-xs text-slate-400">Tip: use ← and → to step through moves.</p>
        <Link to="/account" className="mt-3 inline-block text-sm text-blue-700 hover:underline">← Back to my games</Link>
      </Card>
    </div>
  );
}
