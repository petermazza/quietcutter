import { expect, test } from "@playwright/test";

test("home page loads with branding, nav and the upload area", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("text-logo")).toHaveText("QuietCutter");
  await expect(page.getByTestId("dropzone-upload")).toBeVisible();
  await expect(page.getByTestId("link-about")).toBeVisible();
  await expect(page.getByTestId("link-blog")).toBeVisible();
  await expect(page.getByTestId("link-contact")).toBeVisible();
});

test("visitors can create an account through the sign-in dialog", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("button-sign-in").click();
  await page.getByRole("tab", { name: "Create Account" }).click();

  const email = `e2e-${Date.now()}@test.quietcutter.dev`;
  await page.locator("#register-email").fill(email);
  await page.locator("#register-password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();

  await expect(page.getByTestId("button-user-menu")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("button-user-menu").click();
  await expect(page.getByTestId("text-user-name")).toHaveText(email);
});
