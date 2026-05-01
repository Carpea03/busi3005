import { NextResponse } from 'next/server';
import { getReleasedAggregatesForStudents } from '../../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const payload = await getReleasedAggregatesForStudents(params.quizId);

    if (!payload) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Student aggregate error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}