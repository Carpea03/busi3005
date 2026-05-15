import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStoredResponse,
  computeEffectiveStatus,
  computeQuizAggregates,
  createRecoveryCode,
  createResponseId,
  createQuizId,
  findNearbyQuestionId,
  getReleasedTextResponses,
  loadStableAggregateSnapshot,
  normalizeRecoveryCode,
  normalizeQuestionId,
  validateRecoveryCode,
  validateKeyword,
  validateQuizDefinition,
  validateQuizResponseSubmission,
} from '../lib/quiz-core.js';

import {
  buildQuizScopedKeyCounts,
  buildResponseAggregateSnapshots,
  buildResponsesExportRows as buildResponsesExportRowsFromStore,
  buildTextResponseQueueByQuestion,
  buildTrajectoryExportTable as buildTrajectoryExportTableFromStore,
  buildTrajectorySnapshot as buildTrajectorySnapshotFromStore,
  parseQuizIdFromScopedKey,
} from '../lib/quiz-store.js';

const sampleQuiz = {
  quizId: 'week-9-sample',
  title: 'Week 9 trial',
  weekNumber: 9,
  cohort: 'both',
  status: 'open',
  questions: [
    {
      questionId: 'spine.career-confidence',
      type: 'single_select',
      prompt: 'How confident do you feel?',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      isSpine: true,
    },
    {
      questionId: 'week9.tools',
      type: 'multi_select',
      prompt: 'Which tools did you use?',
      options: [
        { value: 'claude', label: 'Claude' },
        { value: 'copilot', label: 'Copilot' },
        { value: 'gemini', label: 'Gemini' },
      ],
      isSpine: false,
    },
    {
      questionId: 'week9.certainty',
      type: 'slider',
      prompt: 'How certain are you?',
      sliderConfig: { min: 0, max: 100, step: 1, labelMin: 'Low', labelMax: 'High' },
      isSpine: false,
    },
  ],
};

test('reserved keyword validation cannot be bypassed with case or whitespace', () => {
  const result = validateKeyword('  AdMiN  ');
  assert.equal(result.error, 'That keyword is reserved. Please choose another one.');
});

test('recovery codes normalise and validate consistently', () => {
  assert.equal(normalizeRecoveryCode('  A7K2 M4PQ R8TW  '), 'a7k2-m4pq-r8tw');
  assert.equal(validateRecoveryCode('short').error, 'Recovery codes use three groups of four letters or numbers.');
  assert.match(createRecoveryCode(), /^[23456789abcdefghjkmnpqrstuvwxyz]{4}(?:-[23456789abcdefghjkmnpqrstuvwxyz]{4}){2}$/);
});

test('spine question IDs normalise across case and whitespace while catching typo variants', () => {
  assert.equal(normalizeQuestionId('  Spine.Career-Confidence  '), 'spine.career-confidence');

  const safeDefinition = validateQuizDefinition(
    {
      title: 'Week 10 spine check',
      weekNumber: 10,
      cohort: 'both',
      questions: [
        {
          questionId: '  Spine.Career-Confidence  ',
          type: 'single_select',
          prompt: 'How confident do you feel now?',
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          isSpine: true,
        },
      ],
    },
    { existingSpineQuestionIds: ['spine.career-confidence'] },
  );

  assert.ok(!safeDefinition.error);

  const typoDefinition = validateQuizDefinition(
    {
      title: 'Week 10 typo check',
      weekNumber: 10,
      cohort: 'both',
      questions: [
        {
          questionId: 'spine.career-confidnce',
          type: 'single_select',
          prompt: 'How confident do you feel now?',
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          isSpine: true,
        },
      ],
    },
    { existingSpineQuestionIds: ['spine.career-confidence'] },
  );

  assert.match(typoDefinition.error, /too close to existing spine ID/);
  assert.equal(findNearbyQuestionId('spine.career-confidnce', ['spine.career-confidence']), 'spine.career-confidence');
});

test('closed quizzes reject new submissions cleanly', () => {
  const result = validateQuizResponseSubmission(
    { ...sampleQuiz, status: 'closed' },
    [{ questionId: 'spine.career-confidence', value: 'medium' }],
  );

  assert.equal(result.error, 'This quiz is closed.');
});

