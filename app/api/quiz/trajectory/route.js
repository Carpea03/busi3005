import { NextResponse } from 'next/server';
import { getSpineTrajectory } from '../../../../lib/quiz-store';

export const dynamic = 'force-dynamic';

// GET /api/quiz/trajectory?question=<spineQuestionId>&cohort=<both|wednesday|friday>&phase=<baseline|reflect>
//
// Returns per-week histograms for one spine question, across every quiz that
// includes it. Drives the admin live-view trajectory panel and can be embedded
// from workshop decks (see Change 4 in S1_2027_Handoff_Planned_Changes.md).
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const questionId = url.searchParams.get('question');
    const cohort = url.searchParams.get('cohort') || 'both';
    const phase = url.searchParams.get('phase');

    if (!questionId) {
      return NextResponse.json({ error: 'question parameter is required.' }, { status: 400 });
    }

    const trajectory = await getSpineTrajectory({
      questionId,
      cohort,
      phase: phase || null,
    });

    if (!trajectory) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(trajectory);
  } catch (error) {
    console.error('Trajectory lookup error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
