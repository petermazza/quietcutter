import { describe, expect, it } from "vitest";
import { TestClient, uniqueEmail } from "../helpers/http";

describe("authentication", () => {
  it("rejects /api/auth/user when not signed in", async () => {
    const client = new TestClient();
    const res = await client.get("/api/auth/user");
    expect(res.status).toBe(401);
  });

  it("registers a new account and stays signed in", async () => {
    const client = new TestClient();
    const email = uniqueEmail("register");
    const res = await client.register(email, "testpassword123", { firstName: "Test" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);

    const me = await client.get("/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it("rejects duplicate email registration", async () => {
    const client = new TestClient();
    const email = uniqueEmail("dupe");
    await client.register(email);
    const res = await client.register(email);
    expect(res.status).toBe(400);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const client = new TestClient();
    const res = await client.register(uniqueEmail("short"), "abc");
    expect(res.status).toBe(400);
  });

  it("rejects registration without email or password", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/register", { email: uniqueEmail("missing") });
    expect(res.status).toBe(400);
  });

  it("rejects a wrong password but accepts the right one", async () => {
    const email = uniqueEmail("login");
    const password = "correct-horse-123";

    const signer = new TestClient();
    await signer.register(email, password);

    const bad = new TestClient();
    const badRes = await bad.login(email, "wrong-password-999");
    expect(badRes.status).toBe(401);

    const good = new TestClient();
    const goodRes = await good.login(email, password);
    expect(goodRes.status).toBe(200);
    expect(goodRes.body.user.email).toBe(email);
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
