import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/auth.js';
import { getResponsesExportData } from '../../../../../lib/quiz-store.js';

export const dynamic = 'force-dynamic';

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const rows = await getResponsesExportData();
    const headers = ['keyword', 'displayName', 'cohort', 'weekNumber', 'quizId', 'quizTitle', 'questionId', 'prompt', 'questionType', 'value', 'submittedAt'];
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="quiz-responses-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Responses export error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}