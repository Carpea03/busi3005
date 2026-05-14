export const ADMIN_PASSWORD_STORAGE_KEY = 'au.quiz.admin.password';
export const STUDENT_IDENTITY_STORAGE_KEY = 'au.quiz.identity';

export const STUDENT_COHORTS = ['wednesday', 'friday', 'unspecified'];
export const QUIZ_COHORTS = ['wednesday', 'friday', 'both'];
export const QUIZ_STATUSES = ['draft', 'open', 'closed'];
export const QUESTION_TYPES = ['single_select', 'multi_select', 'likert_5', 'slider', 'free_text'];

export const RESERVED_KEYWORDS = new Set([
  'admin',
  'administrator',
  'alex',
  'api',
  'app',
  'exports',
  'false',
  'lecturer',
  'live',
  'me',
  'nan',
  'null',
  'quiz',
  'root',
  'student',
  'students',
  'test',
  'true',
  'undefined',
  'void',
]);

const KEYWORD_PATTERN = /^[a-z0-9_-]{4,24}$/;
const QUESTION_ID_PATTERN = /^[a-z0-9._-]{3,80}$/;
const RECOVERY_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const RECOVERY_CODE_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{4}(?:-[23456789abcdefghjkmnpqrstuvwxyz]{4}){2}$/;

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeKeyword(keyword) {
  return slugify(keyword).replace(/\./g, '-');
}

export function validateKeyword(keyword) {
  const normalized = normalizeKeyword(keyword);

  if (!normalized) {
    return { error: 'Please enter a keyword.' };
  }

  if (!KEYWORD_PATTERN.test(normalized)) {
    return {
      error: 'Keywords must be 4-24 characters using lowercase letters, numbers, hyphens, or underscores.',
    };
  }

  if (RESERVED_KEYWORDS.has(normalized)) {
    return { error: 'That keyword is reserved. Please choose another one.' };
  }

  return { value: normalized };
}

