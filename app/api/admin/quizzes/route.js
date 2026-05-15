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

    const message = error instanceof Error && (
      error.message === 'Missing REDIS_URL environment variable' ||
      error.message === 'Unable to resolve the Redis host from REDIS_URL.' ||
      error.message === 'Unable to connect to Redis at the configured REDIS_URL.'
    )
      ? 'Redis is unavailable. Check REDIS_URL and confirm the Redis host is live.'
      : 'Server error — please try again.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
