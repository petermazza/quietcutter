import { describe, expect, it } from "vitest";
import fs from "fs";
import { TestClient } from "../helpers/http";
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
});
