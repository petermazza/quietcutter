import { getUncachableStripeClient, getStripeSync } from '../server/stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    
    const existingProducts = await stripe.products.list({ active: true });
    const existing = existingProducts.data.find(p => p.name === 'QuietCutter Pro');
    
    if (existing) {
      console.log('QuietCutter Pro product already exists:', existing.id);
      
      const prices = await stripe.prices.list({ product: existing.id, active: true });
      console.log('Existing prices:');
      for (const price of prices.data) {
        console.log(`  - ${price.recurring?.interval}: $${(price.unit_amount! / 100).toFixed(2)}/${price.recurring?.interval} (${price.id})`);
      }
    } else {
      const product = await stripe.products.create({
        name: 'QuietCutter Pro',
        description: 'Unlimited audio processing, priority support, and advanced features',
        metadata: {
          tier: 'pro',
          features: 'unlimited_processing,priority_support,batch_processing,advanced_settings'
        }
      });
      console.log('Created product:', product.id);
      
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 999,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { plan: 'monthly' }
      });
      console.log('Created monthly price:', monthlyPrice.id, '($9.99/month)');
      
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 7999,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { plan: 'yearly' }
      });
      console.log('Created yearly price:', yearlyPrice.id, '($79.99/year)');
    }
    
    console.log('\nSyncing Stripe data to local database...');
    const stripeSync = await getStripeSync();
    await stripeSync.syncBackfill();
    console.log('Sync complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating products:', error);
    process.exit(1);
  }
}

createProducts();
