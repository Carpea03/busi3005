import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../../lib/auth';
import { normalizeQuestionId } from '../../../../../../lib/quiz-core';
import { setQuestionRelease } from '../../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await setQuestionRelease(params.quizId, normalizeQuestionId(body?.questionId), Boolean(body?.released));

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, release: result.value });
  } catch (error) {
    console.error('Quiz release toggle error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}