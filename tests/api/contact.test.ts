import { describe, expect, it } from "vitest";
import fs from "fs";
import { TestClient } from "../helpers/http";
import { BASE_URL, CONTACT_EMAIL_CAPTURE_FILE, CONTACT_RATE_LIMIT } from "../env";
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

  it("escapes visitor content so scripts can't ride along in the email", async () => {
    const client = new TestClient();
    const res = await client.post("/api/contact", {
      name: '<script>alert("hi")</script>',
      email: "test@example.com",
      subject: '<img src=x onerror=alert(1)>',
      message: 'first line\n<script>alert("x")</script>',
    });
    expect(res.status).toBe(201);

    const captured = JSON.parse(
      fs.readFileSync(CONTACT_EMAIL_CAPTURE_FILE, "utf-8")
    );
    expect(captured.html).not.toContain("<script>");
    expect(captured.html).toContain("&lt;script&gt;");
    expect(captured.subject).toContain("&lt;img");
    // Newlines still render as line breaks.
    expect(captured.html).toContain("first line<br />");
  });

  it("rate limits repeated submissions", async () => {
    const client = new TestClient();
    const payload = { name: "T", email: "t@t.dev", subject: "s", message: "m" };

    // The earlier posts in this file already count toward the same-IP limit,
    // so fill the remaining budget and prove the next one is refused.
    const budgetLeft = Number(CONTACT_RATE_LIMIT) - 3;
    for (let i = 0; i < budgetLeft; i++) {
      expect((await client.post("/api/contact", payload)).status).toBe(201);
    }
    const over = await client.post("/api/contact", payload);
    expect(over.status).toBe(429);
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
