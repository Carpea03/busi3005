import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../../lib/auth';
import { getQuizAggregatesForAdmin } from '../../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const payload = await getQuizAggregatesForAdmin(params.quizId);

    if (!payload) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Admin aggregate error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}