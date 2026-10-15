// Runs after `vite build` + `vite build --ssr src/prerender.tsx`: writes the pre-rendered public
// pages, the client-side app shell (app.html), sitemap.xml and robots.txt into dist/.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const ssrDir = new URL('../dist-ssr/', import.meta.url);
const { render, PAGES, APP_META, SITE_URL, headTags } = await import(new URL('prerender.js', ssrDir));

const template = readFileSync(new URL('index.html', dist), 'utf8');
const withHead = (html, head) => html.replace(/<title>[\s\S]*?<\/title>/, head);

// App shell for every other route (rooms, account, admin…): default head, no page content.
writeFileSync(new URL('app.html', dist), withHead(template, headTags(APP_META, { canonical: false })));

for (const page of PAGES) {
  const body = render(page.path);
  const html = withHead(template, headTags(page)).replace(
    '<div id="root"></div>',
    `<div id="root"><div data-prerender>${body}</div></div>`,
  );
  writeFileSync(new URL(page.file, dist), html);
  console.log(`prerendered ${page.path} -> dist/${page.file} (${(html.length / 1024).toFixed(1)} kB)`);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
);
writeFileSync(
  new URL('robots.txt', dist),
  `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /account
Disallow: /room/
Disallow: /games/
Disallow: /login

Sitemap: ${SITE_URL}/sitemap.xml
`,
);
rmSync(ssrDir, { recursive: true, force: true });
