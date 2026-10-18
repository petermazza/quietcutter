import { describe, expect, it } from "vitest";
import { TestClient, uniqueEmail, readCapturedOtp } from "../helpers/http";

describe("authentication", () => {
  it("rejects /api/auth/user when not signed in", async () => {
    const client = new TestClient();
    const res = await client.get("/api/auth/user");
    expect(res.status).toBe(401);
  });

  it("creates an account and signs in with a valid code", async () => {
    const client = new TestClient();
    const email = uniqueEmail("register");
    const res = await client.register(email);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);

    const me = await client.get("/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it("signs a returning user into the same account", async () => {
    const email = uniqueEmail("returning");
    const first = new TestClient();
    const firstRes = await first.register(email);
    expect(firstRes.status).toBe(200);

    const second = new TestClient();
    const secondRes = await second.register(email);
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.user.id).toBe(firstRes.body.user.id);
    expect(secondRes.body.user.email).toBe(email);
  });

  it("matches emails case-insensitively", async () => {
    const email = uniqueEmail("case");
    const first = new TestClient();
    const firstRes = await first.register(email);
    expect(firstRes.status).toBe(200);

    const upper = email.toUpperCase();
    const second = new TestClient();
    const sent = await second.requestOtp(upper);
    expect(sent.status).toBe(200);
    const res = await second.verifyOtp(upper, readCapturedOtp(email));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(firstRes.body.user.id);
  });

  it("rejects a wrong code and keeps the user signed out", async () => {
    const client = new TestClient();
    const email = uniqueEmail("wrongcode");
    await client.requestOtp(email);

    const res = await client.verifyOtp(email, "000000");
    expect(res.status).toBe(401);
    expect((await client.get("/api/auth/user")).status).toBe(401);
  });

  it("rejects replaying a code after a successful sign-in", async () => {
    const client = new TestClient();
    const email = uniqueEmail("replay");
    await client.requestOtp(email);
    const code = readCapturedOtp(email);

    expect((await client.verifyOtp(email, code)).status).toBe(200);

    const again = new TestClient();
    const res = await again.verifyOtp(email, code);
    expect(res.status).toBe(401);
    expect((await again.get("/api/auth/user")).status).toBe(401);
  });

  it("invalidates an older code when a new one is sent", async () => {
    const client = new TestClient();
    const email = uniqueEmail("supersede");
    await client.requestOtp(email);
    const oldCode = readCapturedOtp(email);

    await client.requestOtp(email);
    const newCode = readCapturedOtp(email);
    expect(newCode).not.toBe(oldCode);

    expect((await client.verifyOtp(email, oldCode)).status).toBe(401);
    expect((await client.verifyOtp(email, newCode)).status).toBe(200);
  });

  it("locks a code after 5 wrong attempts, even for the right code", async () => {
    const client = new TestClient();
    const email = uniqueEmail("lockout");
    await client.requestOtp(email);
    const code = readCapturedOtp(email);

    for (let i = 0; i < 5; i++) {
      const wrong = (await client.verifyOtp(email, "000000" === code ? "111111" : "000000"));
      expect(wrong.status).toBe(401);
    }

    // The correct code no longer works — the attempt is burned.
    const res = await client.verifyOtp(email, code);
    expect(res.status).toBe(401);
  });

  it("rejects invalid emails and malformed codes with 400", async () => {
    const client = new TestClient();
    expect((await client.requestOtp("not-an-email")).status).toBe(400);

    const email = uniqueEmail("badcode");
    await client.requestOtp(email);
    expect((await client.verifyOtp(email, "12345")).status).toBe(400);
    expect((await client.verifyOtp(email, "abcdef")).status).toBe(400);
  });

  it("logs out and ends the session", async () => {
    const client = new TestClient();
    await client.register(uniqueEmail("logout"));
    const res = await client.logout();
    expect(res.status).toBe(200);

    const me = await client.get("/api/auth/user");
    expect(me.status).toBe(401);
  });

  it("admin login grants Pro access", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/admin-login", {});
    expect(res.status).toBe(200);
    expect(res.body.user.isAdmin).toBe(true);

    const status = await client.get("/api/subscription/status");
    expect(status.body.isPro).toBe(true);
  });
});
