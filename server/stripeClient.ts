import Stripe from 'stripe';

let cachedClient: Stripe | null = null;
let cachedPublishableKey: string | null = null;

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
  }
  return key;
}

function getPublishableKeyFromEnv(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is not set.');
  }
  return key;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  if (!cachedClient) {
    cachedClient = new Stripe(getSecretKey(), {
      apiVersion: '2025-11-17.clover',
    });
  }
  return cachedClient;
}

export async function getStripePublishableKey(): Promise<string> {
  if (!cachedPublishableKey) {
    cachedPublishableKey = getPublishableKeyFromEnv();
  }
  return cachedPublishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  return getSecretKey();
}
