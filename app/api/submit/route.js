import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../lib/redis';

const ALLOWED_WORKSHOPS = ['Wednesday 2–5pm', 'Friday 8–11am'];
const ALLOWED_FORMATS = ['solo', 'pair', 'trio'];

function validateSubmission(data) {
  if (!data || typeof data !== 'object') return 'Invalid request payload.';
  if (!ALLOWED_FORMATS.includes(data.format)) return 'Please choose solo, pair, or trio.';
  if (!data.fullName?.trim()) return 'Please enter your full name.';
  if (!ALLOWED_WORKSHOPS.includes(data.workshop)) return 'Please select your workshop.';
  if (!data.aiExperience) return 'Please select your AI experience level.';
  if (!Array.isArray(data.buildSkills) || data.buildSkills.length === 0) return 'Please pick at least one build skill.';
  if (data.format !== 'solo') {
    if (!Array.isArray(data.availability) || data.availability.length === 0) {
      return 'Please select at least one availability window.';
    }
    if (!data.deadlineApproach) return 'Please rate your deadline approach.';
  }
  if (!data.hustleDirection) return 'Please pick a hustle direction.';
  return null;
}

export async function POST(request) {
  try {
    const data = await request.json();
    const validationError = validateSubmission(data);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fullName = data.fullName.trim();
    const submission = {
      fullName,
      respondentId: fullName.toLowerCase(),
      format: data.format,
      workshop: data.workshop,
      aiExperience: data.aiExperience,
      aiTools: Array.isArray(data.aiTools) ? data.aiTools : [],
      buildSkills: data.buildSkills,
      availability: data.format === 'solo' ? [] : data.availability,
      deadlineApproach: data.format === 'solo' ? null : data.deadlineApproach,
      meetingPreference: data.format === 'solo' ? null : (data.meetingPreference || null),
      hustleDirection: data.hustleDirection,
      hustleConcept: data.hustleConcept?.trim() || '',
      peerPreference: data.peerPreference?.trim() || '',
      submittedAt: new Date().toISOString(),
    };

    const redis = await getRedisClient();
    await redis.hSet('submissions', submission.respondentId, JSON.stringify(submission));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
