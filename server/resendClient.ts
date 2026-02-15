// Resend email integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  // Try Railway environment variable first
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    console.log('Using RESEND_API_KEY from environment');
    return { 
      apiKey, 
      fromEmail: process.env.RESEND_FROM_EMAIL || 'QuietCutter <noreply@quietcutter.com>' 
    };
  }

  // Fall back to Replit connector for Replit deployments
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('RESEND_API_KEY not found in environment and X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}
