import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../lib/redis';
import {
  createRecoveryCode,
  normalizeRespondentId,
  validateSubmission,
} from '../../../lib/group-formation-core';

const RECOVERY_INDEX = 'group-formation:recovery';

async function allocateRecoveryCode(redis) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = createRecoveryCode();
    const existing = await redis.hGet(RECOVERY_INDEX, code);
    if (!existing) return code;
  }
  throw new Error('Unable to allocate recovery code.');
}

export async function POST(request) {
  try {
    const data = await request.json();
    const validationError = validateSubmission(data);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fullName = data.fullName.trim();
    const respondentId = normalizeRespondentId(fullName);
    const redis = await getRedisClient();

    const existingRaw = await redis.hGet('submissions', respondentId);
    const existing = existingRaw ? safeParse(existingRaw) : null;

    let recoveryCode = existing?.recoveryCode || null;
    if (data.intent === 'seeking' && !recoveryCode) {
      recoveryCode = await allocateRecoveryCode(redis);
    }

    const matchStatusFromIntent = (() => {
      if (data.intent === 'solo') return 'solo';
      if (data.intent === 'declared-group') return 'declared';
      return 'seeking';
    })();

    const submission = {
      fullName,
      respondentId,
      intent: data.intent,
      workshop: data.workshop,
      aiExperience: data.aiExperience,
      aiTools: Array.isArray(data.aiTools) ? data.aiTools : [],
      buildSkills: data.buildSkills,
      availability: data.intent === 'seeking' ? data.availability : [],
      deadlineApproach: data.intent === 'seeking' ? data.deadlineApproach : null,
      meetingPreference: data.intent === 'seeking' ? (data.meetingPreference || null) : null,
      hustleDirection: data.hustleDirection,
      hustleConcept: data.hustleConcept?.trim() || '',
      members: data.intent === 'declared-group'
        ? data.members.map((m) => String(m || '').trim()).filter(Boolean)
        : [],
      email: data.intent === 'seeking' ? data.email.trim() : '',
      consentShare: data.intent === 'seeking' ? Boolean(data.consentShare) : false,
      matchStatus: existing?.matchStatus && existing.intent === data.intent
        ? existing.matchStatus
        : matchStatusFromIntent,
      confirmedGroup: existing?.confirmedGroup || [],
      recoveryCode,
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const multi = redis.multi();
    multi.hSet('submissions', respondentId, JSON.stringify(submission));
    if (recoveryCode) {
      multi.hSet(RECOVERY_INDEX, recoveryCode, respondentId);
    }
    await multi.exec();

    return NextResponse.json({
      success: true,
      respondentId,
      recoveryCode: data.intent === 'seeking' ? recoveryCode : null,
    });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}

function safeParse(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}
