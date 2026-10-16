// Build-time entry (vite build --ssr): renders the public pages to static HTML for crawlers and
// link previews. See scripts/prerender.mjs.
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { AuthContext } from './lib/auth';
import { ComputerPage } from './pages/ComputerPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { RulesPage } from './pages/RulesPage';

export { APP_META, PAGES, SITE_URL, headTags } from './seo';

const PAGE_COMPONENTS: Record<string, () => ReactNode> = {
  '/': () => <LandingPage />,
  '/rules': () => <RulesPage />,
  '/play/computer': () => <ComputerPage />,
  '/privacy': () => <PrivacyPage />,
  '/terms': () => <TermsPage />,
};

const guest = {
  state: { status: 'anon' as const },
  config: null,
  user: null,
  loginWithGoogle: async () => {},
  devLogin: async () => {},
  logout: async () => {},
};

export function render(path: string): string {
  const page = PAGE_COMPONENTS[path];
  if (!page) throw new Error(`No pre-rendered page for ${path}`);
  return renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={guest}>
        <StaticRouter location={path}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="*" element={page()} />
            </Route>
          </Routes>
        </StaticRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
