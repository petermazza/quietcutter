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

// Inserts a contact message directly so tests don't spend the 3-per-hour
// /api/contact rate limit (or attempt a Resend send) just to have a row.
export async function insertContactMessage(subject: string): Promise<void> {
  await withClient((client) =>
    client.query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
      ["Test User", "test@example.com", subject, "test message body"]
    )
  );
}

// Backdates a sign-in code's expiry so a test can verify the 10-minute
// lifetime without actually waiting.
export async function expireOtp(email: string): Promise<void> {
  await withClient((client) =>
    client.query(
      `UPDATE otp_codes SET expires_at = NOW() - INTERVAL '1 minute' WHERE email = $1`,
      [email.trim().toLowerCase()]
    )
  );
}

// Inserts a project plus a file row pointing at real paths on disk, aged by
// the given interval ("8 days" puts it past the cleanup window). Returns the
// file row's id.
export async function insertProjectFile(
  originalPath: string,
  processedPath: string,
  age = "0 days"
): Promise<number> {
  return withClient(async (client) => {
    const proj = await client.query(
      `INSERT INTO projects (name) VALUES ('cleanup-test') RETURNING id`
    );
    const res = await client.query(
      `INSERT INTO project_files (project_id, original_file_name, original_file_path, processed_file_path, status, created_at)
       VALUES ($1, 'old.mp3', $2, $3, 'completed', NOW() - $4::interval) RETURNING id`,
      [proj.rows[0].id, originalPath, processedPath, age]
    );
    return res.rows[0].id;
  });
}

export async function getProjectFilePaths(
  id: number
): Promise<{ original_file_path: string | null; processed_file_path: string | null }> {
  return withClient(async (client) => {
    const res = await client.query(
      `SELECT original_file_path, processed_file_path FROM project_files WHERE id = $1`,
      [id]
    );
    return res.rows[0];
  });
}
