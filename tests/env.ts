// Shared settings for the test environment. The test server runs on its own
// port against a separate database so test runs never touch dev data.
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { AUTH0_TEST_CLIENT_ID, AUTH0_TEST_DOMAIN } from "./helpers/auth0";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const TEST_PORT = 5055;
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://petermazza@localhost:5433/quietcutter_test";

// When the test server sees this env var it records each OTP code here
// (keyed by email) instead of calling Resend — see server/auth/otp.ts.
export const OTP_CAPTURE_FILE = path.join(
  os.tmpdir(),
  "quietcutter-test-otp.json"
);

export function testServerEnv(auth0JwksUrl?: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: TEST_DATABASE_URL,
    SESSION_SECRET: "quietcutter-test-session-secret",
    // Auth0 is "configured" for the test server, but pointed at a local JWKS
    // stand-in so sign-in tests verify real signatures without hitting Auth0.
    ...(auth0JwksUrl
      ? {
          AUTH0_DOMAIN: AUTH0_TEST_DOMAIN,
          AUTH0_CLIENT_ID: AUTH0_TEST_CLIENT_ID,
          AUTH0_JWKS_URL: auth0JwksUrl,
        }
      : {}),
    // Raised so the suite's real uploads don't trip the limiter; the flood
    // test pushes past this deliberately to prove throttling still works.
    UPLOAD_RATE_LIMIT: "200",
    // OTP codes are captured to OTP_CAPTURE_FILE instead of emailed; the
    // limits are raised so dozens of OTP sign-ins per run don't throttle,
    // and the resend cooldown is disabled.
    OTP_TEST_CAPTURE_FILE: OTP_CAPTURE_FILE,
    OTP_RATE_LIMIT: "500",
    OTP_VERIFY_RATE_LIMIT: "500",
    OTP_COOLDOWN_SECONDS: "0",
    PORT: String(TEST_PORT),
    HOST: "127.0.0.1",
  };
}
