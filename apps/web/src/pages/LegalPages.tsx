import type { ReactNode } from 'react';
import { DEFAULT_LANG, LOCALE, Link, useLang, useT } from '../i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { pageMeta, SITE_NAME, SUPPORT_EMAIL } from '../seo';

const UPDATED = '17 October 2026';

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  // Legal texts are published in English only; other languages say so up front.
  const lang = useLang();
  const t = useT();
  return (
    <article
      lang="en"
      className="mx-auto max-w-3xl space-y-8 py-2 text-slate-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5"
    >
      {lang !== DEFAULT_LANG && (
        <p lang={LOCALE[lang]} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {t.common.legalEnglishOnly}
        </p>
      )}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>
      </header>
      {children}
    </article>
  );
}

const Email = () => (
  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-700 hover:underline">
    {SUPPORT_EMAIL}
  </a>
);

export function PrivacyPage() {
  usePageTitle(pageMeta('/privacy', DEFAULT_LANG).title);
  return (
    <LegalPage title="Privacy policy">
      <p>
        {SITE_NAME} is a free online five in a row game. This page explains what we store about you, why, and how to have it
        removed. We keep as little as we can, we show no ads, and we never sell your data.
      </p>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Your Google account basics</strong>, when you sign in with Google: your name, email address, profile picture
            link and Google account ID. We use them to sign you in and to show your name and picture to other players. Your
            email address is never shown to other players.
          </li>
          <li>
            <strong>Your games</strong>: the moves, results, dates and rating changes, so you can see your history and replays and
            so the leaderboard works.
          </li>
          <li>
            <strong>Chat messages</strong> you send in game rooms, which other people in the room can read.
          </li>
          <li>
            <strong>Guests</strong> who join an unrated room from an invite link: only the display name they type, plus their
            games and chat in that room.
          </li>
          <li>
            <strong>Moderation records</strong>: if an admin bans an account, the reason and the dates.
          </li>
        </ul>
        <p>Games against the computer run entirely in your browser and are not sent to us.</p>
      </section>

      <section>
        <h2>Cookies and browser storage</h2>
        <ul>
          <li>
            <code>cc_token</code>: keeps you signed in for 7 days. <code>cc_guest</code>: remembers a guest&rsquo;s name and seat
            for 30 days. Both are httpOnly, so page scripts can&rsquo;t read them.
          </li>
          <li>
            <code>cc_session</code>: a simple flag that tells the page you are probably signed in, so it can skip the welcome
            page.
          </li>
          <li>Your settings for games against the computer are kept in your browser&rsquo;s local storage.</li>
        </ul>
        <p>
          We use no analytics, advertising or tracking cookies. When you use &ldquo;Sign in with Google&rdquo;, Google&rsquo;s
          sign-in button is loaded from Google and is covered by{' '}
          <a href="https://policies.google.com/privacy" className="text-blue-700 hover:underline" rel="noopener">
            Google&rsquo;s privacy policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Who processes the data</h2>
        <ul>
          <li>Railway hosts the app and its database.</li>
          <li>Cloudflare provides the domain name service and network delivery.</li>
          <li>Google provides sign-in.</li>
        </ul>
        <p>These providers handle data only to run the service. We share it with no one else, except where the law requires.</p>
      </section>

      <section>
        <h2>How long we keep it, and deleting it</h2>
        <p>
          We keep your account, games and chat for as long as your account exists, so your history and rating stay intact. To
          have your account deleted, or to get a copy of your data, email <Email /> from the address you sign in with. We will
          remove your account and personal details within 30 days. Games you played may be kept without your name, so your
          opponents&rsquo; histories still make sense.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>The service is not aimed at children under 13, and we don&rsquo;t knowingly collect their data.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, we will update this page and its date. Questions? Email <Email />.
        </p>
      </section>
    </LegalPage>
  );
}

export function TermsPage() {
  usePageTitle(pageMeta('/terms', DEFAULT_LANG).title);
  return (
    <LegalPage title="Terms of service">
      <p>By using {SITE_NAME} you agree to these terms. They are short because the service is simple and free.</p>

      <section>
        <h2>Playing fair</h2>
        <ul>
          <li>Don&rsquo;t use engines, bots or a second account to win games or move up the leaderboard.</li>
          <li>Be decent in chat: no harassment, hate speech, spam or illegal content.</li>
          <li>Don&rsquo;t try to break, overload or get around the security of the service.</li>
        </ul>
      </section>

      <section>
        <h2>Moderation</h2>
        <p>
          Admins can delete chat messages, close rooms, and ban accounts for a period or permanently when these terms are broken.
          A ban ends any game in progress as a loss. If you think a ban was a mistake, email <Email />.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You sign in with your Google account and are responsible for what happens under it. You can stop using the service at
          any time and ask us to delete your account, as described in the{' '}
          <Link to="/privacy" className="text-blue-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The service is provided free and &ldquo;as is&rdquo;. We try to keep it running and fair, but we can&rsquo;t promise it
          will always be available or free of errors, and ratings or game records may occasionally be reset or corrected. To the
          extent the law allows, we are not liable for any loss arising from using it.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms; the date above shows the latest version. Questions? Email <Email />.
        </p>
      </section>
    </LegalPage>
  );
}
