/** Per-page <head> data for the public, pre-rendered pages (and the default for the app shell). */

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://playfiveinarow.com').replace(/\/$/, '');
export const SITE_NAME = 'Play Five in a Row';
/** Public contact address shown on the privacy and terms pages. */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@playfiveinarow.com';

export interface PageMeta {
  path: string;
  /** Output file in dist/. */
  file: string;
  title: string;
  description: string;
  jsonLd?: object[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: 'Is it free to play?',
    a: 'Yes. Playing against the computer and against other people is free, with no ads.',
  },
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
  {
    q: 'Can I play on my phone?',
    a: 'Yes. The board fits phone screens, and you can add the site to your home screen to open it like an app.',
  },
];

export const PAGES: PageMeta[] = [
  {
    path: '/',
    file: 'index.html',
    title: 'Play Five in a Row Online — Free Gomoku Game',
    description:
      'Play five in a row (gomoku) free in your browser. Challenge the computer instantly, no sign-up needed, or play real opponents online with chat, Glicko-2 ratings and a leaderboard.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': ['WebApplication', 'Game'],
        name: SITE_NAME,
        alternateName: ['Five in a Row', 'Gomoku', 'Five in a Row Online'],
        url: `${SITE_URL}/`,
        description: 'Free online five in a row (gomoku): play the computer or real opponents, with ratings and a leaderboard.',
        applicationCategory: 'GameApplication',
        genre: 'Board game',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        image: `${SITE_URL}/og-image.png`,
      },
    ],
  },
  {
    path: '/rules',
    file: 'rules.html',
    title: 'How to Play Five in a Row (Gomoku): Rules and Strategy',
    description:
      'Five in a row rules in one minute, plus beginner strategy: open threes, fours, double threats and forced wins. Learn gomoku and practise against the computer.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  },
  {
    path: '/play/computer',
    file: 'play-computer.html',
    title: 'Play Five in a Row Against the Computer — Free, No Sign-up',
    description:
      'Play five in a row against the computer in your browser. Three difficulty levels, from casual to a Hard AI that finds forced wins. Free, no account needed.',
  },
  {
    path: '/privacy',
    file: 'privacy.html',
    title: `Privacy Policy — ${SITE_NAME}`,
    description: 'What Play Five in a Row stores about you, why, the cookies it uses, and how to have your data deleted.',
  },
  {
    path: '/terms',
    file: 'terms.html',
    title: `Terms of Service — ${SITE_NAME}`,
    description: 'The terms for using Play Five in a Row: fair play, moderation and your account.',
  },
];

/** Default head for the client-side app shell (rooms, account, admin…). */
export const APP_META: PageMeta = {
  path: '/',
  file: 'app.html',
  title: 'Play Five in a Row — online gomoku',
  description: 'Play five in a row (gomoku) online: rooms, chat, ratings and a leaderboard.',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** <head> tags for a page (title, description, canonical, Open Graph, Twitter, JSON-LD). */
export function headTags(page: PageMeta, opts: { canonical: boolean } = { canonical: true }): string {
  const url = `${SITE_URL}${page.path === '/' ? '/' : page.path}`;
  const image = `${SITE_URL}/og-image.png`;
  const t = escapeHtml(page.title);
  const d = escapeHtml(page.description);
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    opts.canonical ? `<link rel="canonical" href="${url}" />` : '',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
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
