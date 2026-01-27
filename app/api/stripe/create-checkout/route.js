import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { 
  rateLimit, 
  getClientIP,
  SECURITY_HEADERS 
} from '@/lib/security';

// Initialize Stripe lazily to avoid build-time errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

// Generate a unique license key with cryptographic randomness
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      // Use crypto-quality randomness
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      segment += chars.charAt(randomBytes[0] % chars.length);
    }
    segments.push(segment);
  }
  return `LIFE-${segments.join('-')}`;
}

// Valid plan types (whitelist)
const VALID_PLAN_TYPES = ['lifetime', 'monthly'];

export async function POST(request) {
  try {
    // ============ SECURITY: Rate Limiting ============
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(clientIP, 10, 60000); // 10 checkout attempts per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many checkout attempts. Please wait before trying again.',
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          }
        }
      );
    }

    const stripe = getStripe();
    
    // ============ SECURITY: Input Validation ============
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    const { planType } = body;
    
    // Whitelist validation for planType
    if (!planType || !VALID_PLAN_TYPES.includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type. Must be "lifetime" or "monthly".' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // ============ SECURITY: Validate baseUrl ============
    let validatedBaseUrl;
    try {
      const urlObj = new URL(baseUrl);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      validatedBaseUrl = urlObj.origin;
    } catch {
      validatedBaseUrl = 'http://localhost:3000';
    }
    
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
    }
    
    // Generate license key with crypto randomness
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
      success_url: `${validatedBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}&license=${encodeURIComponent(licenseKey)}`,
      cancel_url: `${validatedBaseUrl}?canceled=true`,
      metadata: {
        licenseKey: licenseKey,
        planType: planType,
      },
      // Additional security options
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Session expires in 30 minutes
    });
    
    return NextResponse.json(
      { 
        sessionId: session.id, 
        url: session.url 
      },
      { headers: SECURITY_HEADERS }
    );
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    // Don't expose Stripe internal errors to client
    const safeErrorMessage = error.type === 'StripeInvalidRequestError'
      ? 'Invalid payment configuration. Please contact support.'
      : 'Payment service temporarily unavailable. Please try again.';
    
    return NextResponse.json(
      { error: safeErrorMessage },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
