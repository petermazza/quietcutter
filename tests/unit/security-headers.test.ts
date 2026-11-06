import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Contract: the security-headers middleware must keep sending the
// baseline browser headers. Source-scan matches the existing m10-guards
// style; if a setHeader is removed this fails.
const REQUIRED = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
  "Content-Security-Policy",
];

describe("security headers middleware", () => {
  const src = fs.readFileSync(path.join(ROOT, "server/index.ts"), "utf8");
  for (const key of REQUIRED) {
    it(`sets ${key}`, () => {
      expect(src).toContain(`res.setHeader('${key}'`);
    });
  }
});
