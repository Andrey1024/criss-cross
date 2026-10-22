import './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { config } from './config';

/** Public pages pre-rendered by the web build (see apps/web/scripts/prerender.mjs). */
const PRERENDERED: Record<string, string> = {
  '/rules': 'rules.html',
  '/play/computer': 'play-computer.html',
  '/privacy': 'privacy.html',
  '/terms': 'terms.html',
};

async function bootstrap() {
  config.jwtSecret; // fail fast if missing
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Permanent redirect from old domains (e.g. five-in-row.com) to the canonical one.
  const { canonicalHost, redirectFromHosts } = config;
  if (canonicalHost && redirectFromHosts.length) {
    app.use((req: any, res: any, next: () => void) => {
      const host = String(req.headers.host ?? '').split(':')[0].toLowerCase();
      if (!redirectFromHosts.includes(host)) return next();
      const status = req.method === 'GET' || req.method === 'HEAD' ? 301 : 308;
      res.redirect(status, `https://${canonicalHost}${req.originalUrl}`);
    });
  }
  app.use(compression());
  app.use(cookieParser());
  app.enableShutdownHooks();

  // In production the server also serves the built React app (single deployable).
  const webDist = process.env.WEB_DIST ?? join(__dirname, '..', '..', 'web', 'dist');
  if (config.isProduction && existsSync(webDist)) {
    // "/" is served by the static index.html (the pre-rendered landing page).
    app.useStaticAssets(webDist, {
      setHeaders: (res, path) => {
        // Hashed bundles and the versioned engine folder never change: cache them for good.
        if (/[/\\](assets|engine[/\\]rapfi-[0-9a-f]+)[/\\]/.test(path)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    });
    const appShell = existsSync(join(webDist, 'app.html')) ? 'app.html' : 'index.html';
    app.use((req: any, res: any, next: () => void) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      // A missing engine or asset file is a 404, not the app shell.
      if (req.path.startsWith('/engine/') || req.path.startsWith('/assets/')) return next();
      // Pre-rendered public pages first, then the client-side app shell.
      const page = PRERENDERED[req.path.replace(/\/+$/, '')];
      res.sendFile(join(webDist, page && existsSync(join(webDist, page)) ? page : appShell));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
