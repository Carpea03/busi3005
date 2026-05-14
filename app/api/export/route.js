import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../lib/auth';
import { getRedisClient } from '../../../lib/redis';

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join('; ') : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const redis = await getRedisClient();
    const all = await redis.hGetAll('submissions');

    const submissions = Object.values(all || {})
      .map((value) => {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const headers = [
      'fullName',
      'format',
      'workshop',
      'aiExperience',
      'aiTools',
      'buildSkills',
      'availability',
      'deadlineApproach',
      'meetingPreference',
      'hustleDirection',
      'hustleConcept',
      'peerPreference',
      'submittedAt',
    ];

    const rows = submissions.map((submission) =>
      headers.map((header) => escapeCsv(submission[header])).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="group-formation-responses-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
