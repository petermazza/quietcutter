import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    // Lets tests import server modules that use the app's "@shared" alias.
    alias: { "@shared": path.resolve(__dirname, "shared") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // The suite shares one test server and one database — run files serially
    // so rate limits and row counts stay predictable.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 90_000,
    hookTimeout: 120_000,
  },
});
