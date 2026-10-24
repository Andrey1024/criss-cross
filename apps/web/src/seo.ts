/** Per-page <head> data for the public, pre-rendered pages (and the default for the app shell). */
import { DEFAULT_LANG, LANGS, LOCALE, localizePath, type Lang } from './i18n';

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://playfiveinarow.com').replace(/\/$/, '');
export const SITE_NAME = 'Play Five in a Row';
/** Public contact address shown on the privacy and terms pages. */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@playfiveinarow.com';

export interface PageMeta {
  /** App path without the language prefix, e.g. /rules. */
  path: string;
  lang: Lang;
  /** Output file in dist/. */
  file: string;
  title: string;
  description: string;
  /** Languages this page exists in, for hreflang links. */
  langs: readonly Lang[];
  jsonLd?: object[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: Record<Lang, FaqItem[]> = {
  en: [
    { q: 'Is it free to play?', a: 'Yes. Playing against the computer and against other people is free, with no ads.' },
    {
      q: 'Do I need an account?',
      a: 'No account is needed to play against the computer, or to join a friend’s unrated room from an invite link. To find opponents in the lobby, keep a rating and appear on the leaderboard, sign in with Google.',
    },
    {
      q: 'Is there a time limit?',
      a: 'Yes. In games against people each move has a 30-second limit, and a player who runs out of time loses. If both players agree, the timer can be turned off for the rest of the game.',
    },
    {
      q: 'How does the rating work?',
      a: 'Ratings use Glicko-2, the system lichess uses. Everyone starts at 1500. A question mark after a rating means it is still provisional and moves faster until you have played more rated games.',
    },
    {
      q: 'Is five in a row the same as gomoku?',
      a: 'Yes. Five in a row is the common English name for gomoku. This site plays freestyle gomoku: five or more marks in a row win.',
    },
    {
      q: 'Does the first player have an advantage?',
      a: 'Yes. With perfect play the first player wins freestyle gomoku on a 15×15 board, which Victor Allis proved in 1994. Between human players the advantage is much smaller, and good defence matters a lot.',
    },
    { q: 'Can I play on my phone?', a: 'Yes. The board fits phone screens, and you can add the site to your home screen to open it like an app.' },
  ],
  ru: [
    { q: 'Это бесплатно?', a: 'Да. Игра с компьютером и с другими людьми бесплатна и без рекламы.' },
    {
      q: 'Нужен ли аккаунт?',
      a: 'Для игры с компьютером аккаунт не нужен, как и для партии без рейтинга по ссылке-приглашению от друга. Чтобы искать соперников в лобби, получить рейтинг и попасть в таблицу лидеров, войдите через Google.',
    },
    {
      q: 'Есть ли ограничение по времени?',
      a: 'Да. В партиях с людьми на каждый ход даётся 30 секунд, а у кого закончилось время, тот проигрывает. Если оба игрока согласны, таймер можно отключить до конца партии.',
    },
    {
      q: 'Как считается рейтинг?',
      a: 'Рейтинг считается по системе Glicko-2, как на lichess. Все начинают с 1500. Знак вопроса после рейтинга означает, что он ещё предварительный и меняется быстрее, пока вы не сыграете больше рейтинговых партий.',
    },
    {
      q: 'Пять в ряд и гомоку — это одно и то же?',
      a: 'Да. «Пять в ряд» — распространённое название гомоку. На сайте играют по свободным правилам: побеждает ряд из пяти и более знаков.',
    },
    {
      q: 'Есть ли преимущество у первого игрока?',
      a: 'Да. При идеальной игре в гомоку по свободным правилам на поле 15×15 побеждает первый игрок — это доказал Виктор Аллис в 1994 году. Между людьми преимущество гораздо меньше, и хорошая защита решает многое.',
    },
    {
      q: 'Можно ли играть на телефоне?',
      a: 'Да. Поле помещается на экране телефона, а сайт можно добавить на главный экран и открывать как приложение.',
    },
  ],
};

interface PageText {
  title: string;
  description: string;
}

/** Public pages and their text per language. Legal pages are English only. */
const PUBLIC: Array<{ path: string; slug: string; text: Partial<Record<Lang, PageText>> }> = [
  {
    path: '/',
    slug: 'index',
    text: {
      en: {
        title: 'Play Five in a Row Online — Free Gomoku Game',
        description:
          'Play five in a row (gomoku) free in your browser. Challenge the computer instantly, no sign-up needed, or play real opponents online with chat, Glicko-2 ratings and a leaderboard.',
      },
      ru: {
        title: 'Пять в ряд онлайн — бесплатная игра гомоку',
        description:
          'Играйте в «пять в ряд» (гомоку) бесплатно в браузере. С компьютером — сразу и без регистрации, с живыми соперниками — онлайн, с чатом, рейтингом Glicko-2 и таблицей лидеров.',
      },
    },
  },
  {
    path: '/rules',
    slug: 'rules',
    text: {
      en: {
        title: 'How to Play Five in a Row (Gomoku): Rules and Strategy',
        description:
          'Five in a row rules in one minute, plus beginner strategy: open threes, fours, double threats and forced wins. Learn gomoku and practise against the computer.',
      },
      ru: {
        title: 'Как играть в «пять в ряд» (гомоку): правила и стратегия',
        description:
          'Правила «пяти в ряд» за минуту и стратегия для начинающих: открытые тройки, четвёрки, вилки и форсированные выигрыши. Научитесь играть в гомоку и потренируйтесь с компьютером.',
      },
    },
  },
  {
    path: '/play/computer',
    slug: 'play-computer',
    text: {
      en: {
        title: 'Play Five in a Row Against the Computer — Free, No Sign-up',
        description:
          'Play five in a row against the computer in your browser. Four levels, from casual to Expert, a world-champion engine. Free, no account needed.',
      },
      ru: {
        title: 'Пять в ряд с компьютером — бесплатно и без регистрации',
        description:
          'Играйте в «пять в ряд» с компьютером в браузере. Четыре уровня: от лёгкого до «Эксперта» — движка-чемпиона мира. Бесплатно, без аккаунта.',
      },
    },
  },
  {
    path: '/privacy',
    slug: 'privacy',
    text: {
      en: {
        title: `Privacy Policy — ${SITE_NAME}`,
        description: 'What Play Five in a Row stores about you, why, the cookies it uses, and how to have your data deleted.',
      },
    },
  },
  {
    path: '/terms',
    slug: 'terms',
    text: {
      en: {
        title: `Terms of Service — ${SITE_NAME}`,
        description: 'The terms for using Play Five in a Row: fair play, moderation and your account.',
      },
    },
  },
];

const fileName = (slug: string, lang: Lang) => (lang === DEFAULT_LANG ? `${slug}.html` : slug === 'index' ? `${lang}.html` : `${lang}-${slug}.html`);

function jsonLdFor(path: string, lang: Lang, text: PageText): object[] | undefined {
  if (path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': ['WebApplication', 'Game'],
        name: SITE_NAME,
        alternateName: ['Five in a Row', 'Gomoku', 'Five in a Row Online', 'Пять в ряд', 'Гомоку'],
        url: pageUrl('/', lang),
        inLanguage: LOCALE[lang],
        description: text.description,
        applicationCategory: 'GameApplication',
        genre: 'Board game',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        image: `${SITE_URL}/og-image.png`,
      },
    ];
  }
  if (path === '/rules') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: LOCALE[lang],
        mainEntity: FAQS[lang].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ];
  }
  return undefined;
}

