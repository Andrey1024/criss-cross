import { boardFromMoves, findWinLine, type Mark } from '@cc/shared';
import { Board } from '../components/Board';
import { Link, useLang, useT } from '../i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { pageMeta } from '../seo';

const PRIMARY_CTA =
  'inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700';
const SECONDARY_CTA =
  'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100';

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
  const t = useT();
  usePageTitle(pageMeta('/', useLang()).title);
  return (
    <div className="space-y-14 py-2">
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">{t.landing.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/play/computer" className={PRIMARY_CTA}>
              {t.landing.playComputer}
            </Link>
            <Link to="/login" className={SECONDARY_CTA}>
              {t.landing.signInPeople}
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">{t.landing.tagline}</p>
        </div>
        <HeroBoard />
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-xl font-semibold">
          {t.landing.featuresTitle}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.landing.features.map((f) => (
            <div key={f.title} className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-title" className="max-w-3xl">
        <h2 id="how-title" className="text-xl font-semibold">
          {t.landing.howTitle}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
          {t.landing.howSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          <Link to="/rules" className="font-medium text-blue-700 hover:underline">
            {t.landing.fullRules}
          </Link>
        </p>
      </section>
    </div>
  );
}
