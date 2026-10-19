// Shared settings for the test environment. The test server runs on its own
// port against a separate database so test runs never touch dev data.
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { AUTH0_TEST_CLIENT_ID, AUTH0_TEST_DOMAIN } from "./helpers/auth0";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const TEST_PORT = 5055;
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://petermazza@localhost:5433/quietcutter_test";

// The suite wipes this database — refuse anything that could point at a
// live or hosted database.
const testDbHost = new URL(testDbUrl).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(testDbHost)) {
  throw new Error(
    `TEST_DATABASE_URL must point at a local database (got host "${testDbHost}")`,
  );
}

export const TEST_DATABASE_URL = testDbUrl;

// When the test server sees this env var it records each OTP code here
// (keyed by email) instead of calling Resend — see server/auth/otp.ts.
export const OTP_CAPTURE_FILE = path.join(
  os.tmpdir(),
  "quietcutter-test-otp.json"
);

// Same idea for contact-form emails: the server writes the would-be Resend
// payload here so tests can inspect exactly what support would receive.
export const CONTACT_EMAIL_CAPTURE_FILE = path.join(
  os.tmpdir(),
  "quietcutter-test-contact-email.json"
);

// Raised by one above the real default (3/hour) so the escaping test gets a
// submission without exhausting the budget the rate-limit test relies on.
export const CONTACT_RATE_LIMIT = "4";

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
    // OTP codes are captured to OTP_CAPTURE_FILE instead of emailed, and the
    // send/verify limits are raised so dozens of OTP sign-ins don't throttle.
    // The 30-second resend cooldown stays on so the suite can verify it.
    OTP_TEST_CAPTURE_FILE: OTP_CAPTURE_FILE,
    OTP_RATE_LIMIT: "500",
    OTP_VERIFY_RATE_LIMIT: "500",
    CONTACT_EMAIL_CAPTURE_FILE: CONTACT_EMAIL_CAPTURE_FILE,
    CONTACT_RATE_LIMIT: CONTACT_RATE_LIMIT,
    PORT: String(TEST_PORT),
    HOST: "127.0.0.1",
  };
}
