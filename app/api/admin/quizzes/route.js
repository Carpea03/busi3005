import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/auth';
import { listQuizzesWithStats, listSpineQuestionIds, saveQuizDefinition } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const [quizzes, existingSpineQuestionIds] = await Promise.all([
      listQuizzesWithStats(),
      listSpineQuestionIds(),
    ]);

    return NextResponse.json({ quizzes, existingSpineQuestionIds });
  } catch (error) {
    console.error('Admin quiz list error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await saveQuizDefinition({ payload: body });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ quiz: result.value }, { status: 201 });
  } catch (error) {
    console.error('Admin quiz create error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}