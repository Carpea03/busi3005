// Static quiz definitions for BUSI3005 — AI for Business Transformation.
//
// Quiz definitions live here, not in Redis. Redis stores only responses,
// aggregates, status overrides, and student identity. To change quiz content,
// edit this file and redeploy.
//
// Each teaching week produces up to two quizzes: a baseline poll at the start
// of the workshop (spine only) and a reflect poll at the end (spine repeated
// plus 2–3 week-specific questions). Week 4 is an assessment week and runs
// the baseline poll only.

export const SPINE_QUESTION_IDS = [
  'view-placement',
  'career-confidence',
  'ai-dependency',
  'primary-risk',
  'policy-position',
];

const SPINE_QUESTIONS = [
  {
    questionId: 'view-placement',
    type: 'single_select',
    prompt: "Three views about AI's future are widely debated. Which is closest to your current position?",
    helpText: 'No right answer. Choose the option that best matches your gut today.',
    options: [
      {
        value: 'augment',
        label: "View 1 — Augmentation. AI augments humans but won't replace most work. Hallucination is structural; accountable humans remain essential.",
      },
      {
        value: 'automate',
        label: 'View 2 — Automate everything. AI will automate nearly all cognitive work within years. Most jobs become optional.',
      },
      {
        value: 'dead-end',
        label: "View 3 — LLMs are a dead end. Today's AI is sophisticated autocomplete; real intelligence needs a different architecture.",
      },
      {
        value: 'undecided',
        label: 'Undecided — no strong view yet.',
      },
    ],
    isSpine: true,
  },
  {
    questionId: 'career-confidence',
    type: 'likert_5',
    prompt: "How confident are you that the career path you're on will still exist in recognisable form in 2030?",
    helpText: '1 = not at all confident · 5 = very confident',
    options: [
      { value: '1', label: '1 — Not at all confident' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5 — Very confident' },
    ],
    isSpine: true,
  },
  {
    questionId: 'ai-dependency',
    type: 'slider',
    prompt: 'Five years from now, what percentage of your professional thinking and decision-making will involve AI?',
    helpText: 'Drag to your best guess. 0% = none of it, 100% = all of it.',
    sliderConfig: {
      min: 0,
      max: 100,
      step: 5,
      labelMin: '0%',
      labelMax: '100%',
    },
    isSpine: true,
  },
  {
    questionId: 'primary-risk',
    type: 'single_select',
    prompt: 'Of these large-scale risks from AI, which worries you most right now?',
    helpText: 'Pick the one you find most pressing — even if all of them concern you.',
    options: [
      {
        value: 'inequality',
        label: 'Inequality — gains flow narrowly to capital owners and AI-fluent workers.',
      },
      {
        value: 'displacement',
        label: 'Job displacement — meaningful work shrinks; the entry-level pipeline collapses.',
      },
      {
        value: 'enfeeblement',
        label: 'Enfeeblement — humans deskill and lose the judgement they used to have.',
      },
      {
        value: 'energy',
        label: 'Energy & environment — compute demand outpaces grids and climate budgets.',
      },
      {
        value: 'meaning',
        label: 'Meaning crisis — identity and purpose erode when AI does what defined us.',
      },
      {
        value: 'homogenisation',
        label: 'Homogenisation — culture, strategy and creative output converge on the same AI patterns.',
      },
    ],
    isSpine: true,
  },
  {
    questionId: 'policy-position',
    type: 'likert_5',
    prompt: 'Where should governments sit on AI development?',
    helpText: '1 = restrict or slow it · 3 = neutral · 5 = accelerate it',
    options: [
      { value: '1', label: '1 — Restrict / slow it' },
      { value: '2', label: '2' },
      { value: '3', label: '3 — Neutral' },
      { value: '4', label: '4' },
      { value: '5', label: '5 — Accelerate it' },
    ],
    isSpine: true,
  },
];

function spine() {
  return SPINE_QUESTIONS.map((question) => ({ ...question, isSpine: true }));
}

// Week-specific reflect questions. Grounded in the workshop content for that week.
const WEEK_REFLECT_EXTRAS = {
  1: [
    {
      questionId: 'w1-default-workflow',
      type: 'single_select',
      prompt: 'When you next write a business email or document, what will be your default?',
      options: [
        { value: 'self-only', label: 'Draft entirely myself' },
        { value: 'self-then-ai', label: 'Draft myself, refine with AI' },
        { value: 'ai-then-edit', label: 'Prompt AI first, edit the output' },
        { value: 'iterate-rctf', label: 'Iterate with AI through several rounds (RCTF + refine)' },
        { value: 'ai-as-is', label: 'Have AI write it, post mostly as-is' },
      ],
    },
    {
      questionId: 'w1-hallucination-confidence',
      type: 'likert_5',
      prompt: 'How confident are you in spotting an AI hallucination in a business document?',
      helpText: '1 = not at all · 5 = very confident',
      options: [
        { value: '1', label: '1 — Not at all' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very confident' },
      ],
    },
    {
      questionId: 'w1-tool-default',
      type: 'single_select',
      prompt: 'Of the four tools you compared today, which will you reach for first next week?',
      options: [
        { value: 'chatgpt', label: 'ChatGPT' },
        { value: 'claude', label: 'Claude' },
        { value: 'perplexity', label: 'Perplexity' },
        { value: 'copilot', label: 'Copilot' },
        { value: 'switch', label: "I'll keep switching deliberately" },
      ],
    },
  ],
  2: [
    {
      questionId: 'w2-modality-surprise',
      type: 'single_select',
      prompt: "Of today's four modalities, which surprised you most with what it can do for a business?",
      options: [
        { value: 'image', label: 'Image generation' },
        { value: 'video', label: 'Video & AI presenters' },
        { value: 'code', label: 'Code generation' },
        { value: 'data', label: 'Synthetic data' },
      ],
    },
    {
      questionId: 'w2-ship-confidence',
      type: 'likert_5',
      prompt: 'If you had to ship a polished marketing asset to a client tomorrow using only free AI tools, how confident are you that you could?',
      options: [
        { value: '1', label: '1 — Not at all' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very confident' },
      ],
    },
    {
      questionId: 'w2-displacement-first',
      type: 'single_select',
      prompt: 'Which modality is most likely to make a current job role obsolete first?',
      options: [
        { value: 'image', label: 'Image generation (designers, photographers)' },
        { value: 'video', label: 'Video & voice (presenters, voice actors)' },
        { value: 'code', label: 'Code generation (junior developers)' },
        { value: 'data', label: 'Synthetic data (analysts, market researchers)' },
        { value: 'none', label: 'None of them, in any near-term sense' },
      ],
    },
  ],
  3: [
    {
      questionId: 'w3-agent-trust',
      type: 'single_select',
      prompt: 'Where do AI agents currently sit on the trust spectrum for business use?',
      options: [
        { value: 'read-only', label: 'Read-only research, supervised' },
        { value: 'internal-approved', label: 'Internal workflows with human approval points' },
        { value: 'external-monitored', label: 'External-facing actions, monitored' },
        { value: 'not-yet', label: "Don't trust autonomous agents at all yet" },
      ],
    },
    {
      questionId: 'w3-security-confidence',
      type: 'likert_5',
      prompt: 'How confident are you in identifying a security risk (prompt injection, token theft) in an agent setup?',
      options: [
        { value: '1', label: '1 — Not at all' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very confident' },
      ],
    },
    {
      questionId: 'w3-agent-email',
      type: 'single_select',
      prompt: 'Would you let an autonomous agent send emails on your behalf, without per-message approval?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'yes-conditions', label: 'Yes, with conditions' },
        { value: 'no', label: 'No' },
      ],
    },
  ],
  // Week 4: assessment week — baseline poll only, no reflect extras.
  4: [],
  5: [
    {
      questionId: 'w5-case-mirror',
      type: 'single_select',
      prompt: 'Which case mirrors your hustle concept most closely right now?',
      options: [
        { value: 'grammarly', label: 'Grammarly — lean, focused, data-flywheel moat' },
        { value: 'canva', label: 'Canva — broad accessibility, AI layered later' },
        { value: 'humane', label: 'Humane AI Pin — ambitious tech-first, weak validation' },
        { value: 'none', label: 'None of them' },
      ],
    },
    {
      questionId: 'w5-customer-clarity',
      type: 'likert_5',
      prompt: "How honestly can you answer 'who, specifically, will pay for or use this?' about your hustle?",
      helpText: "1 = couldn't · 5 = with a specific name",
      options: [
        { value: '1', label: "1 — Couldn't" },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — With a specific name' },
      ],
    },
    {
      questionId: 'w5-biggest-risk',
      type: 'single_select',
      prompt: "What's your hustle's biggest risk today?",
      options: [
        { value: 'wrapper', label: 'Wrapper trap (no moat)' },
        { value: 'burn', label: "Burn rate (free tools won't cut it)" },
        { value: 'no-validation', label: 'No customer validation' },
        { value: 'scope', label: 'Scope too ambitious for 4 weeks' },
        { value: 'no-concept', label: 'Concept still not chosen' },
      ],
    },
  ],
  6: [
    {
      questionId: 'w6-real-conversations',
      type: 'single_select',
      prompt: 'How many real conversations have you had with potential users of your hustle?',
      options: [
        { value: '0', label: '0' },
        { value: '1-2', label: '1–2' },
        { value: '3-4', label: '3–4' },
        { value: '5-plus', label: '5 or more' },
      ],
    },
    {
      questionId: 'w6-problem-urgency',
      type: 'likert_5',
      prompt: 'How confident are you the problem your hustle solves is urgent enough that someone would pay for or actively use the solution?',
      options: [
        { value: '1', label: '1 — Not confident' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very confident' },
      ],
    },
    {
      questionId: 'w6-ship-blocker',
      type: 'single_select',
      prompt: "If you had to launch your MVAIP this Friday — not next week — what's the one thing missing?",
      options: [
        { value: 'artefact', label: 'The artefact itself' },
        { value: 'customer', label: 'Real customer or user contact' },
        { value: 'value-prop', label: 'Clarity on the value proposition' },
        { value: 'nothing', label: 'Nothing — we could ship Friday' },
      ],
    },
  ],
  7: [
    {
      questionId: 'w7-founder-honesty',
      type: 'likert_5',
      prompt: "Looking at your submitted hustle, how 'founder-honest' was your account versus 'pitch-polished'?",
      helpText: '1 = polished pitch · 5 = founder-honest',
      options: [
        { value: '1', label: '1 — Polished pitch' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Founder-honest' },
      ],
    },
    {
      questionId: 'w7-artefact-gate',
      type: 'single_select',
      prompt: 'Did your hustle pass the artefact gate — something real a person outside the course encountered?',
      options: [
        { value: 'multiple', label: 'Yes, multiple real users' },
        { value: 'one', label: 'Yes, one real user' },
        { value: 'borderline', label: 'Borderline — only my group has used it' },
        { value: 'no', label: "No, didn't make the gate" },
      ],
    },
    {
      questionId: 'w7-ai-contribution',
      type: 'single_select',
      prompt: "What was AI's most useful contribution to your hustle?",
      options: [
        { value: 'ideation', label: 'Initial concept & ideation' },
        { value: 'build', label: 'Building the actual artefact' },
        { value: 'marketing', label: 'Marketing & outreach content' },
        { value: 'research', label: 'Customer research & synthesis' },
        { value: 'noise', label: 'AI was mostly noise; the value was non-AI work' },
      ],
    },
  ],
  8: [
    {
      questionId: 'w8-mirror-consequence',
      type: 'single_select',
      prompt: 'Applying the Mirror Exercise to your own Assignment 2: which unintended consequence is most embedded in your hustle?',
      options: [
        { value: 'inequality', label: 'Inequality' },
        { value: 'displacement', label: 'Job displacement' },
        { value: 'enfeeblement', label: 'Enfeeblement' },
        { value: 'energy', label: 'Energy & environment' },
        { value: 'meaning', label: 'Meaning crisis' },
        { value: 'homogenisation', label: 'Homogenisation' },
        { value: 'none', label: 'None visible' },
      ],
    },
    {
      questionId: 'w8-hardest-view',
      type: 'single_select',
      prompt: 'After the Three Views debate, which view was hardest for you to argue for?',
      options: [
        { value: 'augment', label: 'View 1 — Augmentation' },
        { value: 'automate', label: 'View 2 — Automate everything' },
        { value: 'dead-end', label: 'View 3 — LLMs are a dead end' },
        { value: 'similar', label: 'All similarly hard or easy' },
      ],
    },
    {
      questionId: 'w8-deploy-without-audit',
      type: 'likert_5',
      prompt: 'How likely are you to deploy an AI system in your future work without running an unintended-consequences audit on it?',
      helpText: '1 = would never · 5 = would happily ship without one',
      options: [
        { value: '1', label: '1 — Would never' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Would happily ship without one' },
      ],
    },
  ],
  9: [
    {
      questionId: 'w9-weakest-trust-dim',
      type: 'single_select',
      prompt: 'Of the five trust dimensions, which is weakest in your Assignment 2 hustle?',
      options: [
        { value: 'transparency', label: 'Transparency' },
        { value: 'accountability', label: 'Accountability' },
        { value: 'fairness', label: 'Fairness' },
        { value: 'robustness', label: 'Robustness' },
        { value: 'privacy', label: 'Privacy' },
      ],
    },
    {
      questionId: 'w9-aus-regulatory-bet',
      type: 'single_select',
      prompt: 'Which regulatory direction would you bet on for Australia in the next 3 years?',
      options: [
        { value: 'eu-style', label: 'Move toward EU-style mandatory AI Act' },
        { value: 'principles', label: 'Stay principles-plus-existing-law' },
        { value: 'singapore', label: 'Adopt Singapore-style voluntary certification' },
        { value: 'patchwork', label: 'Sector-by-sector patchwork, no coherent path' },
      ],
    },
    {
      questionId: 'w9-accountability-clarity',
      type: 'likert_5',
      prompt: "If a Robodebt-style failure happened with your hustle, how clearly could you name who's accountable?",
      helpText: '1 = nobody clearly · 5 = a named human is clearly on the hook',
      options: [
        { value: '1', label: '1 — Nobody clearly' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — A named human is on the hook' },
      ],
    },
  ],
  10: [
    {
      questionId: 'w10-hype-detection',
      type: 'likert_5',
      prompt: "If a vendor told you their AI agent could 'fully replace your finance team within 12 months', how confident are you that you could evaluate that claim rigorously?",
      options: [
        { value: '1', label: '1 — Not at all' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very confident' },
      ],
    },
    {
      questionId: 'w10-agent-email-final',
      type: 'single_select',
      prompt: 'Would you authorise an autonomous AI agent to send emails on your behalf, without per-message approval?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'yes-conditions', label: 'Yes, with conditions' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      questionId: 'w10-adaptive-capacity',
      type: 'likert_5',
      prompt: 'If the dominant AI tool you use today were replaced by a fundamentally different paradigm in 2027, how prepared are you to adapt?',
      options: [
        { value: '1', label: '1 — Not prepared' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5 — Very prepared' },
      ],
    },
  ],
};

// Per-week metadata. `releaseAt` and `closeAt` are null until Sem 2 2026 workshop
// times are confirmed — admin can still force-open via the override.
const WEEKS = [
  { weekNumber: 1, title: 'Week 1 — Collaborative Intelligence', hasReflect: true },
  { weekNumber: 2, title: 'Week 2 — Multimodal AI', hasReflect: true },
  { weekNumber: 3, title: 'Week 3 — AI Agents & Automation', hasReflect: true },
  { weekNumber: 4, title: 'Week 4 — Enterprise AI & Staged Case Study', hasReflect: false },
  { weekNumber: 5, title: 'Week 5 — AI in Startups', hasReflect: true },
  { weekNumber: 6, title: 'Week 6 — Pitch Bootcamp & Customer Discovery', hasReflect: true },
  { weekNumber: 7, title: 'Week 7 — Side Hustle Submission & Peer Review', hasReflect: true },
  { weekNumber: 8, title: 'Week 8 — Unintended Consequences', hasReflect: true },
  { weekNumber: 9, title: 'Week 9 — Trust, Transparency & Regulation', hasReflect: true },
  { weekNumber: 10, title: 'Week 10 — Future-Proofing', hasReflect: true },
];

function makeBaselineQuiz(week) {
  return {
    quizId: `week${week.weekNumber}-baseline`,
    title: `${week.title} — Baseline poll`,
    weekNumber: week.weekNumber,
    cohort: 'both',
    phase: 'baseline',
    releaseAt: null,
    closeAt: null,
    questions: spine(),
  };
}

function makeReflectQuiz(week) {
  const extras = (WEEK_REFLECT_EXTRAS[week.weekNumber] || []).map((question) => ({
    ...question,
    isSpine: false,
  }));

  return {
    quizId: `week${week.weekNumber}-reflect`,
    title: `${week.title} — Reflect poll`,
    weekNumber: week.weekNumber,
    cohort: 'both',
    phase: 'reflect',
    releaseAt: null,
    closeAt: null,
    questions: [...spine(), ...extras],
  };
}

export const QUIZZES = WEEKS.flatMap((week) => {
  const result = [makeBaselineQuiz(week)];
  if (week.hasReflect) {
    result.push(makeReflectQuiz(week));
  }
  return result;
});

const QUIZ_BY_ID = new Map(QUIZZES.map((quiz) => [quiz.quizId, quiz]));

export function getAllQuizzes() {
  return QUIZZES.map((quiz) => ({ ...quiz, questions: quiz.questions.map((q) => ({ ...q })) }));
}

export function getQuizDefinition(quizId) {
  const quiz = QUIZ_BY_ID.get(quizId);
  if (!quiz) return null;
  return { ...quiz, questions: quiz.questions.map((q) => ({ ...q })) };
}

export function getSpineQuestionIds() {
  return [...SPINE_QUESTION_IDS];
}

export function getQuizzesForWeek(weekNumber) {
  return QUIZZES.filter((quiz) => quiz.weekNumber === weekNumber).map((quiz) => ({
    ...quiz,
    questions: quiz.questions.map((q) => ({ ...q })),
  }));
}