/** Every pre-rendered page, in every language it exists in. */
export const PAGES: PageMeta[] = PUBLIC.flatMap(({ path, slug, text }) => {
  const langs = LANGS.filter((l) => text[l]);
  return langs.map((lang) => ({
    path,
    lang,
    file: fileName(slug, lang),
    langs,
    ...text[lang]!,
    jsonLd: jsonLdFor(path, lang, text[lang]!),
  }));
});

/** Head data for a public page; pages that only exist in English fall back to it. */
export function pageMeta(path: string, lang: Lang): PageMeta {
  return PAGES.find((p) => p.path === path && p.lang === lang) ?? PAGES.find((p) => p.path === path && p.lang === DEFAULT_LANG)!;
}

/** Default head for the client-side app shell (rooms, account, admin…), one per language. */
export const APP_META: PageMeta[] = LANGS.map((lang) => ({
  path: '/',
  lang,
  file: lang === DEFAULT_LANG ? 'app.html' : `app-${lang}.html`,
  langs: [lang],
  title: lang === 'ru' ? 'Пять в ряд — гомоку онлайн' : 'Play Five in a Row — online gomoku',
  description:
    lang === 'ru'
      ? 'Играйте в «пять в ряд» (гомоку) онлайн: комнаты, чат, рейтинг и таблица лидеров.'
      : 'Play five in a row (gomoku) online: rooms, chat, ratings and a leaderboard.',
}));

export function pageUrl(path: string, lang: Lang): string {
  const local = localizePath(path, lang);
  return `${SITE_URL}${local === '/' ? '/' : local}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', ru: 'ru_RU' };

/** <head> tags for a page (title, description, canonical, hreflang, Open Graph, Twitter, JSON-LD). */
export function headTags(page: PageMeta, opts: { canonical: boolean } = { canonical: true }): string {
  const url = pageUrl(page.path, page.lang);
  const image = `${SITE_URL}/og-image.png`;
  const t = escapeHtml(page.title);
  const d = escapeHtml(page.description);
  const alternates =
    opts.canonical && page.langs.length > 1
      ? [
          ...page.langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${pageUrl(page.path, l)}" />`),
          `<link rel="alternate" hreflang="x-default" href="${pageUrl(page.path, DEFAULT_LANG)}" />`,
        ]
      : [];
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    opts.canonical ? `<link rel="canonical" href="${url}" />` : '',
    ...alternates,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[page.lang]}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    opts.canonical ? `<meta property="og:url" content="${url}" />` : '',
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(page.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ];
  return tags.filter(Boolean).join('\n    ');
}
