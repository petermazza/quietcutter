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

- `npm test` — API suite (Vitest). Boots a throwaway copy of the app on port 5055 against the `quietcutter_test` database (wiped each run) and exercises real uploads through real ffmpeg processing.
- `npm run test:e2e` — browser tests (Playwright, chromium). Same test server/database.
- Test DB: `createdb -p 5433 quietcutter_test` + `DATABASE_URL=postgresql://<user>@localhost:5433/quietcutter_test npm run db:push`. Override location with `TEST_DATABASE_URL`.
- The server rate-limits uploads to 10 per 15 min per IP — the suite stays under that, so keep the total upload count in mind when adding tests. The limiter is in-memory and resets when the test server restarts.

## Verification

- `npm run check` (tsc) — clean.
- `npm test` / `npm run test:e2e` — all green.
