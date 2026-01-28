import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import { SECURITY_HEADERS } from '@/lib/security';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    
    if (!session) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    const payload = await decrypt(session);
    
    if (!payload) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // Get fresh user data from database
    const client = await clientPromise;
    const db = client.db();
    
    const user = await db.collection('users').findOne({ email: payload.email });
    
    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { 
        user: {
          email: user.email,
          plan: user.plan || 'free',
          stripeCustomerId: user.stripeCustomerId,
          subscriptionStatus: user.subscriptionStatus,
        }
      },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200, headers: SECURITY_HEADERS }
    );
  }
}