test('resubmission payload overwrites cleanly and sets wasResubmitted', () => {
  const answerCheck = validateQuizResponseSubmission(sampleQuiz, [
    { questionId: 'spine.career-confidence', value: 'high' },
    { questionId: 'week9.tools', value: ['claude', 'copilot'] },
    { questionId: 'week9.certainty', value: 72 },
  ]);

  assert.ok(answerCheck.value);

  const stored = buildStoredResponse({
    quiz: sampleQuiz,
    student: { cohort: 'wednesday' },
    keyword: 'river-fox',
    answers: answerCheck.value,
    existingResponse: { submittedAt: '2026-05-01T00:00:00.000Z' },
    submittedAt: '2026-05-01T00:15:00.000Z',
  });

  assert.equal(stored.quizId, 'week-9-sample');
  assert.equal(stored.keyword, 'river-fox');
  assert.equal(stored.responseId, 'week-9-sample:river-fox');
  assert.equal(stored.wasResubmitted, true);
  assert.equal(stored.answers.length, 3);
});

test('aggregate recomputation from the response set matches a naive reducer', () => {
  const responses = [
    {
      quizId: sampleQuiz.quizId,
      keyword: 'red-owl',
      submittedAt: '2026-05-01T09:00:00.000Z',
      answers: [
        { questionId: 'spine.career-confidence', value: 'low' },
        { questionId: 'week9.tools', value: ['claude', 'copilot'] },
        { questionId: 'week9.certainty', value: 20 },
      ],
    },
    {
      quizId: sampleQuiz.quizId,
      keyword: 'blue-finch',
      submittedAt: '2026-05-01T09:01:00.000Z',
      answers: [
        { questionId: 'spine.career-confidence', value: 'medium' },
        { questionId: 'week9.tools', value: ['copilot'] },
        { questionId: 'week9.certainty', value: 60 },
      ],
    },
    {
      quizId: sampleQuiz.quizId,
      keyword: 'green-orca',
      submittedAt: '2026-05-01T09:02:00.000Z',
      answers: [
        { questionId: 'spine.career-confidence', value: 'high' },
        { questionId: 'week9.tools', value: ['claude', 'gemini'] },
        { questionId: 'week9.certainty', value: 90 },
      ],
    },
  ];

  const recomputed = computeQuizAggregates(sampleQuiz, responses);
  const naiveCounts = { low: 0, medium: 0, high: 0 };
  const naiveTools = { claude: 0, copilot: 0, gemini: 0 };
  const sliderValues = [];

  for (const response of responses) {
    for (const answer of response.answers) {
      if (answer.questionId === 'spine.career-confidence') naiveCounts[answer.value] += 1;
      if (answer.questionId === 'week9.tools') {
        for (const value of answer.value) naiveTools[value] += 1;
      }
      if (answer.questionId === 'week9.certainty') sliderValues.push(answer.value);
    }
  }

  assert.deepEqual(recomputed['spine.career-confidence'].distribution.counts, naiveCounts);
  assert.deepEqual(recomputed['week9.tools'].distribution.counts, naiveTools);
  assert.equal(recomputed['week9.tools'].distribution.averageSelections, 1.67);
  assert.equal(recomputed['week9.certainty'].distribution.mean, 56.7);
  assert.equal(recomputed['week9.certainty'].distribution.median, 60);
  assert.equal(recomputed['week9.certainty'].distribution.stddev, 28.7);
  assert.equal(sliderValues.length, recomputed['week9.certainty'].totalResponses);
});

test('stable aggregate snapshots retry when a concurrent write advances the version', async () => {
  const versions = [1, 2, 2, 2];
  const responseSets = [
    [{ keyword: 'first', answers: [] }],
    [{ keyword: 'first', answers: [] }, { keyword: 'second', answers: [] }],
  ];
  let responseIndex = 0;

  const snapshot = await loadStableAggregateSnapshot({
    getVersion: async () => versions.shift(),
    loadResponses: async () => {
      const current = responseSets[Math.min(responseIndex, responseSets.length - 1)];
      responseIndex += 1;
      return current;
    },
    compute: async (responses) => responses.map((response) => response.keyword),
  });

  assert.equal(snapshot.version, 2);
  assert.deepEqual(snapshot.value, ['first', 'second']);
});

test('quiz IDs are generated with week and title context', () => {
  const quizId = createQuizId({
    title: 'Week 9 Trial Quiz',
    weekNumber: 9,
    now: new Date('2026-05-01T00:00:00.000Z'),
    randomSuffix: 'abc12',
  });

  assert.equal(quizId, 'week-9-week-9-trial-quiz-20260501-abc12');
});

