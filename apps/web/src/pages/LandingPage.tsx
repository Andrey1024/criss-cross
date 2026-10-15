import { Link } from 'react-router';
import { boardFromMoves, findWinLine, type Mark } from '@cc/shared';
import { Board } from '../components/Board';
import { usePageTitle } from '../lib/usePageTitle';
import { PAGES } from '../seo';

const PRIMARY_CTA =
  'inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700';
const SECONDARY_CTA =
  'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100';

const FEATURES = [
  {
    title: 'Play the computer instantly',
    text: 'Three levels, from a casual Easy to a Hard AI that searches deep and spots forced wins. No account needed.',
  },
  {
    title: 'Play real opponents',
    text: 'Create a room, share the link with a friend or wait for someone in the lobby. Chat while you play.',
  },
  {
    title: 'Ratings like lichess',
    text: 'Every game between players is rated with Glicko-2. Watch your rating climb on your personal chart.',
  },
  {
    title: 'Leaderboard',
    text: 'The best active players of the last 30 days, ranked by rating.',
  },
  {
    title: 'Replay every game',
    text: 'Step through your finished games move by move to see where they were won or lost.',
  },
  {
    title: 'Free, everywhere',
    text: 'No ads and nothing to install. Works on desktop and phones, and you can add it to your home screen.',
  },
];

// A finished sample game for the hero illustration: X wins on the diagonal.
const SAMPLE: Array<[number, number, Mark]> = [
  [4, 4, 'X'], [5, 4, 'O'], [3, 3, 'X'], [5, 5, 'O'], [5, 3, 'X'], [5, 2, 'O'],
  [2, 2, 'X'], [6, 6, 'O'], [1, 1, 'X'], [6, 5, 'O'], [6, 7, 'X'], [4, 6, 'O'], [0, 0, 'X'],
];

function HeroBoard() {
  const moves = SAMPLE.map(([x, y, mark]) => ({ x, y, mark }));
  const board = boardFromMoves(moves, 9);
  const last = moves[moves.length - 1];
  return (
    <div aria-hidden className="justify-self-center">
      <Board board={board} lastMove={last} winLine={findWinLine(board, last.x, last.y)} />
    </div>
  );
}

export function LandingPage() {
  usePageTitle(PAGES[0].title);
  return (
    <div className="space-y-14 py-2">
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Play five in a row online</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Free gomoku in your browser. Get five marks in a row before your opponent does. Play the computer right now with no
            sign-up, or sign in to play real people and earn a rating.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/play/computer" className={PRIMARY_CTA}>
              Play vs computer, no sign-up
            </Link>
            <Link to="/login" className={SECONDARY_CTA}>
              Sign in to play people
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">Free · no ads · works on phones</p>
        </div>
        <HeroBoard />
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-xl font-semibold">
          Everything you need for a good game
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-title" className="max-w-3xl">
        <h2 id="how-title" className="text-xl font-semibold">
          How to play five in a row
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
          <li>Two players take turns placing their mark, X or O, in any empty cell of a 15×15 board. X moves first.</li>
          <li>The first player to get five or more marks in an unbroken line wins: across, down or diagonally.</li>
          <li>Block your opponent&apos;s lines while building your own. Threats that must be answered win games.</li>
          <li>If the board fills up with no five in a row, the game is a draw.</li>
        </ol>
        <p className="mt-4 text-sm">
          <Link to="/rules" className="font-medium text-blue-700 hover:underline">
            Read the full rules and strategy guide →
          </Link>
        </p>
      </section>
    </div>
  );
}
