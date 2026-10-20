import { NextResponse } from 'next/server';
import { validateSimpleCredentials } from '@/lib/auth-config';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    const member = validateSimpleCredentials(identifier, password);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Access denied. Enter your teammate name as both username and password (e.g., Aibin / Aibin).',
        },
        { status: 401 }
      );
    }

    const sessionPayload = JSON.stringify({
      displayName: member.displayName,
      email: member.email,
    });

    const cookieStore = await cookies();
    cookieStore.set('infopark_user', sessionPayload, {
      httpOnly: false, // Accessible to client as well for fast local hydration
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days session
    });

    return NextResponse.json({
      success: true,
      member: {
        displayName: member.displayName,
        email: member.email,
      },
    });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error processing sign-in.' },
      { status: 500 }
    );
  }
}
