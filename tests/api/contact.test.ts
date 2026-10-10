import { describe, expect, it } from "vitest";
import { TestClient } from "../helpers/http";
import { BASE_URL } from "../env";
import { getContactMessageCount } from "../helpers/db";

describe("contact form", () => {
  it("rejects submissions with missing fields", async () => {
    const client = new TestClient();
    const res = await client.post("/api/contact", { name: "Test", email: "t@t.dev" });
    expect(res.status).toBe(400);
  });

  it("saves a valid message to the database", async () => {
    const before = await getContactMessageCount();

    const client = new TestClient();
    const res = await client.post("/api/contact", {
      name: "Test User",
      email: "test@example.com",
      subject: "Hello",
      message: "This is a test message.",
    });
    expect(res.status).toBe(201);

    expect(await getContactMessageCount()).toBe(before + 1);
  });

  it("rate limits after 3 submissions per hour", async () => {
    const client = new TestClient();
    const payload = { name: "T", email: "t@t.dev", subject: "s", message: "m" };

    // Two earlier requests in this file already count toward the same-IP limit.
    const third = await client.post("/api/contact", payload);
    expect(third.status).toBe(201);
    const fourth = await client.post("/api/contact", payload);
    expect(fourth.status).toBe(429);
  });
});

describe("security headers", () => {
  it("sets protective headers on responses", async () => {
    const res = await fetch(`${BASE_URL}/api/subscription/status`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
