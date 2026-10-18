import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5055",
    headless: true,
  },
  webServer: {
    command: "npx tsx server/index.ts",
    url: "http://127.0.0.1:5055/api/subscription/status",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        "postgresql://petermazza@localhost:5433/quietcutter_test",
      SESSION_SECRET: "quietcutter-test-session-secret",
      // OTP codes are captured to a local file instead of emailed so browser
      // tests can complete the sign-in flow without a real inbox.
      OTP_TEST_CAPTURE_FILE: "/tmp/quietcutter-e2e-otp.json",
      OTP_RATE_LIMIT: "500",
      OTP_VERIFY_RATE_LIMIT: "500",
      OTP_COOLDOWN_SECONDS: "0",
      PORT: "5055",
      HOST: "127.0.0.1",
    },
  },
});
