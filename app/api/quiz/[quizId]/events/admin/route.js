import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../../lib/auth.js';
import { createQuizEventStream } from '../../../../../../lib/quiz-live.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  return createQuizEventStream({ request, quizId: params.quizId, audience: 'admin' });
}