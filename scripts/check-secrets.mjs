#!/usr/bin/env node
// check-secrets.mjs — fails (exit 1) if a git-tracked file looks like it holds a real secret.
// Run: node scripts/check-secrets.mjs
// Allowlist: .secrets-allow at repo root — one entry per line: "path/to/file" or
// "path/to/file::rule-id". Lines starting with # are comments.
// Findings print file:line + rule id only — never the secret value.
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const SKIP_DIR = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.nuxt|\.turbo|\.vercel|\.expo|\.cache|\.wrangler|android|ios)\//;
const SKIP_FILE = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|composer\.lock|Gemfile\.lock|poetry\.lock|Cargo\.lock|.*\.min\.(?:js|css)|.*\.map|.*\.lock|.*\.wasm|.*\.(?:png|jpe?g|gif|webp|ico|icns|mp[34]|mov|wav|ogg|woff2?|ttf|otf|eot|pdf|zip|gz|tar|dmg|exe|dll|so|dylib|bin|dat))$/i;
const MAX_BYTES = 5 * 1024 * 1024;

const CONTENT_RULES = [
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["stripe-live-key", /\b[sr]k_live_[0-9a-zA-Z]{16,}/],
  ["stripe-test-key", /\bsk_test_[0-9a-zA-Z]{16,}/],
  ["stripe-webhook-secret", /\bwhsec_[0-9a-zA-Z]{20,}/],
  ["anthropic-key", /\bsk-ant-[0-9a-zA-Z_-]{20,}/],
  ["openai-key", /\bsk-(?:proj-|svcacct-)?[0-9a-zA-Z_-]{25,}/],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{30,}|\bgithub_pat_[0-9a-zA-Z_]{30,}/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["slack-token", /\bxox[baprs]-[0-9a-zA-Z-]{10,}/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
  ["resend-key", /\bre_[0-9a-zA-Z]{20,}/],
  ["supabase-key", /\bsbp_[0-9a-zA-Z]{20,}/],
  ["npm-token", /\bnpm_[0-9a-zA-Z]{30,}/],
  ["sendgrid-key", /\bSG\.[0-9a-zA-Z_-]{16,}\.[0-9a-zA-Z_-]{16,}/],
];

// key-like name = quoted value, at least 20 chars, no spaces. Placeholders filtered below.
const GENERIC_RE = /(?:api[_-]?key|apikey|client[_-]?secret|access[_-]?key|secret[_-]?key|secret|token|passwd|password|private[_-]?key|auth[_-]?token|session[_-]?secret|encryption[_-]?key|signing[_-]?key|webhook[_-]?secret)\s*[:=]\s*["'`]([0-9a-zA-Z/+_.=-]{20,})["'`]/gi;
const PLACEHOLDER = /test|example|dummy|fake|sample|placeholder|changeme|change-me|your[-_ ]|redacted|notreal|not-a-real|0123456789|abcdef|xxxx|\*|\$\{|process\.env|import\.meta|REPLACE|INSERT|PASTE|TODO|FIXME/i;
const PLACEHOLDER_PREFIX = /^(?:e2e|test|fake|dummy|sample|demo|mock|example|placeholder|changeme)[-_]/i;
const REPEATED = /^([0-9a-zA-Z])\1+$/;

function loadAllowlist() {
  const file = ".secrets-allow";
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [path, rule] = l.split("::");
      return { path: path.trim(), rule: rule ? rule.trim() : null };
    });
}

const allowlist = loadAllowlist();
const allowed = (file, rule) =>
  allowlist.some((a) => a.path === file && (!a.rule || a.rule === rule)) ||
  allowlist.some((a) => a.path.endsWith("/") && file.startsWith(a.path));

const isEnvFile = (p) => /(^|\/)\.env/.test(p) && !/(^|\/)\.env\.(example|sample|template|test\.example)$/.test(p) && !/\.env\.(example|sample|template)$/.test(p);

let tracked;
try {
  tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
} catch {
  console.error("check-secrets: not a git repo (git ls-files failed)");
  process.exit(1);
}

const findings = [];

for (const file of tracked) {
  if (SKIP_DIR.test(file) || SKIP_FILE.test(file)) continue;
  if (isEnvFile(file)) {
    if (!allowed(file, "env-file")) findings.push(`${file}:1 env-file`);
    continue; // don't also content-scan env files
  }
  let text;
  try {
    const buf = readFileSync(file);
    if (buf.length > MAX_BYTES) continue;
    if (buf.subarray(0, 8192).includes(0)) continue; // binary
    text = buf.toString("utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  for (const [rule, re] of CONTENT_RULES) {
    const m = re.exec(text);
    if (m) {
      const line = text.slice(0, m.index).split("\n").length;
      if (!allowed(file, rule)) findings.push(`${file}:${line} ${rule}`);
    }
  }
  // generic key=value scan, per line so we can report the line number
  for (let i = 0; i < lines.length; i++) {
    GENERIC_RE.lastIndex = 0;
    let m;
    while ((m = GENERIC_RE.exec(lines[i]))) {
      const value = m[1];
      if (value.length < 20 || PLACEHOLDER.test(value) || PLACEHOLDER_PREFIX.test(value) || REPEATED.test(value)) continue;
      if (!allowed(file, "generic-secret")) findings.push(`${file}:${i + 1} generic-secret`);
      break; // one finding per line is enough
    }
  }
}

if (findings.length) {
  console.error(`SECRET CHECK FAILED — ${findings.length} possible secret(s) in tracked files:`);
  for (const f of findings) console.error(`  ${f}`);
  console.error("If a finding is a false positive, add it to .secrets-allow with a reason.");
  process.exit(1);
}
console.log(`Secret check passed (${tracked.length} tracked files scanned).`);
