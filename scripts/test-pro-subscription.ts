import { getUncachableStripeClient, getStripeSync } from '../server/stripeClient';

async function main() {
  const stripe = await getUncachableStripeClient();
  const customerId = process.argv[2];
  const priceId = process.argv[3] || 'price_1SxZCeElEjbs9MkgMIfNACkJ';

  if (!customerId) {
    console.error('Usage: npx tsx scripts/test-pro-subscription.ts <customerId> [priceId]');
    process.exit(1);
  }

  console.log(`Creating test subscription for customer ${customerId}...`);

  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      token: 'tok_visa',
    },
  });
  console.log(`Created payment method: ${paymentMethod.id}`);

  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });
  console.log(`Attached payment method to customer`);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethod.id,
  });
  console.log(`Created subscription: ${subscription.id}, status: ${subscription.status}`);

  console.log('Syncing Stripe data to database...');
  const stripeSync = await getStripeSync();
  await stripeSync.syncBackfill();
  console.log('Sync complete!');

  const { db } = await import('../server/db');
  const { sql } = await import('drizzle-orm');
  const result = await db.execute(
    sql`SELECT s.status FROM stripe.subscriptions s
        JOIN stripe.customers c ON s.customer = c.id
        WHERE c.metadata->>'userId' = ${customerId}
        AND s.status = 'active'
        LIMIT 1`
  );

  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as any).metadata?.userId;
  console.log(`Customer userId from metadata: ${userId}`);
  
  const result2 = await db.execute(
    sql`SELECT s.status FROM stripe.subscriptions s
        JOIN stripe.customers c ON s.customer = c.id
        WHERE c.metadata->>'userId' = ${userId}
        AND s.status = 'active'
        LIMIT 1`
  );
  console.log(`Pro check result: ${JSON.stringify(result2.rows)}`);
  console.log(`Is Pro: ${(result2.rows?.length ?? 0) > 0}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