export function normalizeRecoveryCode(recoveryCode) {
  return String(recoveryCode || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateRecoveryCode(recoveryCode) {
  const normalized = normalizeRecoveryCode(recoveryCode);

  if (!normalized) {
    return { error: 'Enter your recovery code.' };
  }

  if (!RECOVERY_CODE_PATTERN.test(normalized)) {
    return { error: 'Recovery codes use three groups of four letters or numbers.' };
  }

  return { value: normalized };
}

export function createRecoveryCode(randomSource = Math.random) {
  const groups = [];

  for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
    let group = '';

    for (let charIndex = 0; charIndex < 4; charIndex += 1) {
      const randomIndex = Math.floor(randomSource() * RECOVERY_CODE_ALPHABET.length);
      group += RECOVERY_CODE_ALPHABET[randomIndex] || RECOVERY_CODE_ALPHABET[0];
    }

    groups.push(group);
  }

  return groups.join('-');
}

export function normalizeQuestionId(questionId) {
  return slugify(questionId);
}

// Effective status derives from a date gate plus an optional manual override.
// Override values: 'open' | 'closed' | null.
// - Manual 'open' wins until cleared (admin force-open).
// - Manual 'closed' wins until cleared (admin force-close).
// - Otherwise: status is 'draft' before releaseAt, 'open' while releaseAt <= now <= closeAt,
//   and 'closed' after closeAt. A null releaseAt means perpetually draft until overridden.
export function computeEffectiveStatus({ releaseAt, closeAt, override, now = new Date() } = {}) {
  if (override === 'open' || override === 'closed') {
    return override;
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const releaseMs = releaseAt ? new Date(releaseAt).getTime() : null;
  const closeMs = closeAt ? new Date(closeAt).getTime() : null;

  if (!releaseMs || Number.isNaN(releaseMs)) {
    return 'draft';
  }

  if (nowMs < releaseMs) {
    return 'draft';
  }

  if (closeMs && !Number.isNaN(closeMs) && nowMs > closeMs) {
    return 'closed';
  }

  return 'open';
}

export function wordCount(value) {
  const words = String(value || '').trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function cohortMatchesQuiz(studentCohort, quizCohort) {
  if (quizCohort === 'both') return true;
  if (!studentCohort || studentCohort === 'unspecified') return true;
  return studentCohort === quizCohort;
}

export function sanitizeTextPreview(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();

  if (!compact) return '';

  return compact
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
    .replace(/\b(?:\+?\d[\d\s()-]{7,}\d)\b/g, '[redacted number]')
    .slice(0, 220);
}

function levenshteinDistance(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
}

export function findNearbyQuestionId(questionId, existingQuestionIds = []) {
  const normalized = normalizeQuestionId(questionId);
  if (!normalized) return null;

  const candidates = existingQuestionIds
    .map((candidate) => normalizeQuestionId(candidate))
    .filter(Boolean)
    .filter((candidate) => candidate !== normalized);

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(normalized, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  if (bestDistance <= 2) {
    return bestMatch;
  }

  return null;
}

function normalizeOptions(options = [], { fallbackLikert = false } = {}) {
  const normalizedOptions = Array.isArray(options)
    ? options
        .map((option, index) => {
          if (typeof option === 'string') {
            const value = slugify(option) || `option-${index + 1}`;
            return { value, label: option.trim() || `Option ${index + 1}` };
          }

          const label = String(option?.label || '').trim();
          const value = slugify(option?.value || label || `option-${index + 1}`);

          return value && label ? { value, label } : null;
        })
        .filter(Boolean)
    : [];

  if (fallbackLikert && normalizedOptions.length === 0) {
    return [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }));
  }

  return normalizedOptions;
}

function hasDuplicateOptionValues(options) {
  const seen = new Set();
  for (const option of options) {
    if (seen.has(option.value)) return true;
    seen.add(option.value);
  }
  return false;
}

function normalizeSliderConfig(config = {}) {
  const min = Number.isFinite(Number(config.min)) ? Number(config.min) : 0;
  const max = Number.isFinite(Number(config.max)) ? Number(config.max) : 100;
  const step = Number.isFinite(Number(config.step)) ? Number(config.step) : 1;

  return {
    min,
    max,
    step,
    labelMin: String(config.labelMin || '').trim(),
    labelMax: String(config.labelMax || '').trim(),
  };
}

function normalizeFreeTextConfig(config = {}) {
  const minWords = Number.isFinite(Number(config.minWords)) ? Math.max(0, Number(config.minWords)) : 0;
  const maxWords = Number.isFinite(Number(config.maxWords)) ? Math.max(minWords, Number(config.maxWords)) : 500;

  return {
    minWords,
    maxWords,
    placeholder: String(config.placeholder || '').trim(),
  };
}

export function validateQuizDefinition(input, { existingSpineQuestionIds = [], allowedSpineQuestionIds = [] } = {}) {
  if (!input || typeof input !== 'object') {
    return { error: 'Invalid quiz payload.' };
  }

  const title = String(input.title || '').trim();
  const weekNumber = Number(input.weekNumber);
  const cohort = String(input.cohort || '').trim().toLowerCase();

  if (!title) {
    return { error: 'Please enter a quiz title.' };
  }

  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
    return { error: 'Week number must be a whole number between 1 and 52.' };
  }

  if (!QUIZ_COHORTS.includes(cohort)) {
    return { error: 'Please choose a valid quiz cohort.' };
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    return { error: 'Add at least one question before saving the quiz.' };
  }

  const seenQuestionIds = new Set();
  const normalizedAllowedSpineIds = new Set(allowedSpineQuestionIds.map((value) => normalizeQuestionId(value)));
  const normalizedExistingSpineIds = existingSpineQuestionIds
    .map((value) => normalizeQuestionId(value))
    .filter(Boolean);

  const questions = [];

  for (let index = 0; index < input.questions.length; index += 1) {
    const question = input.questions[index] || {};
    const type = String(question.type || '').trim();
    const prompt = String(question.prompt || '').trim();
    const questionId = normalizeQuestionId(question.questionId || `question-${index + 1}`);
    const helpText = String(question.helpText || '').trim();
    const isSpine = Boolean(question.isSpine);

    if (!prompt) {
      return { error: `Question ${index + 1} needs a prompt.` };
    }

    if (!QUESTION_TYPES.includes(type)) {
      return { error: `Question ${index + 1} has an invalid type.` };
    }

    if (!questionId || !QUESTION_ID_PATTERN.test(questionId)) {
      return { error: `Question ${index + 1} needs a valid question ID.` };
    }

    if (seenQuestionIds.has(questionId)) {
      return { error: `Question ID "${questionId}" is duplicated in this quiz.` };
    }

    const nearbyMatch = isSpine && !normalizedAllowedSpineIds.has(questionId)
      ? findNearbyQuestionId(questionId, normalizedExistingSpineIds)
      : null;

    if (nearbyMatch) {
      return {
        error: `Spine question ID "${questionId}" is too close to existing spine ID "${nearbyMatch}". Reuse the existing ID or choose a clearly different one.`,
      };
    }

    let options = [];
    let sliderConfig = undefined;
    let freeTextConfig = undefined;

    if (type === 'single_select' || type === 'multi_select') {
      options = normalizeOptions(question.options);
      if (options.length < 2) {
        return { error: `Question ${index + 1} needs at least two options.` };
      }
      if (hasDuplicateOptionValues(options)) {
        return { error: `Question ${index + 1} has duplicate option values.` };
      }
    }

    if (type === 'likert_5') {
      options = normalizeOptions(question.options, { fallbackLikert: true });
      if (options.length !== 5) {
        return { error: `Question ${index + 1} needs exactly five Likert options.` };
      }
      if (hasDuplicateOptionValues(options)) {
        return { error: `Question ${index + 1} has duplicate Likert option values.` };
      }
    }

    if (type === 'slider') {
      sliderConfig = normalizeSliderConfig(question.sliderConfig);
      if (sliderConfig.max <= sliderConfig.min) {
        return { error: `Question ${index + 1} has an invalid slider range.` };
      }
      if (sliderConfig.step <= 0) {
        return { error: `Question ${index + 1} needs a positive slider step.` };
      }
    }

    if (type === 'free_text') {
      freeTextConfig = normalizeFreeTextConfig(question.freeTextConfig);
      if (freeTextConfig.maxWords < freeTextConfig.minWords) {
        return { error: `Question ${index + 1} has an invalid word limit.` };
      }
    }

    seenQuestionIds.add(questionId);

    questions.push({
      questionId,
      type,
      prompt,
      helpText,
      options,
      sliderConfig,
      freeTextConfig,
      isSpine,
    });
  }

  return {
    value: {
      title,
      weekNumber,
      cohort,
      questions,
    },
  };
}

export function validateQuizResponseSubmission(quiz, answersInput = []) {
  if (!quiz || typeof quiz !== 'object') {
    return { error: 'Quiz not found.' };
  }

  if (quiz.status !== 'open') {
    return { error: 'This quiz is closed.' };
  }

  if (!Array.isArray(answersInput)) {
    return { error: 'Answers must be sent as an array.' };
  }

  const answersById = new Map();
  for (const answer of answersInput) {
    const questionId = normalizeQuestionId(answer?.questionId);
    if (questionId) {
      answersById.set(questionId, answer?.value);
    }
  }

  const answers = [];

  for (const question of quiz.questions || []) {
    const rawValue = answersById.get(question.questionId);

    if (question.type === 'single_select' || question.type === 'likert_5') {
      const value = String(rawValue || '').trim();
      if (!value) {
        return { error: `Please answer "${question.prompt}".` };
      }

      const allowedValues = new Set((question.options || []).map((option) => option.value));
      if (!allowedValues.has(value)) {
        return { error: `"${question.prompt}" contains an invalid option.` };
      }

      answers.push({ questionId: question.questionId, value });
      continue;
    }

    if (question.type === 'multi_select') {
      const list = Array.isArray(rawValue) ? rawValue.map((value) => String(value).trim()).filter(Boolean) : [];
      if (list.length === 0) {
        return { error: `Please answer "${question.prompt}".` };
      }

      const allowedValues = new Set((question.options || []).map((option) => option.value));
      const deduped = [...new Set(list)];
      if (deduped.some((value) => !allowedValues.has(value))) {
        return { error: `"${question.prompt}" contains an invalid option.` };
      }

      answers.push({ questionId: question.questionId, value: deduped });
      continue;
    }

    if (question.type === 'slider') {
      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return { error: `Please answer "${question.prompt}".` };
      }

      const sliderConfig = question.sliderConfig || normalizeSliderConfig();
      if (numericValue < sliderConfig.min || numericValue > sliderConfig.max) {
        return { error: `"${question.prompt}" is outside the allowed slider range.` };
      }

      answers.push({ questionId: question.questionId, value: numericValue });
      continue;
    }

    if (question.type === 'free_text') {
      const value = String(rawValue || '').trim();
      if (!value) {
        return { error: `Please answer "${question.prompt}".` };
      }

      const freeTextConfig = question.freeTextConfig || normalizeFreeTextConfig();
      const totalWords = wordCount(value);
      if (totalWords < freeTextConfig.minWords) {
        return { error: `"${question.prompt}" needs at least ${freeTextConfig.minWords} words.` };
      }
      if (totalWords > freeTextConfig.maxWords) {
        return { error: `"${question.prompt}" must stay under ${freeTextConfig.maxWords} words.` };
      }

      answers.push({ questionId: question.questionId, value });
    }
  }

  return { value: answers };
}

