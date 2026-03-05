// Resend email integration
import { Resend } from 'resend';

export async function getUncachableResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set.');
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'QuietCutter <noreply@quietcutter.com>';

  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}
