import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../lib/auth';
import { getRedisClient } from '../../../lib/redis';

export async function POST(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  try {
    const redis = await getRedisClient();

    const all = await redis.hGetAll('submissions');
    if (!all || Object.keys(all).length === 0) {
      return NextResponse.json({ error: 'No submissions found' }, { status: 400 });
    }

    const submissions = Object.values(all)
      .map((v) => {
        try {
          return typeof v === 'string' ? JSON.parse(v) : v;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (submissions.length < 2) {
      return NextResponse.json({ error: 'Not enough submissions to form groups (minimum 2).' }, { status: 400 });
    }

    const profiles = submissions.map((s, i) => ({
      index: i + 1,
      name: s.fullName,
      format: s.format,
      workshop: s.workshop,
      aiExperience: s.aiExperience,
      buildSkills: s.buildSkills,
      aiTools: s.aiTools,
      hustleDirection: s.hustleDirection,
      hustleConcept: s.hustleConcept,
      availability: s.availability,
      deadlineApproach: s.deadlineApproach,
      meetingPreference: s.meetingPreference,
      peerPreference: s.peerPreference || null,
    }));

    const soloCount = profiles.filter((p) => p.format === 'solo').length;
    const groupingPool = profiles.length - soloCount;

    const prompt = `You are helping a university lecturer confirm rosters for Assignment 2 of BUSI3005 (AI for Business Transformation). The assignment is "AI Side Hustle Launch": each submission produces a real artefact, a founder narrative video, an AI process log, and a peer review. The brief is founder-honest, not pitch-polished.

Group constraints:
- Maximum group size is 3. Smaller is fine.
- Solo is a valid format. Any student whose "format" is "solo" must be returned as a one-person group; do not pair them with anyone.
- Students whose format is "pair" want a group of 2. Students whose format is "trio" want a group of 3. Honour the requested size where roster math allows; if it does not, prefer the closest size and flag it in flaggedConsiderations.
- Never mix students from different workshops (Wednesday 2–5pm vs Friday 8–11am) into the same group.

There are ${profiles.length} students total — ${soloCount} solo, ${groupingPool} seeking a group.

Profiles:
${JSON.stringify(profiles, null, 2)}

When matching non-solo students, prioritise (in order):
1. Same workshop (hard requirement).
2. Complementary build skills — avoid groups where everyone has the same single skill.
3. Compatible hustle direction — students with overlapping or clearly complementary hustleDirection / hustleConcept fields.
4. Overlapping availability windows.
5. Stated peer preferences and exclusions, where feasible.

Do not optimise for "balanced experience levels" as a primary criterion — small groups can work with similar experience profiles. Do not invent industry interests not present in the data. Do not produce a leaderboard or any gamified language.

Return ONLY a valid JSON object with this exact structure:
{
  "groups": [
    {
      "groupNumber": 1,
      "format": "solo|pair|trio",
      "workshop": "Wednesday 2–5pm|Friday 8–11am",
      "members": [
        { "name": "...", "aiExperience": "...", "hustleDirection": "..." }
      ],
      "rationale": "1–2 sentence explanation grounded in the actual profiles.",
      "hustleAlignmentNotes": "Brief note on how their hustle directions fit together (or 'solo' for solo groups)."
    }
  ],
  "summary": "2–3 sentence overview of how the matching went.",
  "flaggedConsiderations": ["Any peer preferences, mismatched sizes, or other issues for the lecturer to review."]
}

Do not include any text outside the JSON object.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', errText);
      return NextResponse.json({ error: 'AI service error — please try again.' }, { status: 500 });
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text || '';

    let groups;
    try {
      const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
      groups = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', rawText);
      return NextResponse.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500 });
    }

    await redis.set(
      'generated_groups',
      JSON.stringify({
        groups,
        generatedAt: new Date().toISOString(),
        totalStudents: profiles.length,
      }),
    );

    return NextResponse.json({ success: true, ...groups, generatedAt: new Date().toISOString(), totalStudents: profiles.length });
  } catch (error) {
    console.error('Generate groups error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const redis = await getRedisClient();
    const stored = await redis.get('generated_groups');
    if (!stored) return NextResponse.json({ groups: null });
    const data = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ groups: null });
  }
}
