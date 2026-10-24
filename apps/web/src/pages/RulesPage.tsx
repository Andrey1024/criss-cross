import type { ReactNode } from 'react';
import { MarkIcon } from '../components/Board';
import { Link, useLang, type Lang } from '../i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { FAQS, pageMeta } from '../seo';

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

const H3 = ({ children }: { children: ReactNode }) => <h3 className="pt-2 text-base font-semibold text-slate-900">{children}</h3>;
const DT = ({ children }: { children: ReactNode }) => <dt className="font-medium text-slate-900">{children}</dt>;

const PRIMARY =
  'inline-flex items-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700';
const SECONDARY =
  'inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100';

function Faq({ lang, title }: { lang: Lang; title: string }) {
  return (
    <Section id="faq" title={title}>
      <div className="space-y-4">
        {FAQS[lang].map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold text-slate-900">{f.q}</h3>
            <p className="mt-1">{f.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function RulesPage() {
  const lang = useLang();
  usePageTitle(pageMeta('/rules', lang).title);
  return (
    <article className="mx-auto max-w-3xl space-y-10 py-2 text-slate-700 [&_p]:leading-relaxed">
      {lang === 'ru' ? <RulesRu /> : <RulesEn />}
    </article>
  );
}

function RulesEn() {
  return (
    <>
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
          This site uses <em>freestyle</em> rules, where a line of six or more also wins. Other variants exist: standard
          gomoku counts only exactly five, and renju adds restrictions for the first player to balance the game.
        </p>
      </Section>

      <Section id="strategy" title="Beginner strategy">
        <p>
          Five in a row is a game of <strong>threats</strong>: positions that force your opponent to answer. Whoever controls
          the threats controls the game.
        </p>

        <H3>1. Start near the centre</H3>
        <p>
          The centre gives your lines room to grow in every direction. Marks near the edge can only extend one way and are
          easy to block.
        </p>

        <H3>2. Know the open three</H3>
        <p>
          Three in a row with both ends empty is an <strong>open three</strong>. If it is not blocked, it becomes an open four
          next move, and an open four cannot be stopped. Block an open three right away, at one of its ends.
        </p>
        <Pattern cells="_XXX_" label="Open three: must be blocked at once." />
        <Pattern cells="_X_XX_" label="Broken three: just as dangerous as a solid one." />

        <H3>3. Fours force a reply</H3>
        <p>
          Four marks with one open end is a <strong>four</strong>: your opponent must block the last cell immediately, or
          lose. An <strong>open four</strong>, with both ends free, cannot be blocked at all.
        </p>
        <Pattern cells="OXXXX*" label="A four: O must block the highlighted cell." />
        <Pattern cells="*XXXX*" label="Open four: two ways to win, only one can be blocked." />

        <H3>4. Win with double threats</H3>
        <p>
          The usual way to win is to create <strong>two threats with one move</strong>: two fours, or a four and an open three
          (a &ldquo;four-three&rdquo;). Your opponent can only block one of them.
        </p>

        <H3>5. Forced wins with continuous fours</H3>
        <p>
          Strong players look for a <strong>VCF</strong> (victory by continuous fours): a chain of fours where each one forces
          a block, ending in a double threat. Because every move forces the reply, the opponent never gets a free move to
          defend. The Hard computer level searches for exactly these sequences, so it is good practice.
        </p>

        <H3>6. Defend while you attack</H3>
        <p>
          The best defensive moves also build your own lines. Before every move, check two things: can you make a four or a
          winning double threat, and does your opponent have a three or four you must answer?
        </p>
      </Section>

      <Section id="glossary" title="Glossary">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
          <DT>Open three</DT>
          <dd>Three marks in a line with both ends free; becomes an open four if ignored.</dd>
          <DT>Four</DT>
          <dd>Four marks that need one more cell to make five. Must be blocked at once.</dd>
          <DT>Open four</DT>
          <dd>A four that can be completed at either end. It cannot be stopped.</dd>
          <DT>Four-three</DT>
          <dd>One move that makes a four and an open three at the same time; usually wins.</dd>
          <DT>VCF</DT>
          <dd>Victory by continuous fours: a forced win made only of four-threats.</dd>
          <DT>Overline</DT>
          <dd>Six or more in a row. A win in freestyle gomoku, as played here.</dd>
        </dl>
      </Section>

      <Faq lang="en" title="Frequently asked questions" />

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Link to="/play/computer" className={PRIMARY}>
          Practise against the computer
        </Link>
        <Link to="/login" className={SECONDARY}>
          Sign in to play people
        </Link>
      </div>
    </>
  );
}

function RulesRu() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Как играть в «пять в ряд» (гомоку)</h1>
        <p className="mt-3 text-lg text-slate-600">
          «Пять в ряд», или гомоку, — классическая стратегическая игра для двоих. Правила можно выучить за минуту, а тактика
          остаётся интересной годами.
        </p>
      </header>

      <Section id="rules" title="Правила">
        <ul className="list-disc space-y-2 pl-5">
          <li>Игра идёт на поле 15×15 из пустых клеток.</li>
          <li>Один игрок играет за X, другой — за O. Первым всегда ходит X, дальше игроки ходят по очереди.</li>
          <li>За ход нужно поставить один знак в любую свободную клетку. Знаки не передвигаются и не снимаются.</li>
          <li>
            Побеждает тот, кто первым выстроит непрерывную линию из <strong>пяти или более</strong> своих знаков — по
            горизонтали, вертикали или диагонали.
          </li>
          <li>Если поле заполнено, а пяти в ряд нет ни у кого, это ничья.</li>
        </ul>
        <Pattern cells="_XXXXX_" label="Пять в ряд: X побеждает." />
        <p>
          На сайте действуют <em>свободные правила</em>: ряд из шести и более знаков тоже побеждает. Есть и другие варианты:
          в стандартном гомоку засчитывается только ровно пять, а в рэндзю у первого игрока есть ограничения, которые
          уравнивают шансы.
        </p>
      </Section>

      <Section id="strategy" title="Стратегия для начинающих">
        <p>
          «Пять в ряд» — игра <strong>угроз</strong>: позиций, на которые сопернику приходится отвечать. Кто управляет
          угрозами, тот управляет партией.
        </p>

        <H3>1. Начинайте ближе к центру</H3>
        <p>
          В центре вашим линиям есть куда расти во все стороны. Знаки у края продлеваются только в одну сторону, и их легко
          заблокировать.
        </p>

        <H3>2. Знайте открытую тройку</H3>
        <p>
          Три знака подряд с пустыми клетками с обеих сторон — это <strong>открытая тройка</strong>. Если её не закрыть,
          следующим ходом она станет открытой четвёркой, а открытую четвёрку остановить нельзя. Закрывайте открытую тройку
          сразу, с одного из концов.
        </p>
        <Pattern cells="_XXX_" label="Открытая тройка: закрывайте сразу." />
        <Pattern cells="_X_XX_" label="Тройка с разрывом: опасна так же, как сплошная." />

        <H3>3. Четвёрка требует ответа</H3>
        <p>
          Четыре знака с одним свободным концом — это <strong>четвёрка</strong>: соперник обязан сразу закрыть последнюю
          клетку, иначе проиграет. <strong>Открытую четвёрку</strong>, свободную с обеих сторон, закрыть уже невозможно.
        </p>
        <Pattern cells="OXXXX*" label="Четвёрка: O должен закрыть отмеченную клетку." />
        <Pattern cells="*XXXX*" label="Открытая четвёрка: два способа выиграть, закрыть можно только один." />

        <H3>4. Выигрывайте двойной угрозой</H3>
        <p>
          Обычно партию выигрывают, создав <strong>две угрозы одним ходом</strong>: две четвёрки или четвёрку и открытую
          тройку (вилку «четыре-три»). Соперник успеет закрыть только одну.
        </p>

        <H3>5. Форсированный выигрыш непрерывными четвёрками</H3>
        <p>
          Сильные игроки ищут <strong>VCF</strong> — выигрыш непрерывными четвёрками: цепочку четвёрок, где каждая заставляет
          закрываться, а в конце возникает двойная угроза. Поскольку каждый ход вынуждает ответ, у соперника нет свободного хода
          для защиты. Уровень «Сложный» ищет именно такие цепочки, так что с ним полезно тренироваться.
        </p>

        <H3>6. Защищайтесь, атакуя</H3>
        <p>
          Лучшие защитные ходы одновременно строят и ваши линии. Перед каждым ходом проверяйте две вещи: можете ли вы сделать
          четвёрку или выигрышную двойную угрозу, и нет ли у соперника тройки или четвёрки, на которую нужно ответить.
        </p>
      </Section>

      <Section id="glossary" title="Словарь">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
          <DT>Открытая тройка</DT>
          <dd>Три знака в линию со свободными концами; если её не закрыть, станет открытой четвёркой.</dd>
          <DT>Четвёрка</DT>
          <dd>Четыре знака, которым не хватает одной клетки до пяти. Её нужно закрыть немедленно.</dd>
          <DT>Открытая четвёрка</DT>
          <dd>Четвёрка, которую можно достроить с любого конца. Остановить её нельзя.</dd>
          <DT>Четыре-три</DT>
          <dd>Ход, который одновременно создаёт четвёрку и открытую тройку; обычно выигрывает.</dd>
          <DT>VCF</DT>
          <dd>Выигрыш непрерывными четвёрками: форсированная победа из одних угроз-четвёрок.</dd>
          <DT>Длинный ряд</DT>
          <dd>Шесть или больше знаков подряд. По свободным правилам, как здесь, это победа.</dd>
        </dl>
      </Section>

      <Faq lang="ru" title="Частые вопросы" />

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Link to="/play/computer" className={PRIMARY}>
          Потренироваться с компьютером
        </Link>
        <Link to="/login" className={SECONDARY}>
          Войти и играть с людьми
        </Link>
      </div>
    </>
  );
}
