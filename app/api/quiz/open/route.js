import { NextResponse } from 'next/server';
import { getStudent, listOpenQuizzesForStudent } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required.' }, { status: 400 });
    }

    const student = await getStudent(keyword);
    if (!student) {
      return NextResponse.json({ error: 'Student keyword not found. Start at /quiz first.' }, { status: 404 });
    }

    const quizzes = await listOpenQuizzesForStudent(student);
    return NextResponse.json({ student, quizzes });
  } catch (error) {
    console.error('Open quiz lookup error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}