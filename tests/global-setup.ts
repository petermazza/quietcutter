import { spawn, type ChildProcess } from "child_process";
import path from "path";
import pg from "pg";
import { BASE_URL, PROJECT_ROOT, TEST_DATABASE_URL, testServerEnv } from "./env";

let server: ChildProcess | undefined;
let serverOutput = "";

const READY_TIMEOUT_MS = 90_000;

async function resetTestDatabase() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `TRUNCATE project_files, projects, custom_presets, contact_messages, subscriptions, users RESTART IDENTITY CASCADE`
    );
  } finally {
    await client.end();
  }
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/subscription/status`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Test server did not become ready within ${READY_TIMEOUT_MS}ms.\n--- server output ---\n${serverOutput}`
  );
}

export async function setup() {
  await resetTestDatabase();

  server = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: PROJECT_ROOT,
    env: testServerEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout?.on("data", (d) => (serverOutput += d.toString()));
  server.stderr?.on("data", (d) => (serverOutput += d.toString()));

  await waitForServer();
}

export async function teardown() {
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        server?.kill("SIGKILL");
        resolve();
      }, 5000);
      server?.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}