export function buildStoredResponse({ quiz, student, keyword, answers, existingResponse = null, submittedAt = new Date().toISOString() }) {
  return {
    quizId: quiz.quizId,
    keyword,
    responseId: createResponseId(quiz.quizId, keyword),
    answers,
    submittedAt,
    cohort: student?.cohort || 'unspecified',
    aggregateSnapshots: existingResponse?.aggregateSnapshots || {},
    ...(existingResponse ? { wasResubmitted: true } : {}),
  };
}

export function createResponseId(quizId, keyword) {
  return `${quizId}:${normalizeKeyword(keyword)}`;
}

function findAnswerForQuestion(response, questionId) {
  return (response.answers || []).find((answer) => normalizeQuestionId(answer.questionId) === normalizeQuestionId(questionId));
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function computeSliderDistribution(values, sliderConfig = {}) {
  if (values.length === 0) {
    return { buckets: [], mean: 0, median: 0, stddev: 0 };
  }

  const min = Number.isFinite(Number(sliderConfig.min)) ? Number(sliderConfig.min) : 0;
  const max = Number.isFinite(Number(sliderConfig.max)) ? Number(sliderConfig.max) : 100;
  const bucketSize = min === 0 && max === 100 ? 10 : Math.max(1, Math.ceil((max - min + 1) / 10));
  const bucketCount = Math.max(1, Math.ceil((max - min + 1) / bucketSize));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketMin = min + (index * bucketSize);
    const bucketMax = Math.min(max, bucketMin + bucketSize - 1);
    return {
      label: `${bucketMin}-${bucketMax}`,
      min: bucketMin,
      max: bucketMax,
      count: 0,
    };
  });

  for (const value of values) {
    const clamped = Math.min(max, Math.max(min, value));
    const bucketIndex = Math.min(buckets.length - 1, Math.floor((clamped - min) / bucketSize));
    buckets[bucketIndex].count += 1;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  const mean = total / values.length;
  const medianIndex = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
    : sortedValues[medianIndex];
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;

  return {
    buckets,
    mean: roundNumber(mean),
    median: roundNumber(median),
    stddev: roundNumber(Math.sqrt(variance)),
  };
}

