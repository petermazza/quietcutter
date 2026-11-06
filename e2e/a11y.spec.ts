import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility scan over the public pages — critical and serious
// findings fail; moderate/minor are logged but don't gate.
const PUBLIC_PATHS = ["/", "/about", "/blog", "/contact"];

for (const path of PUBLIC_PATHS) {
  test(`${path} has no critical/serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).analyze();
    const serious = result.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(" | ")})`);
    expect(serious, `accessibility findings on ${path}`).toEqual([]);
  });
}
