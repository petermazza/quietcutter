import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { TestClient, uniqueEmail } from "../helpers/http";
import { getSubscription } from "../helpers/db";
import { BASE_URL, TEST_DATABASE_URL } from "../env";

// server/db and the Stripe client read env at import/first use, so point them
// at the test database and a throwaway key before importing server modules.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.STRIPE_SECRET_KEY = "sk_test_quietcutter";
const WEBHOOK_SECRET = "whsec_quietcutter_test";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const stripe = new Stripe("sk_test_quietcutter");

// Signs a payload the way Stripe would, so constructEvent does real HMAC
// verification — not a mock.
function signedHeader(payload: string, secret = WEBHOOK_SECRET): string {
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

function eventPayload(type: string, object: Record<string, unknown>): string {
  return JSON.stringify({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: "event",
    type,
    data: { object },
  });
}

async function loadWebhookHandlers() {
  return (await import("../../server/webhookHandlers")).WebhookHandlers;
}

describe("stripe payment notices", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects webhook calls that arrive with no signature", async () => {
    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: eventPayload("customer.subscription.deleted", { id: "sub_x" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a forged signature and grants nothing", async () => {
    const client = new TestClient();
    const reg = await client.register(uniqueEmail("forgedsig"));
    const userId = reg.body.user.id;

    const payload = eventPayload("checkout.session.completed", {
      mode: "subscription",
      subscription: "sub_forged",
      customer: "cus_forged",
      metadata: { userId },
    });

    const Handlers = await loadWebhookHandlers();
    await expect(
      Handlers.processWebhook(Buffer.from(payload), signedHeader(payload, "whsec_wrong"))
    ).rejects.toThrow();

    expect((await getSubscription(userId))).toBeNull();
    const status = await client.get("/api/subscription/status");
    expect(status.body.isPro).toBe(false);
  });

  it("refuses unverified notices in production when the secret is missing", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const Handlers = await loadWebhookHandlers();
      const payload = eventPayload("checkout.session.completed", {
        mode: "subscription",
        subscription: "sub_prod",
        customer: "cus_prod",
        metadata: { userId: "anyone" },
      });
      await expect(
        Handlers.processWebhook(Buffer.from(payload), "any-signature")
      ).rejects.toThrow("STRIPE_WEBHOOK_SECRET must be set in production");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("grants, updates, then revokes Pro across a real subscription lifecycle", async () => {
    const client = new TestClient();
    const reg = await client.register(uniqueEmail("stripebuyer"));
    const userId = reg.body.user.id;

    expect((await client.get("/api/subscription/status")).body.isPro).toBe(false);

    // checkout.session.completed looks the subscription up on Stripe — stub
    // that single call so nothing leaves the machine.
    const { getUncachableStripeClient } = await import("../../server/stripeClient");
    const stripeClient = await getUncachableStripeClient();
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    vi.spyOn(stripeClient.subscriptions, "retrieve").mockResolvedValue({
      id: "sub_lifecycle",
      status: "active",
      metadata: {},
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: periodEnd, price: { id: "price_test" } }],
      },
    } as any);

    const Handlers = await loadWebhookHandlers();

    const completed = eventPayload("checkout.session.completed", {
      mode: "subscription",
      subscription: "sub_lifecycle",
      customer: "cus_lifecycle",
      metadata: { userId },
    });
    await Handlers.processWebhook(Buffer.from(completed), signedHeader(completed));

    expect((await client.get("/api/subscription/status")).body.isPro).toBe(true);
    const created = await getSubscription(userId);
    expect(created?.status).toBe("active");
    expect(created?.cancel_at_period_end).toBe(false);

    const updated = eventPayload("customer.subscription.updated", {
      id: "sub_lifecycle",
      status: "active",
      cancel_at_period_end: true,
      items: {
        object: "list",
        data: [{ current_period_end: periodEnd, price: { id: "price_test" } }],
      },
    });
    await Handlers.processWebhook(Buffer.from(updated), signedHeader(updated));

    const afterUpdate = await getSubscription(userId);
    expect(afterUpdate?.status).toBe("active");
    expect(afterUpdate?.cancel_at_period_end).toBe(true);
    expect((await client.get("/api/subscription/status")).body.isPro).toBe(true);

    const deleted = eventPayload("customer.subscription.deleted", {
      id: "sub_lifecycle",
    });
    await Handlers.processWebhook(Buffer.from(deleted), signedHeader(deleted));

    const afterDelete = await getSubscription(userId);
    expect(afterDelete?.status).toBe("canceled");
    expect((await client.get("/api/subscription/status")).body.isPro).toBe(false);
  });
});
