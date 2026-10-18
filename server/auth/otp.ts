import crypto from "crypto";
import fs from "fs";
import { getUncachableResendClient } from "../resendClient";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_COOLDOWN_MS =
  parseInt(process.env.OTP_COOLDOWN_SECONDS ?? "30", 10) * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^\S+@\S+\.\S+$/.test(email);
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

// Codes are stored as HMAC-SHA256 hashes keyed by SESSION_SECRET so a
// database read can never recover the plaintext code.
export function hashOtpCode(email: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "otp-secret")
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export function verifyOtpCodeHash(
  email: string,
  code: string,
  expectedHash: string
): boolean {
  const actual = Buffer.from(hashOtpCode(email, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

// Delivers the code by email. When OTP_TEST_CAPTURE_FILE is set (test and
// e2e suites), the code is written to that JSON file instead of hitting
// Resend, so tests exercise the real send/verify path deterministically.
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const captureFile = process.env.OTP_TEST_CAPTURE_FILE;
  if (captureFile) {
    let data: Record<string, string> = {};
    try {
      data = JSON.parse(fs.readFileSync(captureFile, "utf-8"));
    } catch {
      // file missing or unparseable — start fresh
    }
    data[email] = code;
    fs.writeFileSync(captureFile, JSON.stringify(data));
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.log(`[OTP] Sign-in code for ${email}: ${code}`);
    return;
  }

  const { client: resend, fromEmail } = await getUncachableResendClient();
  await resend.emails.send({
    from: fromEmail || "QuietCutter <noreply@quietcutter.com>",
    to: email,
    subject: "Your QuietCutter sign-in code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">Sign in to QuietCutter</h2>
        <p style="color: #555; margin-bottom: 24px;">Enter this 6-digit code in the app to finish signing in:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f5; border-radius: 8px; text-align: center; font-family: monospace;">
          ${code}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">This code expires in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}
