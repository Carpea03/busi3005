import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/auth';
import { getQuizAggregatesForAdmin, getQuiz, listSpineQuestionIds, saveQuizDefinition } from '../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const quiz = await getQuizAggregatesForAdmin(params.quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const existingSpineQuestionIds = await listSpineQuestionIds({ excludeQuizId: params.quizId });
    return NextResponse.json({ quiz, existingSpineQuestionIds });
  } catch (error) {
    console.error('Admin quiz detail error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const existingQuiz = await getQuiz(params.quizId);
    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const body = await request.json();
    const result = await saveQuizDefinition({ quizId: params.quizId, payload: body });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const quiz = await getQuizAggregatesForAdmin(params.quizId);
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Admin quiz update error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}