import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../../lib/auth';
import { normalizeQuestionId } from '../../../../../../lib/quiz-core';
import { setTextResponseRelease, setTextResponseReleases } from '../../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const normalizedQuestionId = normalizeQuestionId(body?.questionId);
    const released = Boolean(body?.released);
    const responseIds = Array.isArray(body?.responseIds) ? body.responseIds : null;
    const result = responseIds
      ? await setTextResponseReleases(params.quizId, normalizedQuestionId, responseIds, released)
      : await setTextResponseRelease(params.quizId, normalizedQuestionId, body?.responseId, released);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, release: result.value, count: result.count || 1 });
  } catch (error) {
    console.error('Text release toggle error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}