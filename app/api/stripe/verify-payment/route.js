import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import clientPromise from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import { SECURITY_HEADERS } from '@/lib/security';

// Initialize Stripe lazily
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

export async function POST(request) {
  try {
    // Get user session
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    const payload = await decrypt(session);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    // Verify payment with Stripe
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    // Verify email matches
    const checkoutEmail = checkoutSession.customer_email || checkoutSession.metadata?.userEmail;
    if (checkoutEmail?.toLowerCase() !== payload.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Payment email does not match account' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    // Upgrade user in database
    const client = await clientPromise;
    
    if (client) {
      const db = client.db();
      await db.collection('users').updateOne(
        { email: payload.email },
        { 
          $set: { 
            plan: 'pro',
            planType: checkoutSession.metadata?.planType || 'lifetime',
            stripeCustomerId: checkoutSession.customer,
            stripeSessionId: sessionId,
            upgradedAt: new Date(),
          }
        }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Account upgraded to Pro!' },
      { status: 200, headers: SECURITY_HEADERS }
    );
    
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
