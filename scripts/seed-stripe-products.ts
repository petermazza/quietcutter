import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    
    const existingProducts = await stripe.products.search({ query: "name:'QuietCutter Pro'" });
    
    if (existingProducts.data.length > 0) {
      console.log('QuietCutter Pro product already exists:', existingProducts.data[0].id);
      
      const prices = await stripe.prices.list({ product: existingProducts.data[0].id });
      console.log('Existing prices:', prices.data.map(p => ({ id: p.id, amount: p.unit_amount })));
      return;
    }
    
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
    
    console.log('\nStripe products created successfully!');
    console.log('Monthly Price ID:', monthlyPrice.id);
    console.log('Yearly Price ID:', yearlyPrice.id);
    
  } catch (error) {
    console.error('Error creating products:', error);
    process.exit(1);
  }
}

createProducts();
