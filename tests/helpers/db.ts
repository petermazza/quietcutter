import pg from "pg";
import { TEST_DATABASE_URL } from "../env";

async function withClient<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Gives a registered user an active Pro subscription, the same state Stripe's
// webhook would leave behind after a real checkout.
export async function makeUserPro(userId: string): Promise<void> {
  await withClient((client) =>
    client.query(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end)
       VALUES ($1, $2, $3, 'active', 'price_test', NOW() + INTERVAL '30 days')`,
      [userId, `cus_test_${userId.slice(0, 8)}`, `sub_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`]
    )
  );
}

export async function getContactMessageCount(): Promise<number> {
  return withClient(async (client) => {
    const res = await client.query("SELECT COUNT(*)::int AS c FROM contact_messages");
    return res.rows[0].c;
  });
}
