# QuietCutter

Audio/video silence-removal app. See `replit.md` for full architecture notes.

## Local setup

- Requires: Node, PostgreSQL, ffmpeg (`brew install ffmpeg`).
- Local Postgres runs on port **5433** (not the default 5432).
- Settings live in `.env.development` (gitignored): `DATABASE_URL`, `SESSION_SECRET`, `PORT=5000`.
- Create the database with `createdb -p 5433 quietcutter`, then `npm run db:push` to create tables. The dev server skips migrations on localhost.
- `npm run dev` starts the app on http://localhost:5000.
- `admin@quietcutter.dev` is created automatically; `POST /api/auth/admin-login` signs in as that user with full Pro access.

## Testing

- `npm test` — API suite (Vitest) including the adversarial/security tests. Boots a throwaway copy of the app on port 5055 against the `quietcutter_test` database (wiped each run) and exercises real uploads through real ffmpeg processing.
- `npm run test:flood` — rate-limit test, kept separate because it deliberately exhausts the upload limit; would throttle anything running after it in the same server.
- `npm run test:e2e` — browser tests (Playwright, chromium). Same test server/database.
- Test DB: `createdb -p 5433 quietcutter_test` + `DATABASE_URL=postgresql://<user>@localhost:5433/quietcutter_test npm run db:push`. Override location with `TEST_DATABASE_URL`.
- The server rate-limits uploads to 10 per 15 min per IP by default; tests raise it via `UPLOAD_RATE_LIMIT=200`. The limiter is in-memory and resets when the test server restarts.
- `/api/auth/auth0-callback` trusts client-supplied identity. It only responds when `AUTH0_DOMAIN` + `AUTH0_CLIENT_ID` are set — and even then it does NOT verify the Auth0 token server-side, so hardening it properly (JWT verification against Auth0's keys) is still needed before relying on it in production.

## Verification

- `npm run check` (tsc) — clean.
- `npm test` / `npm run test:e2e` — all green.