function computeSingleSelectDistribution(question, answeredResponses) {
  const counts = Object.fromEntries((question.options || []).map((option) => [option.value, 0]));

  for (const { answer } of answeredResponses) {
    if (answer && Object.prototype.hasOwnProperty.call(counts, answer.value)) {
      counts[answer.value] += 1;
    }
  }

  return {
    totalResponses: answeredResponses.length,
    distribution: { counts },
  };
}

function computeMultiSelectDistribution(question, answeredResponses) {
  const counts = Object.fromEntries((question.options || []).map((option) => [option.value, 0]));
  let totalSelections = 0;

  for (const { answer } of answeredResponses) {
    const values = Array.isArray(answer?.value) ? answer.value : [];
    totalSelections += values.length;
    for (const value of values) {
      if (Object.prototype.hasOwnProperty.call(counts, value)) {
        counts[value] += 1;
      }
    }
  }

  return {
    totalResponses: answeredResponses.length,
    distribution: {
      counts,
      averageSelections: answeredResponses.length ? roundNumber(totalSelections / answeredResponses.length, 2) : 0,
    },
  };
}

function computeSliderAggregateDistribution(question, answeredResponses) {
  const values = answeredResponses
    .map(({ answer }) => Number(answer?.value))
    .filter((value) => Number.isFinite(value));

  return {
    totalResponses: values.length,
    distribution: computeSliderDistribution(values, question.sliderConfig),
  };
}

function computeFreeTextDistribution(answeredResponses) {
  const recentResponses = answeredResponses
    .sort((left, right) => new Date(left.response.submittedAt || 0).getTime() - new Date(right.response.submittedAt || 0).getTime())
    .slice(-10)
    .map(({ response, answer }) => {
      const text = sanitizeTextPreview(answer?.value);
      if (!text) {
        return null;
      }

      return {
        responseId: response.responseId || createResponseId(response.quizId, response.keyword),
        cohort: response.cohort || 'unspecified',
        submittedAt: response.submittedAt || null,
        text,
      };
    })
    .filter(Boolean);

  return {
    totalResponses: answeredResponses.length,
    distribution: {
      count: answeredResponses.length,
      sample: recentResponses.slice(-5).map((entry) => entry.text),
      recentResponses,
    },
  };
}

