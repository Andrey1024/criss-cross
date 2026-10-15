import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MarkIcon } from '../components/Board';
import { usePageTitle } from '../lib/usePageTitle';
import { FAQ, PAGES } from '../seo';

/**
 * A row of cells illustrating a shape: "X" and "O" are marks, "_" an empty cell and "*" the key
 * empty cell (highlighted).
 */
function Pattern({ cells, label }: { cells: string; label: string }) {
  return (
    <figure className="my-3">
      <div className="inline-flex gap-px rounded border border-slate-300 bg-slate-200 p-px" role="img" aria-label={label}>
        {[...cells].map((c, i) => (
          <span key={i} className={`flex h-7 w-7 items-center justify-center p-1 ${c === '*' ? 'bg-amber-100' : 'bg-white'}`}>
            {(c === 'X' || c === 'O') && <MarkIcon mark={c} className="h-full w-full" />}
          </span>
        ))}
      </div>
      <figcaption className="mt-1 text-xs text-slate-500">{label}</figcaption>
    </figure>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RulesPage() {
  usePageTitle(PAGES[1].title);
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-2 text-slate-700 [&_p]:leading-relaxed">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">How to play five in a row (gomoku)</h1>
        <p className="mt-3 text-lg text-slate-600">
          Five in a row, also known as gomoku, is a classic strategy game for two players. The rules take a minute to learn;
          the tactics keep it interesting for years.
        </p>
      </header>

      <Section id="rules" title="The rules">
        <ul className="list-disc space-y-2 pl-5">
          <li>The game is played on a 15×15 board of empty cells.</li>
          <li>One player plays X, the other O. X always moves first, then the players alternate.</li>
          <li>On your turn, place one mark in any empty cell. Marks are never moved or removed.</li>
          <li>
            The first player to make an unbroken line of <strong>five or more</strong> of their marks wins. Lines can be
            horizontal, vertical or diagonal.
          </li>
          <li>If every cell is filled and nobody has five in a row, the game is a draw.</li>
        </ul>
        <Pattern cells="_XXXXX_" label="Five in a row: X wins." />
        <p>
          Criss-Cross uses <em>freestyle</em> rules, where a line of six or more also wins. Other variants exist: standard
          gomoku counts only exactly five, and renju adds restrictions for the first player to balance the game.
        </p>
      </Section>

      <Section id="strategy" title="Beginner strategy">
        <p>
          Five in a row is a game of <strong>threats</strong>: positions that force your opponent to answer. Whoever controls
          the threats controls the game.
        </p>

        <h3 className="pt-2 text-base font-semibold text-slate-900">1. Start near the centre</h3>
        <p>
          The centre gives your lines room to grow in every direction. Marks near the edge can only extend one way and are
          easy to block.
        </p>

        <h3 className="pt-2 text-base font-semibold text-slate-900">2. Know the open three</h3>
        <p>
          Three in a row with both ends empty is an <strong>open three</strong>. If it is not blocked, it becomes an open four
          next move, and an open four cannot be stopped. Block an open three right away, at one of its ends.
        </p>
        <Pattern cells="_XXX_" label="Open three: must be blocked at once." />
        <Pattern cells="_X_XX_" label="Broken three: just as dangerous as a solid one." />

        <h3 className="pt-2 text-base font-semibold text-slate-900">3. Fours force a reply</h3>
        <p>
          Four marks with one open end is a <strong>four</strong>: your opponent must block the last cell immediately, or
          lose. An <strong>open four</strong>, with both ends free, cannot be blocked at all.
        </p>
        <Pattern cells="OXXXX*" label="A four: O must block the highlighted cell." />
        <Pattern cells="*XXXX*" label="Open four: two ways to win, only one can be blocked." />

        <h3 className="pt-2 text-base font-semibold text-slate-900">4. Win with double threats</h3>
        <p>
          The usual way to win is to create <strong>two threats with one move</strong>: two fours, or a four and an open three
          (a &ldquo;four-three&rdquo;). Your opponent can only block one of them.
        </p>

        <h3 className="pt-2 text-base font-semibold text-slate-900">5. Forced wins with continuous fours</h3>
        <p>
          Strong players look for a <strong>VCF</strong> (victory by continuous fours): a chain of fours where each one forces
          a block, ending in a double threat. Because every move forces the reply, the opponent never gets a free move to
          defend. The Hard computer level searches for exactly these sequences, so it is good practice.
        </p>

        <h3 className="pt-2 text-base font-semibold text-slate-900">6. Defend while you attack</h3>
        <p>
          The best defensive moves also build your own lines. Before every move, check two things: can you make a four or a
          winning double threat, and does your opponent have a three or four you must answer?
        </p>
      </Section>

      <Section id="glossary" title="Glossary">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-slate-900">Open three</dt>
          <dd>Three marks in a line with both ends free; becomes an open four if ignored.</dd>
          <dt className="font-medium text-slate-900">Four</dt>
          <dd>Four marks that need one more cell to make five. Must be blocked at once.</dd>
          <dt className="font-medium text-slate-900">Open four</dt>
          <dd>A four that can be completed at either end. It cannot be stopped.</dd>
          <dt className="font-medium text-slate-900">Four-three</dt>
          <dd>One move that makes a four and an open three at the same time; usually wins.</dd>
          <dt className="font-medium text-slate-900">VCF</dt>
          <dd>Victory by continuous fours: a forced win made only of four-threats.</dd>
          <dt className="font-medium text-slate-900">Overline</dt>
          <dd>Six or more in a row. A win in freestyle gomoku, as played here.</dd>
        </dl>
      </Section>

      <Section id="faq" title="Frequently asked questions">
        <div className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-slate-900">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Link
          to="/play/computer"
          className="inline-flex items-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Practise against the computer
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Sign in to play people
        </Link>
      </div>
    </article>
  );
}
