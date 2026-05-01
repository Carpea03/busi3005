import { NextResponse } from 'next/server';
import { identifyStudent } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await identifyStudent(body || {});

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ student: result.value });
  } catch (error) {
    console.error('Quiz identify error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}