import { NextResponse } from 'next/server';
import { saveQuizResponse } from '../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const result = await saveQuizResponse({
      quizId: params.quizId,
      keyword: body?.keyword,
      answers: body?.answers,
    });

    if (result.error) {
      const status = result.error === 'This quiz is closed.' ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true, response: result.value });
  } catch (error) {
    console.error('Quiz response error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}