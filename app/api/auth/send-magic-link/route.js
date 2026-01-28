import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateToken, hashToken } from '@/lib/auth';
import { sendMagicLinkEmail } from '@/lib/email';
import { rateLimit, getClientIP, SECURITY_HEADERS } from '@/lib/security';

export async function POST(request) {
  try {
    // Rate limiting - 5 requests per minute
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(clientIP, 5, 60000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const client = await clientPromise;
    const db = client.db();
    
    // Create or get user
    let user = await db.collection('users').findOne({ email: normalizedEmail });
    
    if (!user) {
      const result = await db.collection('users').insertOne({
        email: normalizedEmail,
        createdAt: new Date(),
        plan: 'free',
        videosProcessedToday: 0,
        lastVideoDate: null,
      });
      user = { _id: result.insertedId, email: normalizedEmail };
    }

    // Generate magic link token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await db.collection('magicTokens').insertOne({
      email: normalizedEmail,
      tokenHash,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Clean up old tokens
    await db.collection('magicTokens').deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { used: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    });

    // Send magic link email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;
    
    await sendMagicLinkEmail(normalizedEmail, magicLink);

    return NextResponse.json(
      { message: 'Magic link sent! Check your email.' },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (error) {
    console.error('Send magic link error:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link. Please try again.' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
