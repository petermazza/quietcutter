import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SECURITY_HEADERS } from '@/lib/security';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200, headers: SECURITY_HEADERS }
    );

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
