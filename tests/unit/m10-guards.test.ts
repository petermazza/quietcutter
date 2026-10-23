// Regression guards for the milestone-10 hardening changes. Where a real
// boot isn't practical inside a unit test (production session store, retry
// loop that only runs without the capture file), the guard pins the source
// so the protection can't quietly regress.
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

// Stand-in for connect-pg-simple whose constructor always fails, so the
// getSession() fallback branch can be exercised without a broken database.
vi.mock("connect-pg-simple", () => ({
  default: () =>
    class {
      constructor() {
        throw new Error("simulated session store init failure");
      }
    },
}));

const savedEnv = new Map<string, string | undefined>();
function setEnv(patch: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(patch)) {
    if (!savedEnv.has(k)) savedEnv.set(k, process.env[k]);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

afterEach(() => {
  for (const [k, v] of savedEnv) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  savedEnv.clear();
  vi.resetModules();
});

describe("m10 guards: session store", () => {
  it("fails closed when the Postgres store cannot initialize outside development", async () => {
    setEnv({
      NODE_ENV: "production",
      SESSION_SECRET: "m10-guard-test-secret",
      DATABASE_URL: "postgresql://localhost:5433/quietcutter_test",
    });
    const { getSession } = await import("../../server/auth/setup");
    expect(() => getSession()).toThrow(/session store failed to initialize/i);
  });

  it("uses the in-memory store only in development", async () => {
    setEnv({
      NODE_ENV: "development",
      SESSION_SECRET: "m10-guard-test-secret",
      DATABASE_URL: "postgresql://localhost:5433/quietcutter_test",
    });
    const { getSession } = await import("../../server/auth/setup");
    expect(() => getSession()).not.toThrow();
  });

  it("has no silent MemoryStore fallback in the Postgres path (source guard)", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "server/auth/setup.ts"),
      "utf8"
    );
    // The Postgres-store failure path must rethrow — sessions falling back
    // to memory signs every user out on each restart, silently.
    expect(src).toContain("PostgreSQL session store failed to initialize");
    const catchBlock = src.match(/catch\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/);
    expect(catchBlock).not.toBeNull();
    expect(catchBlock![1]).not.toContain("sessionStore");
    expect(catchBlock![1]).not.toContain("MemoryStore");
  });
});

describe("m10 guards: test database host", () => {
  for (const host of ["prod.xxx.railway.app", "ep-cold-123.neon.tech"]) {
    it(`refuses a non-local TEST_DATABASE_URL (${host})`, async () => {
      vi.resetModules();
      setEnv({
        TEST_DATABASE_URL: `postgresql://u@${host}:5432/quietcutter_test`,
      });
      await expect(import("../env")).rejects.toThrow(/local database/i);
    });
  }

  it("accepts a local TEST_DATABASE_URL", async () => {
    vi.resetModules();
    setEnv({
      TEST_DATABASE_URL: "postgresql://u@localhost:5433/quietcutter_test",
    });
    const env = await import("../env");
    expect(env.TEST_DATABASE_URL).toContain("localhost:5433");
  });
});

describe("m10 guards: contact route", () => {
  // The happy path is covered end-to-end in tests/api/contact.test.ts; this
  // pins the response contract and the background retry loop, which only
  // runs when CONTACT_EMAIL_CAPTURE_FILE is unset (never in tests).
  it("answers 'Message received' and retries the notification email (source guard)", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/routes.ts"), "utf8");
    expect(src).toContain('"Message received"');
    // The Resend call must be inside a bounded retry loop, not fire-once.
    expect(src).toMatch(/attempt < 3[\s\S]{0,600}?emails\.send/);
    expect(src).toMatch(/gave up after 3 attempts/);
  });
});

describe("m10 guards: upgrade pricing copy", () => {
  it("no hardcoded $9.99 price lives anywhere in client source", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) files.push(p);
      }
    };
    walk(path.join(ROOT, "client/src"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/9\.99/);
    }
  });

  it("the upgrade card points at plans instead of quoting a price", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "client/src/pages/home.tsx"),
      "utf8"
    );
    expect(src).toContain("See plans");
    expect(src).not.toMatch(/\$\d/);
  });

  it("production Content-Security-Policy omits unsafe-eval", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/index.ts"), "utf8");
    const prodBranch = src.match(/:\s*"script-src[^"]+"/);
    expect(prodBranch).not.toBeNull();
    expect(prodBranch![0]).not.toContain("unsafe-eval");
  });
});