function computeQuestionAggregatePayload(question, answeredResponses) {
  if (question.type === 'single_select' || question.type === 'likert_5') {
    return computeSingleSelectDistribution(question, answeredResponses);
  }

  if (question.type === 'multi_select') {
    return computeMultiSelectDistribution(question, answeredResponses);
  }

  if (question.type === 'slider') {
    return computeSliderAggregateDistribution(question, answeredResponses);
  }

  return computeFreeTextDistribution(answeredResponses);
}

export function computeQuizAggregates(quiz, responses = []) {
  const aggregates = {};

  for (const question of quiz.questions || []) {
    const answeredResponses = responses
      .map((response) => ({
        response,
        answer: findAnswerForQuestion(response, question.questionId),
      }))
      .filter(({ answer }) => answer !== undefined);

    const aggregatePayload = computeQuestionAggregatePayload(question, answeredResponses);
    const byCohort = quiz.cohort === 'both'
      ? Object.fromEntries(
          STUDENT_COHORTS.map((cohort) => [
            cohort,
            computeQuestionAggregatePayload(
              question,
              answeredResponses.filter(({ response }) => (response.cohort || 'unspecified') === cohort),
            ),
          ]),
        )
      : undefined;

    aggregates[question.questionId] = {
      quizId: quiz.quizId,
      questionId: question.questionId,
      totalResponses: aggregatePayload.totalResponses,
      distribution: aggregatePayload.distribution,
      ...(byCohort ? { byCohort } : {}),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  return aggregates;
}

export async function loadStableAggregateSnapshot({ getVersion, loadResponses, compute }) {
  while (true) {
    const startVersion = Number(await getVersion());
    const responses = await loadResponses();
    const value = await compute(responses);
    const endVersion = Number(await getVersion());

    if (startVersion === endVersion) {
      return { version: endVersion, value };
    }
  }
}

export function createQuizId({ title, weekNumber, now = new Date(), randomSuffix = Math.random().toString(36).slice(2, 7) }) {
  const dateStamp = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, '0'), String(now.getUTCDate()).padStart(2, '0')].join('');
  const titleSlug = slugify(title).replace(/\./g, '-').slice(0, 40) || 'quiz';
  return `week-${weekNumber}-${titleSlug}-${dateStamp}-${randomSuffix}`;
}

export function parseJsonSafely(value) {
  if (!value) return null;

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

export function formatPercentage(count, total) {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export function getAggregateForCohort(aggregate, cohort) {
  if (!aggregate) {
    return null;
  }

  if (!cohort || !aggregate.byCohort?.[cohort]) {
    return aggregate;
  }

  return {
    quizId: aggregate.quizId,
    questionId: aggregate.questionId,
    totalResponses: aggregate.byCohort[cohort].totalResponses,
    distribution: aggregate.byCohort[cohort].distribution,
    lastUpdatedAt: aggregate.lastUpdatedAt,
  };
}

export function getReleasedTextResponses(aggregate, releasedTextResponseIds = []) {
  const releasedSet = new Set(releasedTextResponseIds || []);
  return (aggregate?.distribution?.recentResponses || []).filter((entry) => releasedSet.has(entry.responseId));
}

export function isQuestionReleased(releasedQuestionIds, questionId) {
  return releasedQuestionIds.some((releasedId) => normalizeQuestionId(releasedId) === normalizeQuestionId(questionId));
}

export function buildQuestionReleaseLookup(releases = []) {
  return releases.reduce((lookup, release) => {
    lookup[normalizeQuestionId(release.questionId)] = release;
    return lookup;
  }, {});
}

export function normaliseTextForSearch(value) {
  return String(value || '').trim().toLowerCase();
}

export function createKeywordDisclosure(keyword) {
  const safeKeyword = String(keyword || '').trim();
  if (!safeKeyword) return 'Your keyword is your identity.';

  return `Your keyword is your identity: ${safeKeyword}. There is no password recovery.`;
}

export function removeExactPhrase(text, phrase) {
  const source = String(text || '');
  const exact = String(phrase || '').trim();

  if (!source || !exact) return source;

  return source.replace(new RegExp(escapeRegExp(exact), 'g'), '').trim();
}