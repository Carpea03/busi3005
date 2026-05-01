import { createQuizEventStream } from '../../../../../lib/quiz-live.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  return createQuizEventStream({ request, quizId: params.quizId, audience: 'public' });
}