test('cohort-split aggregates and free-text moderation candidates are computed for both-cohort quizzes', () => {
  const quiz = {
    quizId: 'week-9-both',
    title: 'Week 9 both',
    weekNumber: 9,
    cohort: 'both',
    questions: [
      {
        questionId: 'spine.career-confidence',
        type: 'single_select',
        prompt: 'How confident do you feel?',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ],
        isSpine: true,
      },
      {
        questionId: 'week9.text',
        type: 'free_text',
        prompt: 'What stood out?',
        freeTextConfig: { minWords: 0, maxWords: 50, placeholder: '' },
        isSpine: false,
      },
    ],
  };
  const responses = [
    {
      quizId: quiz.quizId,
      keyword: 'river-fox',
      responseId: createResponseId(quiz.quizId, 'river-fox'),
      cohort: 'wednesday',
      submittedAt: '2026-05-01T09:00:00.000Z',
      answers: [
        { questionId: 'spine.career-confidence', value: 'low' },
        { questionId: 'week9.text', value: 'Wednesday reflection' },
      ],
    },
    {
      quizId: quiz.quizId,
      keyword: 'blue-finch',
      responseId: createResponseId(quiz.quizId, 'blue-finch'),
      cohort: 'friday',
      submittedAt: '2026-05-01T09:01:00.000Z',
      answers: [
        { questionId: 'spine.career-confidence', value: 'high' },
        { questionId: 'week9.text', value: 'Friday reflection' },
      ],
    },
  ];

  const aggregates = computeQuizAggregates(quiz, responses);
  assert.equal(aggregates['spine.career-confidence'].byCohort.wednesday.distribution.counts.low, 1);
  assert.equal(aggregates['spine.career-confidence'].byCohort.friday.distribution.counts.high, 1);
  assert.equal(aggregates['week9.text'].distribution.recentResponses.length, 2);
  assert.equal(aggregates['week9.text'].byCohort.wednesday.distribution.recentResponses[0].text, 'Wednesday reflection');

  const released = getReleasedTextResponses(aggregates['week9.text'], [createResponseId(quiz.quizId, 'blue-finch')]);
  assert.deepEqual(released.map((entry) => entry.responseId), [createResponseId(quiz.quizId, 'blue-finch')]);
});

test('historical aggregate snapshots stay frozen on the response even when current aggregates move later', () => {
  const quizzes = [
    {
      quizId: 'week-1',
      title: 'Week 1 check-in',
      weekNumber: 1,
      questions: [
        {
          questionId: 'spine.career-confidence',
          type: 'single_select',
          prompt: 'How confident do you feel?',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          isSpine: true,
        },
      ],
    },
  ];
  const response = {
    quizId: 'week-1',
    keyword: 'river-fox',
    submittedAt: '2026-03-01T09:00:00.000Z',
    cohort: 'wednesday',
    answers: [{ questionId: 'spine.career-confidence', value: 'low' }],
  };
  const historicalAggregate = {
    quizId: 'week-1',
    questionId: 'spine.career-confidence',
    totalResponses: 3,
    distribution: { counts: { low: 1, high: 2 } },
    byCohort: {
      wednesday: { totalResponses: 2, distribution: { counts: { low: 1, high: 1 } } },
      friday: { totalResponses: 1, distribution: { counts: { low: 0, high: 1 } } },
      unspecified: { totalResponses: 0, distribution: { counts: { low: 0, high: 0 } } },
    },
    lastUpdatedAt: '2026-03-01T09:00:00.000Z',
  };
  const currentAggregate = {
    quizId: 'week-1',
    questionId: 'spine.career-confidence',
    totalResponses: 99,
    distribution: { counts: { low: 30, high: 69 } },
    lastUpdatedAt: '2026-05-01T09:00:00.000Z',
  };

  const snapshots = buildResponseAggregateSnapshots(response, [historicalAggregate]);
  const trajectory = buildTrajectorySnapshotFromStore({
    student: { keyword: 'river-fox', cohort: 'wednesday' },
    quizzes,
    responses: [{ ...response, aggregateSnapshots: snapshots }],
    aggregatesByQuiz: { 'week-1': [currentAggregate] },
  });

  assert.equal(trajectory.spineQuestions[0].entries[0].aggregate.totalResponses, 3);
  assert.equal(trajectory.spineQuestions[0].entries[0].aggregate.byCohort.wednesday.totalResponses, 2);
});

