import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { TestClient, uniqueEmail, waitForFileStatus, readCapturedOtp } from "../helpers/http";
import { formWithFile, makeAudioWithSilence, tmpFile } from "../helpers/media";
import { makeUserPro } from "../helpers/db";
import { PROJECT_ROOT } from "../env";

describe("adversarial: authentication", () => {
  it("refuses sessions built from self-declared Auth0 identities", async () => {
    const victim = new TestClient();
    const email = uniqueEmail("victim");
    await victim.register(email);
    await victim.post("/api/projects", { name: "Victim's Private Project" });

    // An attacker claims the victim's identity with no proof whatsoever.
    const attacker = new TestClient();
    const res = await attacker.post("/api/auth/auth0-callback", { user: { email } });
    expect([401, 403, 503]).toContain(res.status);

    const projects = await attacker.get("/api/projects");
    const names = (projects.body || []).map((p: any) => p.name);
    expect(names).not.toContain("Victim's Private Project");
  });

  it("creates no session when verifying a code that was never sent", async () => {
    const attacker = new TestClient();
    const victimEmail = uniqueEmail("otp-victim");
    await attacker.requestOtp(uniqueEmail("attacker"));

    // Guessing a code for someone else's email proves nothing.
    const res = await attacker.verifyOtp(victimEmail, "123456");
    expect(res.status).toBe(401);
    expect((await attacker.get("/api/auth/user")).status).toBe(401);
  });

  it("ignores isAdmin sent during OTP verification", async () => {
    const client = new TestClient();
    const email = uniqueEmail("escalate");
    await client.requestOtp(email);
    const res = await client.post("/api/auth/otp/verify", {
      email,
      code: readCapturedOtp(email),
      isAdmin: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.isAdmin).toBeFalsy();
  });

  it("rejects malformed OTP payloads without crashing", async () => {
    const client = new TestClient();
    const badEmail = await client.post("/api/auth/otp/send", {
      email: "not-an-email",
    });
    expect(badEmail.status).toBe(400);

    const objectEmail = await client.post("/api/auth/otp/send", {
      email: { inject: true },
    });
    expect(objectEmail.status).toBeLessThan(500);

    const objectVerify = await client.post("/api/auth/otp/verify", {
      email: { $gt: "" },
      code: ["a", "b"],
    });
    expect(objectVerify.status).toBeLessThan(500);

    const injection = await client.post("/api/auth/otp/verify", {
      email: "a@b.co",
      code: "123456' OR '1'='1",
    });
    expect(injection.status).toBe(400);
  });
});

describe("adversarial: stored input and ids", () => {
  it("stores dangerous-looking names literally and stays healthy", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("sqli"));

    const nasty = `x'; DROP TABLE users; -- <script>alert(1)</script>`;
    const res = await client.post("/api/projects", { name: nasty });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(nasty);

    const other = new TestClient();
    expect((await other.register(uniqueEmail("aftermath"))).status).toBe(200);
  });

  it("cannot transfer project ownership through update fields", async () => {
    const owner = new TestClient();
    await owner.register(uniqueEmail("own"));
    const created = await owner.post("/api/projects", { name: "Mine" });

    const updated = await owner.patch(`/api/projects/${created.body.id}`, {
      name: "Still Mine",
      userId: "someone-else",
      isAdmin: true,
    });
    expect(updated.body.userId).not.toBe("someone-else");
    expect(updated.body).not.toHaveProperty("isAdmin");
  });

  it("returns 404, not a crash, for non-numeric file ids", async () => {
    const client = new TestClient();
    expect((await client.get("/api/files/abc/download")).status).toBe(404);
    expect((await client.delete("/api/files/abc")).status).toBe(404);
    expect((await client.get("/api/files/abc/preview")).status).toBe(404);
  });

  it("returns 404, not a crash, for non-numeric preset ids", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("presetid"));
    expect((await client.delete("/api/presets/abc")).status).toBe(404);
  });

  it("rejects batch downloads with garbage file ids", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("garbagezip"));
    const res = await client.post("/api/files/batch-download", {
      fileIds: ["abc", { x: 1 }, null],
    });
    expect(res.status).toBeLessThan(500);
  });

  it("rejects oversized JSON bodies", async () => {
    const client = new TestClient();
    const res = await client.post("/api/projects", { name: "x".repeat(2 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe("adversarial: uploads", () => {
  it("keeps uploaded files inside the uploads directory", async () => {
    const client = new TestClient();
    const wav = await makeAudioWithSilence(tmpFile("safe.wav"));

    const form = new FormData();
    form.append("audio", new Blob([fs.readFileSync(wav)]), "../../evil-traversal.wav");
    const res = await client.postForm("/api/upload", form);
    expect(res.status).toBe(201);

    const stored = res.body.files[0].originalFilePath;
    const uploadsDir = path.join(PROJECT_ROOT, "uploads") + path.sep;
    expect(path.resolve(stored).startsWith(uploadsDir)).toBe(true);
  });

  it("processes uploads even when settings fields contain garbage", async () => {
    const client = new TestClient();
    const wav = await makeAudioWithSilence(tmpFile("garbage.wav"));

    const res = await client.postForm(
      "/api/upload",
      formWithFile("audio", wav, {
        silenceThreshold: "abc; rm -rf /",
        minSilenceDuration: "not-a-number",
        outputFormat: "exe",
      })
    );
    expect(res.status).toBe(201);
    const file = res.body.files[0];
    await waitForFileStatus(client, res.body.id, file.id, "completed");
  });

  it("rejects files sent under the wrong form field", async () => {
    const client = new TestClient();
    const wav = await makeAudioWithSilence(tmpFile("wrongfield.wav"));
    const res = await client.postForm("/api/upload", formWithFile("file", wav));
    expect(res.status).toBe(400);
  });

  it("marks disguised non-audio files as failed instead of hanging", async () => {
    const client = new TestClient();
    const fake = tmpFile("fake.wav");
    fs.writeFileSync(fake, "this is definitely not audio data");

    const res = await client.postForm("/api/upload", formWithFile("audio", fake));
    expect(res.status).toBe(201);
    const file = res.body.files[0];
    await waitForFileStatus(client, res.body.id, file.id, "failed");
  });

  it("handles zero-byte uploads without crashing", async () => {
    const client = new TestClient();
    const empty = tmpFile("empty.wav");
    fs.writeFileSync(empty, "");

    const res = await client.postForm("/api/upload", formWithFile("audio", empty));
    expect([201, 400, 413]).toContain(res.status);
    if (res.status === 201) {
      const file = res.body.files[0];
      await waitForFileStatus(client, res.body.id, file.id, "failed");
    }
  });

  it("answers out-of-range preview requests without crashing", async () => {
    const client = new TestClient();
    const reg = await client.register(uniqueEmail("ranger"));
    await makeUserPro(reg.body.user.id);

    const wav = await makeAudioWithSilence(tmpFile("range.wav"));
    const res = await client.postForm("/api/upload", formWithFile("audio", wav));
    const file = res.body.files[0];
    await waitForFileStatus(client, res.body.id, file.id, "completed");

    const pastEnd = await client.request(`/api/files/${file.id}/preview`, {
      headers: { range: "bytes=999999999-" },
    });
    expect(pastEnd.status).toBe(416);

    const garbage = await client.request(`/api/files/${file.id}/preview`, {
      headers: { range: "bytes=abc-def" },
    });
    expect(garbage.status).toBe(416);
  });
});
