import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/auth.js';
import { getStudentTrajectory } from '../../../../../lib/quiz-store.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const trajectory = await getStudentTrajectory(params.keyword);

    if (!trajectory) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    return NextResponse.json({ trajectory });
  } catch (error) {
    console.error('Admin student detail error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}