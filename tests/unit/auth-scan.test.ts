import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Every Express route registration must make an auth/access decision in
// its middleware chain or handler body, or carry a "// public because:
// <reason>" marker — QuietCutter's version of DMSCommand's route authz
// contract. req.user is populated globally by passport.session(), so a
// handler checking req.user / canAccessProject counts as guarded.
// Window check: the scan reads from each app.METHOD( to the next
// registration; it proves someone made an auth decision, not ordering.
const FILES = ["server/routes.ts", "server/index.ts", "server/auth/routes.ts"];
// app.use(...) entries are middleware, not routes — only HTTP method
// registrations are in scope (path may be a string or a route-config
// identifier like api.projects.get.path).
const REGISTRATION = /\bapp\.(?:get|post|put|patch|delete)\s*\(/g;
const AUTH_SIGNALS = [
  /\brequireAuth\b/,
  /\boptionalAuth\b/,
  /\b(?:req|request)\b[^;]{0,40}?\.user\b/,
  /\breq\.isAuthenticated\s*\(/,
  /\breq\.(?:login|logout)\s*\(/,
  /\bcanAccessProject\b/,
  /\bisAdmin\b/,
  /\bprocessWebhook\b/,
  /\bstripe-signature\b/,
  /\bverifyAuth0IdToken\b/,
];
const PUBLIC_MARKER = "public because";

interface RouteWindow {
  file: string;
  line: number;
  window: string;
}

function routeWindows(): RouteWindow[] {
  const out: RouteWindow[] = [];
  for (const file of FILES) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    const lines = src.split("\n");
    // Byte offset of each line start, for mapping match positions.
    const lineStart: number[] = [];
    let off = 0;
    for (const l of lines) {
      lineStart.push(off);
      off += l.length + 1;
    }
    const matches = [...src.matchAll(REGISTRATION)];
    // A route owns the comment/blank lines directly above its
    // registration — that's where "// public because:" markers live.
    const windowStart = (pos: number): number => {
      // Index of the line containing pos, minus one — walk back over
      // the comment/blank block directly above the registration.
      let li = lineStart.findIndex((s) => s > pos) - 2;
      while (li >= 0) {
        const t = lines[li].trim();
        if (t === "" || t.startsWith("//")) li--;
        else break;
      }
      return li + 1 >= 0 ? lineStart[li + 1] : 0;
    };
    for (let i = 0; i < matches.length; i++) {
      const start = windowStart(matches[i].index ?? 0);
      const end =
        i + 1 < matches.length
          ? windowStart(matches[i + 1].index ?? src.length)
          : src.length;
      out.push({
        file,
        line: src.slice(0, matches[i].index).split("\n").length,
        window: src.slice(start, end),
      });
    }
  }
  return out;
}

describe("Express route auth contract", () => {
  it("found route registrations", () => {
    expect(routeWindows().length).toBeGreaterThan(20);
  });

  it("every route checks who's asking or is marked public", () => {
    const violations = routeWindows()
      .filter(({ window }) => !AUTH_SIGNALS.some((re) => re.test(window)) && !window.includes(PUBLIC_MARKER))
      .map(({ file, line }) => `${file}:${line}`);
    expect(
      violations,
      `Routes with no auth check and no '// ${PUBLIC_MARKER}: <reason>' comment:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
