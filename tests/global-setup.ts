import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import pg from "pg";
import { exportJWK, generateKeyPair } from "jose";
import { BASE_URL, OTP_CAPTURE_FILE, PROJECT_ROOT, TEST_DATABASE_URL, testServerEnv } from "./env";
import { AUTH0_KEY_FILE } from "./helpers/auth0";

let server: ChildProcess | undefined;
let jwksServer: http.Server | undefined;
let serverOutput = "";

const READY_TIMEOUT_MS = 90_000;

async function resetTestDatabase() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `TRUNCATE project_files, projects, custom_presets, contact_messages, subscriptions, users, otp_codes RESTART IDENTITY CASCADE`
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

// Stands in for Auth0's public key directory: generates a throwaway keypair,
// serves the public half over HTTP, and leaves the private half where tests
// can sign tokens with it.
async function startJwksStandIn(): Promise<string> {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "qc-test-key";
  const privateJwk = await exportJWK(privateKey);
  privateJwk.kid = "qc-test-key";
  fs.writeFileSync(AUTH0_KEY_FILE, JSON.stringify(privateJwk));

  jwksServer = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [publicJwk] }));
  });
  await new Promise<void>((resolve) => {
    jwksServer!.listen(0, "127.0.0.1", resolve);
  });
  const port = (jwksServer.address() as { port: number }).port;
  return `http://127.0.0.1:${port}/.well-known/jwks.json`;
}

export async function setup() {
  await resetTestDatabase();
  fs.writeFileSync(OTP_CAPTURE_FILE, "{}");

  const jwksUrl = await startJwksStandIn();

  server = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: PROJECT_ROOT,
    env: testServerEnv(jwksUrl),
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout?.on("data", (d) => (serverOutput += d.toString()));
  server.stderr?.on("data", (d) => (serverOutput += d.toString()));

  await waitForServer();
}

export async function teardown() {
  if (jwksServer) {
    await new Promise<void>((resolve) => jwksServer!.close(() => resolve()));
  }
  try {
    fs.unlinkSync(AUTH0_KEY_FILE);
  } catch {
    // key file already gone
  }
  try {
    fs.unlinkSync(OTP_CAPTURE_FILE);
  } catch {
    // capture file already gone
  }
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
