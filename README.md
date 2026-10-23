# Play Five in a Row

Live at **[playfiveinarow.com](https://playfiveinarow.com)**.

Online five-in-a-row (gomoku). Players put X and O inside the cells of a 15×15 white board, and the first to get five in a row wins. The app includes:

- Google sign-in
- a lobby of open rooms
- game rooms with live chat
- a personal game history with replays
- an admin panel for banning users, closing rooms and moderating chat

## Stack

| | |
|---|---|
| Frontend (`apps/web`) | React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, socket.io-client |
| Backend (`apps/server`) | NestJS 11 (Express), Socket.IO, Prisma 6, PostgreSQL |
| Shared (`packages/shared`) | Game rules (`findWinLine`), DTO types, Zod schemas, socket event names |
| Tests | Vitest (game rules, `GameService`), Playwright (two browsers play a full game) |

The server is authoritative. Clients only send `{x, y}`, and the server checks the turn, the cell and whether someone won. Live rooms are kept in server memory (a single process), and every move and result is written to Postgres.

## Getting started

```bash
npm install
cp apps/server/.env.example apps/server/.env   # set JWT_SECRET; see below for Google
npm run db:up                                  # Postgres in Docker on localhost:5433
npm run db:migrate
npm run dev                                    # web: http://localhost:5173  api: http://localhost:3000
```

With `DEV_LOGIN=true` (the default in `.env.example`), the login page also shows a "Sign in without Google" form. Use it to sign in as any email address. This form is always off when `NODE_ENV=production`.

### Google sign-in

1. Open Google Cloud Console and go to **APIs & Services → Credentials → Create credentials → OAuth client ID**. Choose the type **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and your production URL.
3. Put the client ID in `GOOGLE_CLIENT_ID` in `apps/server/.env`. The frontend reads it from `/api/auth/config`.

Sign-in flow: Google returns an ID token to the browser. The server checks it with `google-auth-library` and then sets its own httpOnly JWT cookie (`cc_token`, valid for 7 days).

### Admins

Any account whose email is listed in `ADMIN_EMAILS` (comma-separated) becomes an admin when it signs in. Admins can then promote other users from the admin panel.

### Unrated rooms and guests

When creating a room, a signed-in player can tick **Unrated, invite only**. Such rooms:

- are not listed in the lobby, so the host shares the room link;
- can be joined without an account: a signed-out visitor opening the link just picks a display name;
- are never rated, though the games still appear in signed-in players' history.

A guest is stored as a `User` row with `isGuest = true` and no email, so games, moves and chat work unchanged. The guest gets its own httpOnly cookie (`cc_guest`, valid for 30 days), which is accepted only on the socket, and only for unrated rooms. A guest token is never accepted as a signed-in session, and guests are hidden from the admin user list.

## Computer opponent

Easy, Medium and Hard use the site's own engine in `packages/shared/src/ai.ts`. It's a negamax search with VCF (forced wins by chains of fours), and it runs in a Web Worker.

**Expert** uses [Rapfi](https://github.com/dhbloo/rapfi), a Gomocup-winning engine, compiled to WebAssembly and run in the visitor's browser.

- The files live in `apps/web/public/engine/rapfi-<commit>/`: about 1.2 MB of WebAssembly plus 10 MB of freestyle network data. They're downloaded only when someone picks Expert, and are cached for good because the folder name is versioned.
- To rebuild them, run `scripts/build-rapfi.sh` (needs Docker). It pins the Rapfi commit, the network commit and the Emscripten version.
- Rapfi is GPL-3.0, so the engine folder ships with `COPYING.txt` and `SOURCE.txt`, and the Expert option links to them. The network weights are CC0.
- Expert talks to the engine over the Gomocup text protocol (`START`, `INFO …`, `BOARD … DONE`) through `apps/web/public/engine/rapfi-worker.js` and `apps/web/src/lib/rapfi.ts`.
- It needs WebAssembly SIMD, which every major browser has supported since 2023. Without it, the page offers Hard instead.

## Banning

To ban a user, open **Admin → Users → Ban** and give a reason and a duration (1, 7 or 30 days, or permanent). The ban takes effect immediately:

- All of the user's sockets are disconnected, and the user sees a page with the reason and when the ban ends.
- A game they are playing ends as a forfeit, and their opponent wins.
- Any waiting room they host is closed.
- Every REST request and socket handshake checks for an active ban, so tokens issued before the ban stop working.

Each ban is stored as its own row (`Ban` table), so the admin panel can show the full history, including lifted and expired bans. Admins cannot ban themselves or other admins.

## Game rules and timeouts

- X always moves first; in the first game of a room the host plays X. Five **or more** in a row wins.
- Each move has a **30-second limit**. A player who runs out of time loses (`TIMEOUT`); the game is rated like any other once at least 2 moves were played. Either player can propose turning the timer off, and it switches off for the rest of the game once the opponent accepts. Turning it back on needs agreement too, and a rematch always starts with the timer on.
- After a game, either player can offer a **rematch**. When the other accepts, a new rated game starts in the same room with colours swapped. An offer is withdrawn if its player leaves the room.
- The first person to join a waiting room becomes O. Anyone who joins after that watches the game and can use the chat.
- A player who disconnects has **30 seconds** to come back before they forfeit. A waiting room closes if its host stays away for 30 seconds.
- A finished room stays open for 10 minutes, so players can see the result and keep chatting.
- Restarting the server ends any unfinished games as `ABANDONED`, because live game state is kept only in memory.

## Scripts

| Command | |
|---|---|
| `npm run dev` | shared (watch) + server (watch) + Vite |
| `npm test` | unit tests (shared and server) |
| `npm run typecheck` | typecheck all workspaces |
| `npm run e2e` | Playwright browser test. Needs the database running and `DEV_LOGIN=true`; first run `npx playwright install chromium` |
| `npm run build` / `npm start` | production build; the server also serves `apps/web/dist` |

## Deploy

`docker compose --profile full up --build` builds a single image that runs the API and serves the web app on port 3000. It applies pending migrations on start and reads `apps/server/.env`. For a real deployment, set `NODE_ENV=production`, a strong `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `DATABASE_URL`, and serve it over HTTPS, because the session cookie is `Secure` in production.

To run more than one server instance later, add the Socket.IO Redis adapter and move the in-memory room state (`GameService`) to Redis.
