// Runs after `vite build` + `vite build --ssr src/prerender.tsx`: writes the pre-rendered public
// pages (one per language), the client-side app shells (app.html, app-ru.html…), sitemap.xml and
// robots.txt into dist/.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const ssrDir = new URL('../dist-ssr/', import.meta.url);
const { render, PAGES, APP_META, LOCALE, SITE_URL, headTags, pageUrl } = await import(new URL('prerender.js', ssrDir));

const template = readFileSync(new URL('index.html', dist), 'utf8');
const page = (head, lang, body = '') =>
  template
    .replace(/<html lang="[^"]*">/, `<html lang="${LOCALE[lang]}">`)
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace('<div id="root"></div>', body ? `<div id="root"><div data-prerender>${body}</div></div>` : '<div id="root"></div>');

// App shells for every other route (rooms, account, admin…): default head, no page content.
for (const meta of APP_META) writeFileSync(new URL(meta.file, dist), page(headTags(meta, { canonical: false }), meta.lang));

for (const p of PAGES) {
  const html = page(headTags(p), p.lang, render(p.path, p.lang));
  writeFileSync(new URL(p.file, dist), html);
  console.log(`prerendered ${pageUrl(p.path, p.lang).replace(SITE_URL, '') || '/'} -> dist/${p.file} (${(html.length / 1024).toFixed(1)} kB)`);
}

const today = new Date().toISOString().slice(0, 10);
const alternates = (p) =>
  p.langs.length > 1
    ? p.langs.map((l) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(p.path, l)}"/>`).join('')
    : '';
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map((p) => `  <url><loc>${pageUrl(p.path, p.lang)}</loc><lastmod>${today}</lastmod>${alternates(p)}\n  </url>`).join('\n')}
</urlset>
`,
);

const privatePaths = ['/admin', '/account', '/room/', '/games/', '/login'];
const prefixes = ['', ...Object.keys(LOCALE).filter((l) => l !== 'en').map((l) => `/${l}`)];
writeFileSync(
  new URL('robots.txt', dist),
  `User-agent: *
Allow: /
Disallow: /api/
${prefixes.flatMap((pre) => privatePaths.map((path) => `Disallow: ${pre}${path}`)).join('\n')}

Sitemap: ${SITE_URL}/sitemap.xml
`,
);
rmSync(ssrDir, { recursive: true, force: true });
