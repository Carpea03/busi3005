import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';
import {
  computeMatches,
  isValidRecoveryCode,
  normalizeRecoveryCode,
} from '../../../../lib/group-formation-core';

const RECOVERY_INDEX = 'group-formation:recovery';

function safeParse(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

async function loadByRecoveryCode(redis, rawCode) {
  if (!isValidRecoveryCode(rawCode)) {
    return { error: 'Recovery codes use three groups of four letters or numbers.' };
  }
  const code = normalizeRecoveryCode(rawCode);
  const respondentId = await redis.hGet(RECOVERY_INDEX, code);
  if (!respondentId) {
    return { error: 'Recovery code not found. Check the code and try again.' };
  }
  const raw = await redis.hGet('submissions', respondentId);
  const submission = safeParse(raw);
  if (!submission || submission.intent !== 'seeking') {
    return { error: 'No matchmaking submission found for that code.' };
  }
  return { submission };
}

async function loadAllSubmissions(redis) {
  const all = await redis.hGetAll('submissions');
  return Object.values(all || {}).map(safeParse).filter(Boolean);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const redis = await getRedisClient();
    const result = await loadByRecoveryCode(redis, code);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const seeker = result.submission;
    const all = await loadAllSubmissions(redis);
    const matches = computeMatches(seeker, all, { limit: 5 });

    return NextResponse.json({
      self: {
        fullName: seeker.fullName,
        workshop: seeker.workshop,
        hustleDirection: seeker.hustleDirection,
        matchStatus: seeker.matchStatus,
        confirmedGroup: seeker.confirmedGroup || [],
        recoveryCode: seeker.recoveryCode,
      },
      matches,
    });
  } catch (error) {
    console.error('Matches GET error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}

// PATCH actions:
//   { action: 'confirm', members: ['Priya Sharma', 'Jordan Lee'] }
//   { action: 'switch-to-solo' }
//   { action: 'reset' } — back to seeking
export async function PATCH(request) {
  try {
    const body = await request.json();
    const code = body?.code;
    const redis = await getRedisClient();
    const result = await loadByRecoveryCode(redis, code);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const submission = result.submission;
    const updated = { ...submission, updatedAt: new Date().toISOString() };

    if (body.action === 'confirm') {
      const members = Array.isArray(body.members)
        ? body.members.map((m) => String(m || '').trim()).filter(Boolean)
        : [];
      if (members.length < 1 || members.length > 2) {
        return NextResponse.json(
          { error: 'List 1–2 other group members (not yourself).' },
          { status: 400 },
        );
      }
      updated.matchStatus = 'confirmed';
      updated.confirmedGroup = members;
    } else if (body.action === 'switch-to-solo') {
      updated.matchStatus = 'solo';
      updated.confirmedGroup = [];
    } else if (body.action === 'reset') {
      updated.matchStatus = 'seeking';
      updated.confirmedGroup = [];
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    await redis.hSet('submissions', submission.respondentId, JSON.stringify(updated));

    return NextResponse.json({
      success: true,
      matchStatus: updated.matchStatus,
      confirmedGroup: updated.confirmedGroup,
    });
  } catch (error) {
    console.error('Matches PATCH error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
