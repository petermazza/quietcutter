import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { hashToken, encrypt } from '@/lib/auth';
import { SECURITY_HEADERS } from '@/lib/security';

export async function POST(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const tokenHash = hashToken(token);
    
    const client = await clientPromise;
    const db = client.db();

    // Find valid token
    const magicToken = await db.collection('magicTokens').findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!magicToken) {
      return NextResponse.json(
        { error: 'Invalid or expired link. Please request a new one.' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // Mark token as used
    await db.collection('magicTokens').updateOne(
      { _id: magicToken._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Get user
    const user = await db.collection('users').findOne({ email: magicToken.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Create session
    const sessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      plan: user.plan || 'free',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    const session = await encrypt(sessionPayload);
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return NextResponse.json(
      { 
        message: 'Successfully signed in!',
        user: {
          email: user.email,
          plan: user.plan || 'free',
        }
      },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (error) {
    console.error('Verify token error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
