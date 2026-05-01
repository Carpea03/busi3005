import { getRedisClient } from './redis.js';
import {
  QUIZ_STATUSES,
  STUDENT_COHORTS,
  buildQuestionReleaseLookup,
  buildStoredResponse,
  computeQuizAggregates,
  createRecoveryCode,
  cohortMatchesQuiz,
  createResponseId,
  createQuizId,
  loadStableAggregateSnapshot,
  normalizeKeyword,
  normalizeRecoveryCode,
  normalizeQuestionId,
  parseJsonSafely,
  sanitizeTextPreview,
  validateRecoveryCode,
  validateKeyword,
  validateQuizDefinition,
  validateQuizResponseSubmission,
} from './quiz-core.js';
import { publishQuizLiveEvent } from './quiz-live.js';

function studentKey(keyword) {
  return `student:${keyword}`;
}

function quizKey(quizId) {
  return `quiz:${quizId}`;
}

function studentRecoveryKey(recoveryCode) {
  return `student-recovery:${recoveryCode}`;
}

function responseKey(quizId, keyword) {
  return `response:${quizId}:${keyword}`;
}

function aggregateKey(quizId, questionId) {
  return `aggregate:${quizId}:${questionId}`;
}

function releaseKey(quizId, questionId) {
  return `release:${quizId}:${questionId}`;
}

function textReleaseKey(quizId, questionId, responseId) {
  return `text-release:${quizId}:${questionId}:${responseId}`;
}

function aggregateVersionKey(quizId) {
  return `meta:aggregate-version:${quizId}`;
}

async function scanKeys(pattern) {
  const redis = await getRedisClient();
  const keys = [];

  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(key);
  }

  return keys;
}

async function getJson(key) {
  const redis = await getRedisClient();
  return parseJsonSafely(await redis.get(key));
}

async function setJson(key, value) {
  const redis = await getRedisClient();
  await redis.set(key, JSON.stringify(value));
  return value;
}

async function loadRecords(pattern) {
  const redis = await getRedisClient();
  const keys = await scanKeys(pattern);

  if (keys.length === 0) {
    return [];
  }

  const values = await redis.mGet(keys);
  return values.map((value) => parseJsonSafely(value)).filter(Boolean);
}

async function publishLiveUpdate(payload) {
  try {
    await publishQuizLiveEvent(payload);
  } catch (error) {
    console.error('Quiz live publish error:', error);
  }
}

function sortQuizzes(quizzes) {
  return quizzes.sort((left, right) => {
    if ((right.weekNumber || 0) !== (left.weekNumber || 0)) {
      return (right.weekNumber || 0) - (left.weekNumber || 0);
    }
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });
}

function sortResponses(responses) {
  return responses.sort((left, right) => new Date(left.submittedAt || 0).getTime() - new Date(right.submittedAt || 0).getTime());
}

function sortStudents(students) {
  return students.sort((left, right) => String(left.keyword || '').localeCompare(String(right.keyword || '')));
}

function groupBy(items, getKey) {
  return items.reduce((lookup, item) => {
    const key = getKey(item);
    if (!lookup[key]) {
      lookup[key] = [];
    }
    lookup[key].push(item);
    return lookup;
  }, {});
}

function buildQuizLookup(quizzes) {
  return Object.fromEntries(quizzes.map((quiz) => [quiz.quizId, quiz]));
}

function buildQuestionLookup(quizzes) {
  return quizzes.reduce((lookup, quiz) => {
    lookup[quiz.quizId] = Object.fromEntries(
      (quiz.questions || []).map((question) => [normalizeQuestionId(question.questionId), question]),
    );
    return lookup;
  }, {});
}

function buildAggregatesLookup(aggregatesByQuiz) {
  return Object.fromEntries(
    Object.entries(aggregatesByQuiz).map(([quizId, aggregates]) => [
      quizId,
      Object.fromEntries((aggregates || []).map((aggregate) => [normalizeQuestionId(aggregate.questionId), aggregate])),
    ]),
  );
}

