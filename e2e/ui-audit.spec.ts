import { expect, test, type Page } from "@playwright/test";

// UI & layout audit over the public pages: no console errors, no horizontal
// overflow at 768px and 1440px, and no visible button that does nothing.

const PUBLIC_PATHS = ["/", "/about", "/blog", "/contact"];
const WIDTHS = [768, 1440];

function watchForErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // The app probes /api/auth/user on load and treats a 401 as "signed
    // out" (client/src/hooks/use-auth.ts) — Chromium logs that expected
    // HTTP status as a console error. Only that exact message is noise.
    if (text === "Failed to load resource: the server responded with a status of 401 (Unauthorized)") {
      return;
    }
    problems.push(`console.error: ${text}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

for (const width of WIDTHS) {
  for (const path of PUBLIC_PATHS) {
    test(`${path} at ${width}px: clean console and no horizontal overflow`, async ({
      page,
    }) => {
      const problems = watchForErrors(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "networkidle" });

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow, `${path} overflows horizontally at ${width}px`).toBeLessThanOrEqual(0);
      expect(problems).toEqual([]);
    });
  }
}

// A click must do something visible: mutate the DOM, scroll, navigate, open
// a dialog, fire a request, or (for a submit) be vetoed by form validation.
test.describe("no dead buttons", () => {
  for (const path of PUBLIC_PATHS) {
    test(`every visible button on ${path} responds to a click`, async ({
      page,
    }) => {
      const problems = watchForErrors(page);
      await page.goto(path, { waitUntil: "networkidle" });

      const handles = await page.locator("button:visible").elementHandles();
      expect(handles.length, `${path} has no buttons to audit`).toBeGreaterThan(0);

      for (const handle of handles) {
        const label =
          (await handle.getAttribute("data-testid")) ??
          ((await handle.textContent()) ?? "").trim().slice(0, 40);
        if (!(await handle.isVisible()) || !(await handle.isEnabled())) continue;

        let requests = 0;
        const onRequest = () => requests++;
        page.on("request", onRequest);

        const before = await page.evaluate(
          () =>
            `${location.href}|${document.body.innerHTML.length}|${window.scrollY}`
        );
        try {
          await handle.click({ timeout: 3_000 });
        } catch {
          // The previous click re-rendered and detached this element — the
          // page is alive; move on.
          page.off("request", onRequest);
          continue;
        }
        await page.waitForTimeout(400);
        page.off("request", onRequest);

        const after = await page.evaluate(
          () =>
            `${location.href}|${document.body.innerHTML.length}|${window.scrollY}`
        );
        const dialogOpened = (await page
          .locator('[role="dialog"]:visible, [data-state="open"]:visible')
          .count()) > 0;
        const submitVetoed = await handle
          .evaluate(
            (el) =>
              el instanceof HTMLButtonElement &&
              el.type === "submit" &&
              !!el.form &&
              el.form.querySelectorAll(":invalid").length > 0
          )
          .catch(() => false);

        const responded =
          after !== before || dialogOpened || requests > 0 || submitVetoed;
        expect(
          responded,
          `button "${label}" on ${path} did nothing on click`
        ).toBe(true);

        // Recover before the next button: leave dialogs, go back if we
        // navigated away.
        if (!(await page.url()).endsWith(path)) {
          await page.goto(path, { waitUntil: "networkidle" });
        } else {
          await page.keyboard.press("Escape");
        }
      }

      expect(problems).toEqual([]);
    });
  }
});