test('released free-text stays available even after it falls out of the aggregate recent-response window', () => {
  const quiz = {
    quizId: 'week-10-text',
    title: 'Week 10 text',
    weekNumber: 10,
    cohort: 'both',
    questions: [
      {
        questionId: 'week10.reflection',
        type: 'free_text',
        prompt: 'What changed this week?',
        freeTextConfig: { minWords: 0, maxWords: 80, placeholder: '' },
        isSpine: false,
      },
    ],
  };

  const responses = Array.from({ length: 12 }, (_, index) => ({
    quizId: quiz.quizId,
    keyword: `student-${index + 1}`,
    responseId: createResponseId(quiz.quizId, `student-${index + 1}`),
    cohort: index % 2 === 0 ? 'wednesday' : 'friday',
    submittedAt: `2026-05-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
    answers: [
      {
        questionId: 'week10.reflection',
        value: `Reflection ${index + 1}`,
      },
    ],
  }));

  const releasedResponseId = responses[0].responseId;
  const aggregates = computeQuizAggregates(quiz, responses);
  assert.equal(
    aggregates['week10.reflection'].distribution.recentResponses.some((entry) => entry.responseId === releasedResponseId),
    false,
  );

  const queue = buildTextResponseQueueByQuestion({
    quiz,
    responses,
    textReleases: [{ quizId: quiz.quizId, questionId: 'week10.reflection', responseId: releasedResponseId }],
  });

  assert.equal(queue['week10.reflection'].length, 12);
  assert.equal(queue['week10.reflection'].some((entry) => entry.responseId === releasedResponseId && entry.isReleased), true);
});

test('trajectory snapshot groups spine answers across weeks using normalised question IDs', () => {
  const quizzes = [
    {
      quizId: 'week-1',
      title: 'Week 1 check-in',
      weekNumber: 1,
      questions: [
        {
          questionId: 'Spine.Career-Confidence',
          type: 'single_select',
          prompt: 'How confident do you feel?',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          isSpine: true,
        },
      ],
    },
    {
      quizId: 'week-4',
      title: 'Week 4 check-in',
      weekNumber: 4,
      questions: [
        {
          questionId: ' spine.career-confidence ',
          type: 'single_select',
          prompt: 'How confident do you feel now?',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          isSpine: true,
        },
        {
          questionId: 'week4.reflection',
          type: 'free_text',
          prompt: 'What changed this week?',
          isSpine: false,
          freeTextConfig: { minWords: 0, maxWords: 80, placeholder: '' },
        },
      ],
    },
  ];
  const responses = [
    {
      quizId: 'week-1',
      keyword: 'river-fox',
      submittedAt: '2026-03-01T09:00:00.000Z',
      cohort: 'wednesday',
      answers: [{ questionId: 'spine.career-confidence', value: 'low' }],
    },
    {
      quizId: 'week-4',
      keyword: 'river-fox',
      submittedAt: '2026-03-29T09:00:00.000Z',
      cohort: 'friday',
      answers: [
        { questionId: 'SPINE.CAREER-CONFIDENCE', value: 'high' },
        { questionId: 'week4.reflection', value: 'I now understand the trade-offs more clearly.' },
      ],
    },
  ];
  const snapshot = buildTrajectorySnapshotFromStore({
    student: { keyword: 'river-fox', cohort: 'wednesday' },
    quizzes,
    responses,
    aggregatesByQuiz: {},
  });

  assert.equal(snapshot.spineQuestions.length, 1);
  assert.equal(snapshot.spineQuestions[0].questionId, 'spine.career-confidence');
  assert.deepEqual(snapshot.spineQuestions[0].entries.map((entry) => entry.weekNumber), [1, 4]);
  assert.deepEqual(snapshot.spineQuestions[0].entries.map((entry) => entry.answerLabel), ['Low', 'High']);
  assert.equal(snapshot.freeTextResponses.length, 1);
  assert.match(snapshot.freeTextResponses[0].value, /trade-offs/);
});

test('trajectory and response exports produce stable Phase 2 output shapes', () => {
  const quizzes = [
    {
      quizId: 'week-1',
      title: 'Week 1 check-in',
      weekNumber: 1,
      questions: [
        {
          questionId: 'spine.career-confidence',
          type: 'single_select',
          prompt: 'How confident do you feel?',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          isSpine: true,
        },
        {
          questionId: 'week1.tools',
          type: 'multi_select',
          prompt: 'Which tools did you use?',
          options: [
            { value: 'claude', label: 'Claude' },
            { value: 'copilot', label: 'Copilot' },
          ],
          isSpine: false,
        },
      ],
    },
    {
      quizId: 'week-4',
      title: 'Week 4 check-in',
      weekNumber: 4,
      questions: [
        {
          questionId: 'spine.career-confidence',
          type: 'single_select',
          prompt: 'How confident do you feel now?',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'high', label: 'High' },
          ],
          isSpine: true,
        },
      ],
    },
  ];
  const students = [
    { keyword: 'blue-finch', displayName: 'Blue Finch', cohort: 'wednesday' },
    { keyword: 'river-fox', displayName: 'River Fox', cohort: 'friday' },
  ];
  const responses = [
    {
      quizId: 'week-1',
      keyword: 'river-fox',
      submittedAt: '2026-03-01T09:00:00.000Z',
      cohort: 'wednesday',
      answers: [
        { questionId: 'spine.career-confidence', value: 'low' },
        { questionId: 'week1.tools', value: ['claude', 'copilot'] },
      ],
    },
    {
      quizId: 'week-4',
      keyword: 'river-fox',
      submittedAt: '2026-03-29T09:00:00.000Z',
      cohort: 'friday',
      answers: [{ questionId: 'spine.career-confidence', value: 'high' }],
    },
  ];

  const responseRows = buildResponsesExportRowsFromStore({ students, quizzes, responses });
  assert.equal(responseRows.length, 3);
  assert.equal(responseRows[0].value, 'Low');
  assert.equal(responseRows[1].value, 'Claude; Copilot');

  const trajectoryTable = buildTrajectoryExportTableFromStore({ students, quizzes, responses });
  assert.deepEqual(
    trajectoryTable.columns.map((column) => column.key),
    ['spine.career-confidence__week_1', 'spine.career-confidence__week_4'],
  );
  const riverFoxRow = trajectoryTable.rows.find((row) => row.keyword === 'river-fox');
  assert.equal(riverFoxRow['spine.career-confidence__week_1'], 'Low');
  assert.equal(riverFoxRow['spine.career-confidence__week_4'], 'High');
  const blueFinchRow = trajectoryTable.rows.find((row) => row.keyword === 'blue-finch');
  assert.equal(blueFinchRow['spine.career-confidence__week_1'], '');
});

test('quiz-scoped key counting extracts quiz IDs without per-quiz scans', () => {
  assert.equal(parseQuizIdFromScopedKey('response:week1-baseline:river-fox', 'response'), 'week1-baseline');
  assert.equal(parseQuizIdFromScopedKey('release:week2-reflect:spine.career-confidence', 'release'), 'week2-reflect');
  assert.equal(parseQuizIdFromScopedKey('aggregate:week1-baseline:spine.career-confidence', 'response'), null);

  assert.deepEqual(
    buildQuizScopedKeyCounts([
      'response:week1-baseline:river-fox',
      'response:week1-baseline:blue-finch',
      'response:week1-reflect:river-fox',
      'ignore-me',
    ], 'response'),
    {
      'week1-baseline': 2,
      'week1-reflect': 1,
    },
  );
});

test('computeEffectiveStatus — manual override wins regardless of dates', () => {
  const now = new Date('2026-08-03T14:00:00+09:30');
  assert.equal(
    computeEffectiveStatus({ releaseAt: null, closeAt: null, override: 'open', now }),
    'open',
  );
  assert.equal(
    computeEffectiveStatus({
      releaseAt: '2026-08-03T14:00:00+09:30',
      closeAt: '2026-08-03T15:00:00+09:30',
      override: 'closed',
      now,
    }),
    'closed',
  );
});

test('computeEffectiveStatus — null releaseAt with no override stays draft', () => {
  assert.equal(
    computeEffectiveStatus({ releaseAt: null, closeAt: null, override: null, now: new Date() }),
    'draft',
  );
});

test('computeEffectiveStatus — date gate transitions draft → open → closed', () => {
  const releaseAt = '2026-08-03T14:00:00+09:30';
  const closeAt = '2026-08-03T17:00:00+09:30';

  assert.equal(
    computeEffectiveStatus({ releaseAt, closeAt, override: null, now: new Date('2026-08-03T13:00:00+09:30') }),
    'draft',
    'before release window = draft',
  );

  assert.equal(
    computeEffectiveStatus({ releaseAt, closeAt, override: null, now: new Date('2026-08-03T15:00:00+09:30') }),
    'open',
    'inside release window = open',
  );

  assert.equal(
    computeEffectiveStatus({ releaseAt, closeAt, override: null, now: new Date('2026-08-03T18:00:00+09:30') }),
    'closed',
    'after close = closed',
  );
});

test('computeEffectiveStatus — no closeAt keeps open after releaseAt', () => {
  assert.equal(
    computeEffectiveStatus({
      releaseAt: '2026-08-03T14:00:00+09:30',
      closeAt: null,
      override: null,
      now: new Date('2026-12-01T00:00:00Z'),
    }),
    'open',
  );
});

test('computeEffectiveStatus — invalid override value falls through to date gate', () => {
  assert.equal(
    computeEffectiveStatus({
      releaseAt: '2026-08-03T14:00:00+09:30',
      closeAt: null,
      override: 'banana',
      now: new Date('2026-08-04T00:00:00Z'),
    }),
    'open',
  );
});
