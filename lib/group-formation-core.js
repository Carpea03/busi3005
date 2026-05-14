// Pure functions for the group-formation subsystem: validation, status
// derivation, and matchmaking scoring. No Redis access — wire those in
// /api/submit and /api/group-formation/matches.

export const WORKSHOPS = ['Wednesday 2–5pm', 'Friday 8–11am'];

export const INTENTS = ['solo', 'declared-group', 'seeking'];

export const MATCH_STATUSES = ['solo', 'declared', 'seeking', 'confirmed'];

const RECOVERY_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const RECOVERY_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{4}(?:-[23456789abcdefghjkmnpqrstuvwxyz]{4}){2}$/;

const UNI_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createRecoveryCode(randomSource = Math.random) {
  const groups = [];
  for (let g = 0; g < 3; g += 1) {
    let group = '';
    for (let c = 0; c < 4; c += 1) {
      group += RECOVERY_ALPHABET[Math.floor(randomSource() * RECOVERY_ALPHABET.length)] || RECOVERY_ALPHABET[0];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export function normalizeRecoveryCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidRecoveryCode(value) {
  return RECOVERY_PATTERN.test(normalizeRecoveryCode(value));
}

export function normalizeRespondentId(fullName) {
  return String(fullName || '').trim().toLowerCase();
}

export function validateSubmission(data) {
  if (!data || typeof data !== 'object') return 'Invalid request payload.';
  if (!INTENTS.includes(data.intent)) return 'Please choose how you’re doing Assignment 2.';
  if (!data.fullName?.trim()) return 'Please enter your full name.';
  if (!WORKSHOPS.includes(data.workshop)) return 'Please select your workshop.';
  if (!data.aiExperience) return 'Please select your AI experience level.';
  if (!Array.isArray(data.buildSkills) || data.buildSkills.length === 0) {
    return 'Please pick at least one build skill.';
  }
  if (!data.hustleDirection) return 'Please pick a hustle direction.';

  if (data.intent === 'declared-group') {
    const members = Array.isArray(data.members) ? data.members.map((m) => String(m || '').trim()).filter(Boolean) : [];
    if (members.length < 1 || members.length > 2) {
      return 'List the 1–2 other people in your group (not yourself).';
    }
  }

  if (data.intent === 'seeking') {
    if (!Array.isArray(data.availability) || data.availability.length === 0) {
      return 'Please select at least one availability window.';
    }
    if (!data.deadlineApproach) return 'Please rate your deadline approach.';
    if (!data.email?.trim()) return 'Please provide your uni email so matches can contact you.';
    if (!UNI_EMAIL_PATTERN.test(data.email.trim())) return 'That email doesn’t look right. Please check it.';
    if (!data.consentShare) {
      return 'Please tick the consent box so we can share your first name and email with up to five suggested classmates.';
    }
  }

  return null;
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || '';
}

function intersectionSize(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return 0;
  const set = new Set(right);
  let count = 0;
  for (const entry of left) {
    if (set.has(entry)) count += 1;
  }
  return count;
}

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

function experienceGap(a, b) {
  const ai = EXPERIENCE_LEVELS.indexOf(a);
  const bi = EXPERIENCE_LEVELS.indexOf(b);
  if (ai < 0 || bi < 0) return 0;
  return Math.abs(ai - bi);
}

// Score a candidate match against a seeker. Higher = better fit.
// Same workshop is a hard requirement enforced before calling this.
export function scoreMatch(seeker, candidate) {
  let score = 0;
  const reasons = [];

  if (seeker.hustleDirection && seeker.hustleDirection === candidate.hustleDirection) {
    score += 4;
    reasons.push('same hustle direction');
  }

  const skillOverlap = intersectionSize(seeker.buildSkills, candidate.buildSkills);
  const skillUnion = new Set([...(seeker.buildSkills || []), ...(candidate.buildSkills || [])]).size;
  const complementary = skillUnion - skillOverlap;
  if (complementary >= 3) {
    score += 3;
    reasons.push('complementary build skills');
  } else if (complementary >= 1) {
    score += 1;
  }

  const gap = experienceGap(seeker.aiExperience, candidate.aiExperience);
  if (gap >= 2) {
    score += 2;
    reasons.push('balances your AI experience');
  } else if (gap === 1) {
    score += 1;
  }

  const availabilityOverlap = intersectionSize(seeker.availability, candidate.availability);
  if (availabilityOverlap >= 2) {
    score += 2;
    reasons.push('availability overlaps');
  } else if (availabilityOverlap === 1) {
    score += 1;
  }

  const deadlineGap = Math.abs((seeker.deadlineApproach || 3) - (candidate.deadlineApproach || 3));
  if (deadlineGap <= 1) {
    score += 1;
  }

  return { score, reasons };
}

// Compute the top N candidate matches for a seeker. Candidates must be in the
// same workshop and have intent === 'seeking' with consentShare === true and
// matchStatus !== 'solo' and !== 'confirmed'.
export function computeMatches(seeker, candidates, { limit = 5 } = {}) {
  const pool = (candidates || []).filter((other) => {
    if (!other) return false;
    if (other.respondentId === seeker.respondentId) return false;
    if (other.workshop !== seeker.workshop) return false;
    if (other.intent !== 'seeking') return false;
    if (!other.consentShare) return false;
    if (other.matchStatus === 'solo' || other.matchStatus === 'confirmed') return false;
    return true;
  });

  const scored = pool.map((other) => {
    const { score, reasons } = scoreMatch(seeker, other);
    return {
      respondentId: other.respondentId,
      firstName: firstName(other.fullName),
      email: other.email || '',
      hustleDirection: other.hustleDirection || '',
      hustleConcept: other.hustleConcept || '',
      buildSkills: other.buildSkills || [],
      aiExperience: other.aiExperience || '',
      score,
      rationale: formatRationale(reasons),
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.firstName.localeCompare(b.firstName);
  });

  return scored.slice(0, limit);
}

function formatRationale(reasons) {
  if (!reasons || reasons.length === 0) {
    return 'Same workshop — could be worth a quick chat.';
  }
  const head = reasons[0][0].toUpperCase() + reasons[0].slice(1);
  const tail = reasons.slice(1).join(', ');
  return tail ? `${head}; also ${tail}.` : `${head}.`;
}
