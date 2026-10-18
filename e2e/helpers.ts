import { expect, test, type Page } from "@playwright/test";
import fs from "fs";

const OTP_CAPTURE_FILE = "/tmp/quietcutter-e2e-otp.json";

// The test server records each sign-in code in this JSON file (keyed by
// lowercased email) instead of emailing it — see server/auth/otp.ts.
function readCapturedOtp(email: string): string {
  const data = JSON.parse(fs.readFileSync(OTP_CAPTURE_FILE, "utf-8"));
  const code = data[email.trim().toLowerCase()];
  if (!code) throw new Error(`No captured OTP code for ${email}`);
  return code;
}

async function signInWithOtp(page: Page, email: string) {
  await page.getByTestId("button-sign-in").click();
  await page.getByTestId("input-otp-email").fill(email);
  await page.getByTestId("button-send-code").click();

  await expect(page.getByTestId("button-verify-code")).toBeVisible({
    timeout: 15_000,
  });
  const code = readCapturedOtp(email);
  await page.getByTestId("input-otp-code").pressSequentially(code);
  await page.getByTestId("button-verify-code").click();

  await expect(page.getByTestId("button-user-menu")).toBeVisible({
    timeout: 15_000,
  });
}

export { OTP_CAPTURE_FILE, readCapturedOtp, signInWithOtp };
