// Shared settings for the test environment. The test server runs on its own
// port against a separate database so test runs never touch dev data.
import path from "path";
import { fileURLToPath } from "url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const TEST_PORT = 5055;
export const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://petermazza@localhost:5433/quietcutter_test";

export function testServerEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: TEST_DATABASE_URL,
    SESSION_SECRET: "quietcutter-test-session-secret",
    // Raised so the suite's real uploads don't trip the limiter; the flood
    // test pushes past this deliberately to prove throttling still works.
    UPLOAD_RATE_LIMIT: "200",
    PORT: String(TEST_PORT),
    HOST: "127.0.0.1",
  };
}
