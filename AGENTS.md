# QuietCutter

Audio/video silence-removal app. See `replit.md` for full architecture notes.

## Local setup

- Requires: Node, PostgreSQL, ffmpeg (`brew install ffmpeg`).
- Local Postgres runs on port **5433** (not the default 5432).
- Settings live in `.env.development` (gitignored): `DATABASE_URL`, `SESSION_SECRET`, `PORT=5000`.
- Create the database with `createdb -p 5433 quietcutter`, then `npm run db:push` to create tables. The dev server skips migrations on localhost.
- `npm run dev` starts the app on http://localhost:5000.
- `admin@quietcutter.dev` is created automatically; `POST /api/auth/admin-login` signs in as that user with full Pro access.
- Sign-in is passwordless: `POST /api/auth/otp/send` emails a 6-digit code (via Resend) and `POST /api/auth/otp/verify` redeems it, creating an account automatically for new emails. Codes are stored as HMAC-SHA256 hashes in `otp_codes`, expire in 10 minutes, allow 5 wrong attempts, and are single-use; requesting a new code invalidates older ones. Email/password auth and Passport's local strategy were removed.
- In dev without `RESEND_API_KEY`, `sendOtpEmail` logs the code to the server console (`[OTP] Sign-in code for ...`) instead of sending email. In production it must be set or OTP send returns 503.

## Testing

- `npm test` — API suite (Vitest) including the adversarial/security tests. Boots a throwaway copy of the app on port 5055 against the `quietcutter_test` database (wiped each run) and exercises real uploads through real ffmpeg processing.
- `npm run test:flood` — rate-limit test, kept separate because it deliberately exhausts the upload limit; would throttle anything running after it in the same server.
- `npm run test:e2e` — browser tests (Playwright, chromium). Same test server/database.
- Test DB: `createdb -p 5433 quietcutter_test` + `DATABASE_URL=postgresql://<user>@localhost:5433/quietcutter_test npm run db:push`. Override location with `TEST_DATABASE_URL`.
- The server rate-limits uploads to 10 per 15 min per IP by default; tests raise it via `UPLOAD_RATE_LIMIT=200`. The limiter is in-memory and resets when the test server restarts. The same pattern applies to OTP endpoints: `OTP_RATE_LIMIT` (send) and `OTP_VERIFY_RATE_LIMIT` (verify) are raised to 500 in tests, and `OTP_COOLDOWN_SECONDS=0` disables the 30s resend cooldown.
- OTP codes in tests are never emailed: when `OTP_TEST_CAPTURE_FILE` is set, `sendOtpEmail` writes `{ email: code }` to that JSON file instead of calling Resend. API tests read it via `readCapturedOtp` in `tests/helpers/http.ts` and e2e tests via `e2e/helpers.ts` (`/tmp/quietcutter-e2e-otp.json`). `TestClient.register(email)` performs the full send→capture→verify flow.
- Auth0 sign-in is tested end to end: the test setup generates a throwaway keypair and serves the public half over `AUTH0_JWKS_URL`, so the server does real signature verification without hitting Auth0. Tests sign tokens via `signAuth0TestToken` in `tests/helpers/auth0.ts`.
- `/api/auth/auth0-callback` only responds when `AUTH0_DOMAIN` + `AUTH0_CLIENT_ID` are set, and it verifies the ID token server-side (signature against Auth0's JWKS, issuer, audience, expiry, plus the nonce from the login attempt — `server/auth/auth0.ts`, tested in `tests/unit/auth0.test.ts`). User profile fields come from the verified claims, never from the request body. Unverified emails are rejected when Auth0 reports them. The client stores `state`/`nonce` in sessionStorage before redirecting and checks `state` on return.

## Verification

- `npm run check` (tsc) — clean.
- `npm test` / `npm run test:e2e` — all green.
