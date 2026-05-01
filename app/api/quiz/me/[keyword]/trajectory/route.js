import { NextResponse } from 'next/server';
import { getStudentTrajectory } from '../../../../../../lib/quiz-store.js';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const trajectory = await getStudentTrajectory(params.keyword);

    if (!trajectory) {
      return NextResponse.json({ error: 'Student trajectory not found.' }, { status: 404 });
    }

    return NextResponse.json({ trajectory });
  } catch (error) {
    console.error('Student trajectory error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}