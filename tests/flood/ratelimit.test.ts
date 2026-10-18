import { describe, expect, it } from "vitest";
import fs from "fs";
import { TestClient, uniqueEmail } from "../helpers/http";
import { formWithFile, tmpFile } from "../helpers/media";

// Runs in its own invocation (npm run test:flood) because it deliberately
// exhausts the server's upload rate limit for the whole window — any test
// running after it in the same process would get throttled too.
describe("rate limiting", () => {
  it("throttles upload floods", async () => {
    const client = new TestClient();
    const bad = tmpFile("bad.txt");
    fs.writeFileSync(bad, "nope");

    let saw429 = false;
    for (let i = 0; i < 250 && !saw429; i++) {
      const res = await client.postForm("/api/upload", formWithFile("audio", bad));
      if (res.status === 429) saw429 = true;
    }
    expect(saw429).toBe(true);
  });

  // OTP_RATE_LIMIT is 500 for the test server. Each request uses a fresh
  // email so the 30-second resend cooldown (also a 429) can't mask or
  // shortcut the per-IP throttle being measured.
  it("throttles sign-in code request floods", async () => {
    const client = new TestClient();

    let saw429 = false;
    for (let i = 0; i < 520 && !saw429; i++) {
      const res = await client.requestOtp(uniqueEmail(`otp-flood-${i}`));
      if (res.status === 429) saw429 = true;
    }
    expect(saw429).toBe(true);
  });

  // OTP_VERIFY_RATE_LIMIT is also 500 — a brute-force script guessing codes
  // hits the same wall before it can try many combinations.
  it("throttles sign-in code verification floods", async () => {
    const client = new TestClient();

    let saw429 = false;
    for (let i = 0; i < 520 && !saw429; i++) {
      const res = await client.verifyOtp(uniqueEmail(`otp-guess-${i}`), "000000");
      if (res.status === 429) saw429 = true;
    }
    expect(saw429).toBe(true);
  });
});
