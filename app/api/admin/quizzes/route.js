import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/auth';
import { listQuizzesWithStats } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const quizzes = await listQuizzesWithStats();
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Admin quiz list error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
