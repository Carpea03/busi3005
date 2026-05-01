import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/auth.js';
import { listStudentsWithStats } from '../../../../lib/quiz-store.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const students = await listStudentsWithStats();
    return NextResponse.json({ students });
  } catch (error) {
    console.error('Admin students list error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}