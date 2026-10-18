import { expect, test } from "@playwright/test";
import { signInWithOtp } from "./helpers";

test("home page loads with branding, nav and the upload area", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("text-logo")).toHaveText("QuietCutter");
  await expect(page.getByTestId("dropzone-upload")).toBeVisible();
  await expect(page.getByTestId("link-about")).toBeVisible();
  await expect(page.getByTestId("link-blog")).toBeVisible();
  await expect(page.getByTestId("link-contact")).toBeVisible();
});

test("visitors can sign in with a one-time email code", async ({ page }) => {
  await page.goto("/");

  const email = `e2e-${Date.now()}@test.quietcutter.dev`;
  await signInWithOtp(page, email);

  await page.getByTestId("button-user-menu").click();
  await expect(page.getByTestId("text-user-name")).toHaveText(email);
});

// Every public page's Sign in button must open the code-entry box, not
// bounce the visitor elsewhere — this is the regression this guards.
for (const path of ["/about", "/blog", "/blog/1", "/contact"]) {
  test(`sign-in button on ${path} opens the sign-in box`, async ({ page }) => {
    await page.goto(path);

    await page.getByTestId("button-sign-in").click();
    await expect(page.getByTestId("input-otp-email")).toBeVisible();
  });
}
