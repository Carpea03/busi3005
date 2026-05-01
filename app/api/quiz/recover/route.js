import { NextResponse } from 'next/server';
import { recoverStudent } from '../../../../lib/quiz-store.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await recoverStudent(body?.recoveryCode);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ student: result.value });
  } catch (error) {
    console.error('Quiz recovery error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}