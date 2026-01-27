import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

// Generate a unique license key
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return `LIFE-${segments.join('-')}`;
}

export async function POST(request) {
  try {
    const stripe = getStripe();
    const { planType } = await request.json();
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    let priceData;
    let mode;
    
    if (planType === 'lifetime') {
      // One-time $49 payment
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'QuietCutter Pro - Lifetime',
          description: 'Unlimited videos, 2hr max length, unlimited settings, priority queue',
        },
        unit_amount: 4900, // $49.00 in cents
      };
      mode = 'payment';
    } else if (planType === 'monthly') {
      // $9/month subscription
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'QuietCutter Pro - Monthly',
          description: 'Unlimited videos, 2hr max length, unlimited settings, priority queue',
        },
        unit_amount: 900, // $9.00 in cents
        recurring: {
          interval: 'month',
        },
      };
      mode = 'subscription';
    } else {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }
    
    // Generate license key to include in metadata
    const licenseKey = generateLicenseKey();
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&license=${licenseKey}`,
      cancel_url: `${baseUrl}?canceled=true`,
      metadata: {
        licenseKey: licenseKey,
        planType: planType,
      },
    });
    
    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    });
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
