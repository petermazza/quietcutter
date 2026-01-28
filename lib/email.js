import { Resend } from 'resend';

// Lazy initialization - don't create client at build time
let resend = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendMagicLinkEmail(email, magicLink) {
  const client = getResend();
  
  if (!client) {
    throw new Error('Email service not configured. Please set RESEND_API_KEY.');
  }
  
  try {
    const { data, error } = await client.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: 'Sign in to QuietCutter',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1e293b; font-size: 24px; margin: 0;">QuietCutter</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Make every second count</p>
            </div>
            
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Sign in to your account</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Click the button below to securely sign in. This link expires in 15 minutes.
            </p>
            
            <a href="${magicLink}" style="display: block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin-bottom: 24px;">
              Sign In to QuietCutter
            </a>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 20px;">
              If you didn't request this email, you can safely ignore it.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} QuietCutter. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}
