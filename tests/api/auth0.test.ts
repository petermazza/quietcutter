import { describe, expect, it } from "vitest";
import { TestClient, uniqueEmail } from "../helpers/http";
import { signAuth0TestToken } from "../helpers/auth0";

// Exercises the real endpoint on the test server: tokens are signed by a
// throwaway keypair whose public half is served to the server as a JWKS,
// so every test goes through genuine signature verification.
describe("auth0 sign-in", () => {
  it("creates a session from a genuinely signed token", async () => {
    const client = new TestClient();
    const email = uniqueEmail("auth0");
    const token = await signAuth0TestToken({ email, nonce: "n-1" });

    const res = await client.post("/api/auth/auth0-callback", {
      idToken: token,
      nonce: "n-1",
    });
    expect(res.status).toBe(200);

    const me = await client.get("/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it("ignores identity claims smuggled in the request body", async () => {
    const victim = new TestClient();
    const victimEmail = uniqueEmail("victim");
    await victim.register(victimEmail);

    const attacker = new TestClient();
    const attackerEmail = uniqueEmail("attacker");
    const token = await signAuth0TestToken({ email: attackerEmail, nonce: "n-2" });
    const res = await attacker.post("/api/auth/auth0-callback", {
      idToken: token,
      nonce: "n-2",
      user: { email: victimEmail },
    });
    expect(res.status).toBe(200);

    const me = await attacker.get("/api/auth/user");
    expect(me.body.email).toBe(attackerEmail);
  });

  it("rejects a token replayed with the wrong nonce", async () => {
    const client = new TestClient();
    const token = await signAuth0TestToken({ nonce: "n-3" });
    const res = await client.post("/api/auth/auth0-callback", {
      idToken: token,
      nonce: "different-nonce",
    });
    expect(res.status).toBe(401);
    expect((await client.get("/api/auth/user")).status).toBe(401);
  });

  it("rejects a token meant for a different app", async () => {
    const client = new TestClient();
    const token = await signAuth0TestToken({ aud: "someone-elses-client" });
    const res = await client.post("/api/auth/auth0-callback", {
      idToken: token,
      nonce: "test-nonce",
    });
    expect(res.status).toBe(401);
  });

  it("rejects forged and malformed tokens", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/auth0-callback", {
      idToken: "totally-forged",
      nonce: "n",
    });
    expect(res.status).toBe(401);
  });

  it("rejects requests that carry no token at all", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/auth0-callback", {
      user: { email: "anyone@example.com" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects tokens whose email Auth0 never verified", async () => {
    const client = new TestClient();
    const token = await signAuth0TestToken({ email_verified: false });
    const res = await client.post("/api/auth/auth0-callback", {
      idToken: token,
      nonce: "test-nonce",
    });
    expect(res.status).toBe(403);
    expect((await client.get("/api/auth/user")).status).toBe(401);
  });
});
