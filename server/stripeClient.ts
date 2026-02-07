import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function tryConnector(targetEnvironment: string): Promise<{ publishableKey: string; secretKey: string } | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) return null;

  const connectorName = 'stripe';
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
    return {
      publishableKey: connectionSettings.settings.publishable,
      secretKey: connectionSettings.settings.secret,
    };
  }

  return null;
}

async function validateStripeKey(secretKey: string): Promise<boolean> {
  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2025-11-17.clover' });
    await stripe.products.list({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const candidates: { source: string; publishableKey: string; secretKey: string }[] = [];

  try {
    const primaryEnv = isProduction ? 'production' : 'development';
    const result = await tryConnector(primaryEnv);
    if (result) candidates.push({ source: `connector-${primaryEnv}`, ...result });

    if (isProduction) {
      const devResult = await tryConnector('development');
      if (devResult) candidates.push({ source: 'connector-development', ...devResult });
    }
  } catch (err) {
    console.log('Stripe connector not available, trying environment secrets');
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (secretKey && publishableKey) {
    candidates.push({ source: 'env-secrets', publishableKey, secretKey });
  }

  for (const candidate of candidates) {
    const isValid = await validateStripeKey(candidate.secretKey);
    if (isValid) {
      console.log(`Using Stripe credentials from: ${candidate.source}`);
      cachedCredentials = { publishableKey: candidate.publishableKey, secretKey: candidate.secretKey };
      return cachedCredentials;
    } else {
      console.log(`Stripe key from ${candidate.source} is invalid, trying next...`);
    }
  }

  throw new Error('No valid Stripe keys found. Update your Stripe connector or STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY environment variables.');
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