function cloneJson(value) {
  if (!value) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function buildTextReleaseLookup(textReleases = []) {
  return textReleases.reduce((lookup, release) => {
    const questionId = normalizeQuestionId(release.questionId);
    if (!lookup[questionId]) {
      lookup[questionId] = [];
    }
    lookup[questionId].push(release.responseId);
    return lookup;
  }, {});
}

export function buildTextResponseQueueByQuestion({ quiz, responses = [], textReleases = [] }) {
  const freeTextQuestionIds = new Set(
    (quiz?.questions || [])
      .filter((question) => question.type === 'free_text')
      .map((question) => normalizeQuestionId(question.questionId)),
  );

  const releasedLookup = Object.fromEntries(
    Object.entries(buildTextReleaseLookup(textReleases)).map(([questionId, responseIds]) => [questionId, new Set(responseIds)]),
  );

  const queue = {};
  for (const questionId of freeTextQuestionIds) {
    queue[questionId] = [];
  }

  for (const response of sortResponses([...responses]).reverse()) {
    for (const answer of response.answers || []) {
      const questionId = normalizeQuestionId(answer.questionId);
      if (!freeTextQuestionIds.has(questionId)) {
        continue;
      }

      const text = sanitizeTextPreview(answer.value);
      if (!text) {
        continue;
      }

      const responseId = response.responseId || createResponseId(response.quizId, response.keyword);

      queue[questionId].push({
        responseId,
        keyword: response.keyword,
        cohort: response.cohort || 'unspecified',
        submittedAt: response.submittedAt || null,
        text,
        isReleased: releasedLookup[questionId]?.has(responseId) || false,
      });
    }
  }

  return queue;
}

export function buildResponseAggregateSnapshots(response, aggregates = []) {
  const aggregateLookup = Object.fromEntries(
    (aggregates || []).map((aggregate) => [normalizeQuestionId(aggregate.questionId), aggregate]),
  );

  return (response.answers || []).reduce((snapshots, answer) => {
    const questionId = normalizeQuestionId(answer.questionId);
    if (aggregateLookup[questionId]) {
      snapshots[questionId] = cloneJson(aggregateLookup[questionId]);
    }
    return snapshots;
  }, {});
}

function questionOptionLabel(question, value) {
  return question?.options?.find((option) => option.value === value)?.label || value;
}

export function formatAnswerValue(question, value) {
  if (Array.isArray(value)) {
    return value.map((entry) => questionOptionLabel(question, entry)).join('; ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (question?.type === 'single_select' || question?.type === 'likert_5') {
    return String(questionOptionLabel(question, value));
  }

  return String(value);
}

function compareTrajectoryEntries(left, right) {
  if ((left.weekNumber || 0) !== (right.weekNumber || 0)) {
    return (left.weekNumber || 0) - (right.weekNumber || 0);
  }
  return new Date(left.submittedAt || 0).getTime() - new Date(right.submittedAt || 0).getTime();
}

export function buildTrajectorySnapshot({ student, quizzes, responses, aggregatesByQuiz = {} }) {
  const sortedResponses = sortResponses([...responses]);
  const quizLookup = buildQuizLookup(quizzes);
  const questionLookup = buildQuestionLookup(quizzes);
  const aggregatesLookup = buildAggregatesLookup(aggregatesByQuiz);

  const timeline = sortedResponses.map((response) => {
    const quiz = quizLookup[response.quizId] || {};
    const quizQuestions = questionLookup[response.quizId] || {};

    return {
      quizId: response.quizId,
      quizTitle: quiz.title || response.quizId,
      weekNumber: quiz.weekNumber || null,
      submittedAt: response.submittedAt,
      cohort: response.cohort || student?.cohort || 'unspecified',
      answers: (response.answers || []).map((answer) => {
        const questionId = normalizeQuestionId(answer.questionId);
        const question = quizQuestions[questionId] || null;

        return {
          questionId,
          prompt: question?.prompt || questionId,
          questionType: question?.type || null,
          isSpine: Boolean(question?.isSpine),
          answerValue: answer.value,
          answerLabel: formatAnswerValue(question, answer.value),
          aggregate: response.aggregateSnapshots?.[questionId] || aggregatesLookup[response.quizId]?.[questionId] || null,
        };
      }),
    };
  });

  const spineMap = {};
  const freeTextResponses = [];

  for (const item of timeline) {
    for (const answer of item.answers) {
      if (answer.questionType === 'free_text') {
        freeTextResponses.push({
          quizId: item.quizId,
          quizTitle: item.quizTitle,
          weekNumber: item.weekNumber,
          submittedAt: item.submittedAt,
          questionId: answer.questionId,
          prompt: answer.prompt,
          value: answer.answerLabel,
        });
      }

      if (!answer.isSpine) {
        continue;
      }

      if (!spineMap[answer.questionId]) {
        spineMap[answer.questionId] = {
          questionId: answer.questionId,
          prompt: answer.prompt,
          questionType: answer.questionType,
          entries: [],
        };
      }

      if (!spineMap[answer.questionId].prompt && answer.prompt) {
        spineMap[answer.questionId].prompt = answer.prompt;
      }

      spineMap[answer.questionId].entries.push({
        quizId: item.quizId,
        quizTitle: item.quizTitle,
        weekNumber: item.weekNumber,
        submittedAt: item.submittedAt,
        cohort: item.cohort,
        prompt: answer.prompt,
        questionType: answer.questionType,
        answerValue: answer.answerValue,
        answerLabel: answer.answerLabel,
        aggregate: answer.aggregate,
      });
    }
  }

  const spineQuestions = Object.values(spineMap)
    .map((question) => ({
      ...question,
      entries: [...question.entries].sort(compareTrajectoryEntries),
    }))
    .sort((left, right) => left.questionId.localeCompare(right.questionId));

  return {
    student,
    totalResponses: timeline.length,
    quizzesAnswered: new Set(timeline.map((item) => item.quizId)).size,
    spineQuestions,
    timeline,
    freeTextResponses: freeTextResponses.sort(compareTrajectoryEntries),
  };
}

export function buildResponsesExportRows({ students, quizzes, responses }) {
  const studentLookup = Object.fromEntries(students.map((student) => [student.keyword, student]));
  const quizLookup = buildQuizLookup(quizzes);
  const questionLookup = buildQuestionLookup(quizzes);

  return sortResponses([...responses]).flatMap((response) => {
    const student = studentLookup[response.keyword] || null;
    const quiz = quizLookup[response.quizId] || {};
    const quizQuestions = questionLookup[response.quizId] || {};

    return (response.answers || []).map((answer) => {
      const questionId = normalizeQuestionId(answer.questionId);
      const question = quizQuestions[questionId] || null;

      return {
        keyword: response.keyword,
        displayName: student?.displayName || '',
        cohort: response.cohort || student?.cohort || '',
        weekNumber: quiz.weekNumber || '',
        quizId: response.quizId,
        quizTitle: quiz.title || '',
        questionId,
        prompt: question?.prompt || questionId,
        questionType: question?.type || '',
        value: formatAnswerValue(question, answer.value),
        submittedAt: response.submittedAt || '',
      };
    });
  });
}

function buildTrajectoryColumnSpecs(quizzes) {
  const seen = new Set();
  const columns = [];

  const orderedQuizzes = [...quizzes].sort((left, right) => {
    if ((left.weekNumber || 0) !== (right.weekNumber || 0)) {
      return (left.weekNumber || 0) - (right.weekNumber || 0);
    }
    return String(left.quizId).localeCompare(String(right.quizId));
  });

  for (const quiz of orderedQuizzes) {
    for (const question of quiz.questions || []) {
      if (!question.isSpine) {
        continue;
      }

      const questionId = normalizeQuestionId(question.questionId);
      const key = `${questionId}__week_${quiz.weekNumber}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      columns.push({
        key,
        questionId,
        weekNumber: quiz.weekNumber,
        prompt: question.prompt,
      });
    }
  }

  return columns.sort((left, right) => {
    if (left.questionId !== right.questionId) {
      return left.questionId.localeCompare(right.questionId);
    }
    return (left.weekNumber || 0) - (right.weekNumber || 0);
  });
}

export function buildTrajectoryExportTable({ students, quizzes, responses }) {
  const questionLookup = buildQuestionLookup(quizzes);
  const quizLookup = buildQuizLookup(quizzes);
  const responsesByKeyword = groupBy(responses, (response) => response.keyword);
  const spineColumns = buildTrajectoryColumnSpecs(quizzes);

  const rows = sortStudents([...students]).map((student) => {
    const row = {
      keyword: student.keyword,
      displayName: student.displayName || '',
      cohort: student.cohort || '',
    };

    for (const column of spineColumns) {
      row[column.key] = '';
    }

    for (const response of sortResponses([...(responsesByKeyword[student.keyword] || [])])) {
      const quiz = quizLookup[response.quizId] || {};
      const quizQuestions = questionLookup[response.quizId] || {};

      for (const answer of response.answers || []) {
        const questionId = normalizeQuestionId(answer.questionId);
        const question = quizQuestions[questionId] || null;

        if (!question?.isSpine) {
          continue;
        }

        const columnKey = `${questionId}__week_${quiz.weekNumber}`;
        const value = formatAnswerValue(question, answer.value);
        row[columnKey] = row[columnKey] ? `${row[columnKey]} || ${value}` : value;
      }
    }

    return row;
  });

  return {
    columns: spineColumns,
    rows,
  };
}

function emptyAggregatePayload(question) {
  if (question.type === 'single_select' || question.type === 'likert_5') {
    return {
      totalResponses: 0,
      distribution: {
        counts: Object.fromEntries((question.options || []).map((option) => [option.value, 0])),
      },
    };
  }

  if (question.type === 'multi_select') {
    return {
      totalResponses: 0,
      distribution: {
        counts: Object.fromEntries((question.options || []).map((option) => [option.value, 0])),
        averageSelections: 0,
      },
    };
  }

  if (question.type === 'slider') {
    return {
      totalResponses: 0,
      distribution: {
        buckets: [],
        mean: 0,
        median: 0,
        stddev: 0,
      },
    };
  }

  return {
    totalResponses: 0,
    distribution: {
      count: 0,
      sample: [],
      recentResponses: [],
    },
  };
}

function emptyAggregateForQuestion(quiz, question) {
  const payload = emptyAggregatePayload(question);
  return {
    quizId: quiz.quizId,
    questionId: question.questionId,
    totalResponses: payload.totalResponses,
    distribution: payload.distribution,
    ...(quiz.cohort === 'both'
      ? {
          byCohort: Object.fromEntries(
            STUDENT_COHORTS.map((cohort) => [cohort, emptyAggregatePayload(question)]),
          ),
        }
      : {}),
    lastUpdatedAt: null,
  };
}

function hydrateQuizPayload(quiz, aggregates, releases, textReleases, responses) {
  const aggregateLookup = aggregates.reduce((lookup, aggregate) => {
    lookup[normalizeQuestionId(aggregate.questionId)] = aggregate;
    return lookup;
  }, {});

  const releaseLookup = buildQuestionReleaseLookup(releases);
  const textReleaseLookup = buildTextReleaseLookup(textReleases);
  const textQueueLookup = buildTextResponseQueueByQuestion({ quiz, responses, textReleases });

  return {
    quizId: quiz.quizId,
    title: quiz.title,
    weekNumber: quiz.weekNumber,
    cohort: quiz.cohort,
    status: quiz.status,
    createdAt: quiz.createdAt,
    openedAt: quiz.openedAt,
    closedAt: quiz.closedAt,
    responseCount: responses.length,
    releasedQuestionIds: releases.map((release) => release.questionId),
    questions: (quiz.questions || []).map((question) => ({
      ...question,
      isReleased: Boolean(releaseLookup[normalizeQuestionId(question.questionId)]),
      releasedTextResponseIds: textReleaseLookup[normalizeQuestionId(question.questionId)] || [],
      textResponseQueue: textQueueLookup[normalizeQuestionId(question.questionId)] || [],
      releasedTextResponses: (textQueueLookup[normalizeQuestionId(question.questionId)] || []).filter((entry) => entry.isReleased),
      aggregate: aggregateLookup[normalizeQuestionId(question.questionId)] || emptyAggregateForQuestion(quiz, question),
    })),
  };
}

function structuralQuizFingerprint(quiz) {
  return JSON.stringify({
    weekNumber: quiz.weekNumber,
    cohort: quiz.cohort,
    questions: quiz.questions,
  });
}

async function allocateRecoveryCode(redis) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const recoveryCode = createRecoveryCode();
    const existingKeyword = await redis.get(studentRecoveryKey(recoveryCode));

    if (!existingKeyword) {
      return recoveryCode;
    }
  }

  throw new Error('Unable to generate a unique recovery code.');
}

export async function getStudent(keyword) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return null;
  return getJson(studentKey(normalized));
}

export async function identifyStudent({ keyword, cohort, displayName }) {
  const keywordCheck = validateKeyword(keyword);
  if (keywordCheck.error) {
    return keywordCheck;
  }

  const normalizedKeyword = keywordCheck.value;
  const normalizedCohort = String(cohort || '').trim().toLowerCase() || undefined;
  const displayNameValue = String(displayName || '').trim() || null;
  const now = new Date().toISOString();
  const existingStudent = await getStudent(normalizedKeyword);
  const redis = await getRedisClient();

  if (!existingStudent && !STUDENT_COHORTS.includes(normalizedCohort || '')) {
    return { error: 'Please choose your workshop cohort the first time you use this keyword.' };
  }

  const recoveryCode = existingStudent?.recoveryCode || await allocateRecoveryCode(redis);

  const student = existingStudent
    ? {
        ...existingStudent,
        displayName: displayNameValue || existingStudent.displayName || null,
        cohort: STUDENT_COHORTS.includes(normalizedCohort || '') ? normalizedCohort : existingStudent.cohort,
        recoveryCode,
        lastSeenAt: now,
      }
    : {
        keyword: normalizedKeyword,
        displayName: displayNameValue,
        cohort: normalizedCohort,
        recoveryCode,
        createdAt: now,
        lastSeenAt: now,
      };

  await redis
    .multi()
    .set(studentKey(normalizedKeyword), JSON.stringify(student))
    .set(studentRecoveryKey(recoveryCode), normalizedKeyword)
    .exec();

  return { value: student };
}

export async function recoverStudent(recoveryCode) {
  const recoveryCheck = validateRecoveryCode(recoveryCode);
  if (recoveryCheck.error) {
    return recoveryCheck;
  }

  const redis = await getRedisClient();
  const normalizedRecoveryCode = normalizeRecoveryCode(recoveryCheck.value);
  const keyword = await redis.get(studentRecoveryKey(normalizedRecoveryCode));

  if (!keyword) {
    return { error: 'Recovery code not found. Check the code and try again.' };
  }

  const student = await getStudent(keyword);
  if (!student) {
    return { error: 'Recovery code not found. Check the code and try again.' };
  }

  if (student.recoveryCode !== normalizedRecoveryCode) {
    const nextStudent = {
      ...student,
      recoveryCode: normalizedRecoveryCode,
    };

    await redis.set(studentKey(keyword), JSON.stringify(nextStudent));
    return { value: nextStudent };
  }

  return { value: student };
}

export async function listQuizzes() {
  return sortQuizzes(await loadRecords('quiz:*'));
}

export async function listStudents() {
  return sortStudents(await loadRecords('student:*'));
}

export async function listSpineQuestionIds({ excludeQuizId } = {}) {
  const quizzes = await listQuizzes();
  const spineIds = quizzes
    .filter((quiz) => quiz.quizId !== excludeQuizId)
    .flatMap((quiz) => (quiz.questions || []).filter((question) => question.isSpine).map((question) => question.questionId));

  return [...new Set(spineIds)];
}

export async function getQuiz(quizId) {
  return getJson(quizKey(quizId));
}

export async function listQuizResponses(quizId) {
  return sortResponses(await loadRecords(`response:${quizId}:*`));
}

export async function getQuizResponse(quizId, keyword) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return null;
  return getJson(responseKey(quizId, normalized));
}

export async function listStudentResponses(keyword) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) {
    return [];
  }

  return sortResponses(await loadRecords(`response:*:${normalized}`));
}

export async function listAllResponses() {
  return sortResponses(await loadRecords('response:*:*'));
}

export async function listQuizReleases(quizId) {
  return loadRecords(`release:${quizId}:*`);
}

export async function listQuizTextReleases(quizId) {
  return loadRecords(`text-release:${quizId}:*`);
}

export async function listQuizAggregates(quizId) {
  return loadRecords(`aggregate:${quizId}:*`);
}

export async function listOpenQuizzesForStudent(student) {
  const quizzes = await listQuizzes();

  return quizzes
    .filter((quiz) => quiz.status === 'open' && cohortMatchesQuiz(student?.cohort, quiz.cohort))
    .sort((left, right) => new Date(right.openedAt || 0).getTime() - new Date(left.openedAt || 0).getTime())
    .map((quiz) => ({
      quizId: quiz.quizId,
      title: quiz.title,
      weekNumber: quiz.weekNumber,
      cohort: quiz.cohort,
      status: quiz.status,
      questionCount: quiz.questions?.length || 0,
      openedAt: quiz.openedAt,
    }));
}

export async function saveQuizDefinition({ quizId, payload }) {
  const existingQuiz = quizId ? await getQuiz(quizId) : null;

  if (quizId && !existingQuiz) {
    return { error: 'Quiz not found.' };
  }

  const validation = validateQuizDefinition(payload, {
    existingSpineQuestionIds: await listSpineQuestionIds({ excludeQuizId: quizId }),
    allowedSpineQuestionIds: existingQuiz
      ? (existingQuiz.questions || []).filter((question) => question.isSpine).map((question) => question.questionId)
      : [],
  });

  if (validation.error) {
    return validation;
  }

  const responses = existingQuiz ? await listQuizResponses(existingQuiz.quizId) : [];
  if (existingQuiz && responses.length > 0) {
    const nextFingerprint = structuralQuizFingerprint(validation.value);
    const currentFingerprint = structuralQuizFingerprint(existingQuiz);

    if (nextFingerprint !== currentFingerprint) {
      return {
        error: 'This quiz already has responses, so its cohort and question structure are locked. Create a new quiz for structural changes.',
      };
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const record = {
    quizId: existingQuiz?.quizId || createQuizId({ title: validation.value.title, weekNumber: validation.value.weekNumber, now }),
    ...validation.value,
    status: existingQuiz?.status || 'draft',
    createdAt: existingQuiz?.createdAt || nowIso,
    openedAt: existingQuiz?.openedAt ?? null,
    closedAt: existingQuiz?.closedAt ?? null,
  };

  await setJson(quizKey(record.quizId), record);
  await publishLiveUpdate({
    quizId: record.quizId,
    visibility: 'admin',
    reason: existingQuiz ? 'quiz-updated' : 'quiz-created',
  });
  return { value: record };
}

export async function setQuizStatus(quizId, status) {
  if (!QUIZ_STATUSES.includes(status)) {
    return { error: 'Invalid quiz status.' };
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return { error: 'Quiz not found.' };
  }

  const now = new Date().toISOString();
  const nextQuiz = {
    ...quiz,
    status,
    openedAt: status === 'open' ? quiz.openedAt || now : quiz.openedAt,
    closedAt: status === 'closed' ? now : status === 'draft' ? null : quiz.closedAt,
  };

  await setJson(quizKey(quizId), nextQuiz);
  await publishLiveUpdate({ quizId, visibility: 'admin', reason: `status-${status}` });
  return { value: nextQuiz };
}

async function replaceAggregates(quizId, aggregates) {
  const redis = await getRedisClient();
  const existingKeys = await scanKeys(`aggregate:${quizId}:*`);
  const multi = redis.multi();

  if (existingKeys.length > 0) {
    multi.del(existingKeys);
  }

  for (const aggregate of aggregates) {
    multi.set(aggregateKey(quizId, aggregate.questionId), JSON.stringify(aggregate));
  }

  await multi.exec();
}

export async function recomputeAggregatesForQuiz(quizId) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return [];
  }

  const redis = await getRedisClient();
  const snapshot = await loadStableAggregateSnapshot({
    getVersion: async () => (await redis.get(aggregateVersionKey(quizId))) || 0,
    loadResponses: async () => listQuizResponses(quizId),
    compute: async (responses) => computeQuizAggregates(quiz, responses),
  });

  const aggregates = Object.values(snapshot.value);
  await replaceAggregates(quizId, aggregates);
  return aggregates;
}

export async function saveQuizResponse({ quizId, keyword, answers }) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return { error: 'Quiz not found.' };
  }

  const keywordCheck = validateKeyword(keyword);
  if (keywordCheck.error) {
    return keywordCheck;
  }

  const normalizedKeyword = keywordCheck.value;
  const student = await getStudent(normalizedKeyword);
  if (!student) {
    return { error: 'Identify yourself on /quiz before submitting an answer.' };
  }

  if (!cohortMatchesQuiz(student.cohort, quiz.cohort)) {
    return { error: 'This quiz is not open for your saved cohort.' };
  }

  const answerCheck = validateQuizResponseSubmission(quiz, answers);
  if (answerCheck.error) {
    return answerCheck;
  }

  const now = new Date().toISOString();
  const existingResponse = await getQuizResponse(quizId, normalizedKeyword);
  const response = buildStoredResponse({
    quiz,
    student,
    keyword: normalizedKeyword,
    answers: answerCheck.value,
    existingResponse,
    submittedAt: now,
  });

  const redis = await getRedisClient();
  await redis
    .multi()
    .set(responseKey(quizId, normalizedKeyword), JSON.stringify(response))
    .set(studentKey(normalizedKeyword), JSON.stringify({ ...student, lastSeenAt: now }))
    .incr(aggregateVersionKey(quizId))
    .exec();

  const aggregates = await recomputeAggregatesForQuiz(quizId);
  const storedResponse = {
    ...response,
    aggregateSnapshots: buildResponseAggregateSnapshots(response, aggregates),
  };

  await redis.set(responseKey(quizId, normalizedKeyword), JSON.stringify(storedResponse));
  await publishLiveUpdate({ quizId, visibility: 'both', reason: 'response-saved' });
  return { value: storedResponse };
}

export async function setQuestionRelease(quizId, questionId, released) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return { error: 'Quiz not found.' };
  }

  const normalizedQuestionId = normalizeQuestionId(questionId);
  const question = (quiz.questions || []).find((entry) => entry.questionId === normalizedQuestionId);
  const questionExists = Boolean(question);

  if (!questionExists) {
    return { error: 'Question not found for this quiz.' };
  }

  if (question.type === 'free_text') {
    return { error: 'Free-text questions are projector-only. Release individual text responses instead.' };
  }

  const redis = await getRedisClient();
  if (!released) {
    await redis.del(releaseKey(quizId, normalizedQuestionId));
    await publishLiveUpdate({
      quizId,
      visibility: 'both',
      reason: 'question-hidden',
      questionId: normalizedQuestionId,
    });
    return { value: null };
  }

  const release = {
    quizId,
    questionId: normalizedQuestionId,
    releasedAt: new Date().toISOString(),
  };

  await redis.set(releaseKey(quizId, normalizedQuestionId), JSON.stringify(release));
  await publishLiveUpdate({
    quizId,
    visibility: 'both',
    reason: 'question-released',
    questionId: normalizedQuestionId,
  });
  return { value: release };
}

async function validateTextReleaseTargets(quizId, questionId, responseIds) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return { error: 'Quiz not found.' };
  }

  const normalizedQuestionId = normalizeQuestionId(questionId);
  const question = (quiz.questions || []).find((entry) => entry.questionId === normalizedQuestionId);
  if (!question) {
    return { error: 'Question not found for this quiz.' };
  }

  if (question.type !== 'free_text') {
    return { error: 'Text moderation is only available for free-text questions.' };
  }

  const normalizedResponseIds = [...new Set((responseIds || []).map((value) => String(value || '').trim()).filter(Boolean))];
  if (normalizedResponseIds.length === 0) {
    return { error: 'Choose at least one response to update.' };
  }

  const prefix = `${quizId}:`;
  const responseRecords = [];

  for (const responseId of normalizedResponseIds) {
    if (!responseId.startsWith(prefix)) {
      return { error: 'Response not found for this quiz.' };
    }

    const responseKeyword = responseId.slice(prefix.length);
    const response = await getQuizResponse(quizId, responseKeyword);
    if (!response) {
      return { error: 'Response not found for this quiz.' };
    }

    const hasQuestionAnswer = (response.answers || []).some((answer) => normalizeQuestionId(answer.questionId) === normalizedQuestionId);
    if (!hasQuestionAnswer) {
      return { error: 'This response does not answer that free-text question.' };
    }

    responseRecords.push({ responseId, response });
  }

  return {
    value: {
      normalizedQuestionId,
      responseRecords,
    },
  };
}

export async function setTextResponseReleases(quizId, questionId, responseIds, released) {
  const validation = await validateTextReleaseTargets(quizId, questionId, responseIds);
  if (validation.error) {
    return validation;
  }

  const { normalizedQuestionId, responseRecords } = validation.value;
  const redis = await getRedisClient();
  const multi = redis.multi();

  if (!released) {
    for (const record of responseRecords) {
      multi.del(textReleaseKey(quizId, normalizedQuestionId, record.responseId));
    }

    await multi.exec();
    await publishLiveUpdate({
      quizId,
      visibility: 'admin',
      reason: 'text-hidden',
      questionId: normalizedQuestionId,
    });
    return { value: null, count: responseRecords.length };
  }

  const releases = responseRecords.map((record) => ({
    quizId,
    questionId: normalizedQuestionId,
    responseId: record.responseId,
    releasedAt: new Date().toISOString(),
  }));

  for (const record of releases) {
    multi.set(textReleaseKey(quizId, normalizedQuestionId, record.responseId), JSON.stringify(record));
  }

  await multi.exec();
  await publishLiveUpdate({
    quizId,
    visibility: 'admin',
    reason: 'text-released',
    questionId: normalizedQuestionId,
  });
  return { value: releases, count: releases.length };
}

export async function setTextResponseRelease(quizId, questionId, responseId, released) {
  const result = await setTextResponseReleases(quizId, questionId, [responseId], released);
  if (result.error) {
    return result;
  }

  return {
    value: Array.isArray(result.value) ? result.value[0] || null : result.value,
    count: result.count,
  };
}

export async function getQuizAggregatesForAdmin(quizId) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return null;
  }

  const [aggregates, releases, textReleases, responses] = await Promise.all([
    listQuizAggregates(quizId),
    listQuizReleases(quizId),
    listQuizTextReleases(quizId),
    listQuizResponses(quizId),
  ]);

  return hydrateQuizPayload(quiz, aggregates, releases, textReleases, responses);
}

export async function getReleasedAggregatesForStudents(quizId) {
  const quiz = await getQuiz(quizId);
  if (!quiz) {
    return null;
  }

  const [aggregates, releases, textReleases, responses] = await Promise.all([
    listQuizAggregates(quizId),
    listQuizReleases(quizId),
    listQuizTextReleases(quizId),
    listQuizResponses(quizId),
  ]);

  const payload = hydrateQuizPayload(quiz, aggregates, releases, textReleases, responses);
  return {
    ...payload,
    questions: payload.questions.filter((question) => question.isReleased && question.type !== 'free_text'),
  };
}

export async function listQuizzesWithStats() {
  const quizzes = await listQuizzes();

  const enriched = await Promise.all(
    quizzes.map(async (quiz) => {
      const [responses, releases] = await Promise.all([
        listQuizResponses(quiz.quizId),
        listQuizReleases(quiz.quizId),
      ]);

      return {
        ...quiz,
        responseCount: responses.length,
        releaseCount: releases.length,
      };
    }),
  );

  return sortQuizzes(enriched);
}

export async function getStudentTrajectory(keyword) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) {
    return null;
  }

  const [student, quizzes, responses] = await Promise.all([
    getStudent(normalized),
    listQuizzes(),
    listStudentResponses(normalized),
  ]);

  if (!student) {
    return null;
  }

  const quizIds = [...new Set(responses.map((response) => response.quizId))];
  const aggregatesByQuizEntries = await Promise.all(
    quizIds.map(async (quizId) => [quizId, await listQuizAggregates(quizId)]),
  );

  const aggregatesByQuiz = Object.fromEntries(aggregatesByQuizEntries);
  return buildTrajectorySnapshot({ student, quizzes, responses, aggregatesByQuiz });
}

export async function listStudentsWithStats() {
  const [students, responses, quizzes] = await Promise.all([listStudents(), listAllResponses(), listQuizzes()]);
  const responsesByKeyword = groupBy(responses, (response) => response.keyword);
  const questionLookup = buildQuestionLookup(quizzes);

  return sortStudents([...students]).map((student) => {
    const studentResponses = responsesByKeyword[student.keyword] || [];
    const freeTextCount = studentResponses.reduce((count, response) => {
      const quizQuestions = questionLookup[response.quizId] || {};
      return count + (response.answers || []).filter((answer) => {
        const question = quizQuestions[normalizeQuestionId(answer.questionId)];
        return question?.type === 'free_text' && String(answer.value || '').trim();
      }).length;
    }, 0);

    return {
      ...student,
      responseCount: studentResponses.length,
      lastSubmittedAt: studentResponses[studentResponses.length - 1]?.submittedAt || null,
      freeTextCount,
    };
  });
}

export async function getResponsesExportData() {
  const [students, quizzes, responses] = await Promise.all([
    listStudents(),
    listQuizzes(),
    listAllResponses(),
  ]);

  return buildResponsesExportRows({ students, quizzes, responses });
}

export async function getTrajectoryExportData() {
  const [students, quizzes, responses] = await Promise.all([
    listStudents(),
    listQuizzes(),
    listAllResponses(),
  ]);

  return buildTrajectoryExportTable({ students, quizzes, responses });
}