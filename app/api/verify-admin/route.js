import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, hasValidAdminSession, setAdminSessionCookie } from '../../../lib/auth.js';

export async function GET(request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
  }

  return NextResponse.json({ authenticated: hasValidAdminSession(request) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const password = body?.password;

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (password === process.env.ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, authenticated: true });
      setAdminSessionCookie(response);
      return response;
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, authenticated: false });
  clearAdminSessionCookie(response);
  return response;
}
