import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/auth';
import { cohortMatchesQuiz } from '../../../../lib/quiz-core';
import { getQuiz, getQuizResponse, getStudent } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { quizId } = params;
    const quiz = await getQuiz(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    if (!isAdminRequest(request)) {
      if (quiz.status !== 'open') {
        return NextResponse.json({ error: quiz.status === 'closed' ? 'This quiz is closed.' : 'This quiz is not available yet.' }, { status: 409 });
      }

      const keyword = new URL(request.url).searchParams.get('keyword');
      if (keyword) {
        const student = await getStudent(keyword);
        if (student && !cohortMatchesQuiz(student.cohort, quiz.cohort)) {
          return NextResponse.json({ error: 'This quiz is not open for your saved cohort.' }, { status: 403 });
        }

        const existingResponse = student ? await getQuizResponse(quizId, keyword) : null;
        return NextResponse.json({ quiz, existingResponse });
      }
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Quiz lookup error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}