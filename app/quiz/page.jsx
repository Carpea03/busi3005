'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { STUDENT_IDENTITY_STORAGE_KEY, STUDENT_ONBOARDED_STORAGE_KEY } from '../../lib/quiz-core';

const COHORT_OPTIONS = [
  { value: 'wednesday', label: 'Wednesday workshop' },
  { value: 'friday', label: 'Friday workshop' },
  { value: 'unspecified', label: 'Unspecified for now' },
];

const ONBOARDING_STEPS = [
  {
    kicker: 'Step 1 of 3',
    title: 'Live workshop quizzes.',
    body: 'Each week during your BUSI3005 workshop you will answer a short set of questions. Your answers stay connected across the semester so you can see how your own thinking changes — and so Alex can compare the room week to week.',
  },
  {
    kicker: 'Step 2 of 3',
    title: 'Pick one keyword and use it every week.',
    body: 'Your keyword is your identity. There is no password. Anyone who knows your keyword can answer as you, so pick something only you would choose. 4–24 characters, lowercase letters, numbers, hyphens, and underscores only.',
  },
  {
    kicker: 'Step 3 of 3',
    title: 'You will get a recovery code. Keep it private.',
    body: 'After you save your keyword you will see a recovery code. It is the only self-serve way to reclaim your keyword on a new device or after clearing your browser. Save it somewhere private — anyone with the code can take over your keyword.',
  },
];

function OpenQuizList({ quizzes }) {
  if (quizzes.length === 0) {
    return (
      <div className="quiz-panel" style={{ padding: '1.25rem' }}>
        <div className="quiz-empty-state">
          No quiz is open right now. Alex will open one here during the workshop.
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-grid">
      {quizzes.map((quiz) => (
        <div key={quiz.quizId} className="quiz-panel quiz-panel-soft" style={{ padding: '1.25rem' }}>
          <div className="quiz-pill-row" style={{ marginBottom: '0.8rem' }}>
            <span className="quiz-pill quiz-pill-lavender">Week {quiz.weekNumber}</span>
            <span className="quiz-pill quiz-pill-sand">{quiz.questionCount} questions</span>
          </div>
          <h2 className="quiz-question-title" style={{ fontSize: '1.4rem' }}>{quiz.title}</h2>
          <p className="quiz-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Live during workshop. You can resubmit if you need to correct an answer.
          </p>
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <Link href={`/quiz/${quiz.quizId}`} className="au-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Open quiz
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuizLandingPage() {
  const [view, setView] = useState('loading');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [identifyMode, setIdentifyMode] = useState('keyword');
  const [keyword, setKeyword] = useState('');
  const [cohort, setCohort] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [student, setStudent] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [needsCohort, setNeedsCohort] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [error, setError] = useState('');

  async function loadOpenQuizzes(studentKeyword) {
    setLoadingQuizzes(true);
    setError('');
    try {
      const response = await fetch(`/api/quiz/open?keyword=${encodeURIComponent(studentKeyword)}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load open quizzes.');
      }

      setStudent(data.student);
      setQuizzes(data.quizzes || []);
      localStorage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(data.student));
    } catch (loadError) {
      setQuizzes([]);
      setError(loadError.message);
    } finally {
      setLoadingQuizzes(false);
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STUDENT_IDENTITY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.keyword) {
          setKeyword(parsed.keyword);
          setCohort(parsed.cohort || '');
          setStudent(parsed);
          setView('authenticated');
          void loadOpenQuizzes(parsed.keyword);
          return;
        }
      }
    } catch {
      localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
    }

    const onboarded = localStorage.getItem(STUDENT_ONBOARDED_STORAGE_KEY);
    if (onboarded === '1') {
      setView('identify');
    } else {
      setView('onboarding');
      setOnboardingStep(0);
    }
  }, []);

  function handleAdvanceOnboarding() {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep((step) => step + 1);
      return;
    }
    try {
      localStorage.setItem(STUDENT_ONBOARDED_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors — onboarding still continues for this session
    }
    setView('identify');
  }

  function handleBackOnboarding() {
    setOnboardingStep((step) => Math.max(0, step - 1));
  }

  async function handleIdentify(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, ...(cohort ? { cohort } : {}) }),
      });
      const data = await response.json();

      if (!response.ok) {
        if ((data.error || '').includes('first time')) {
          setNeedsCohort(true);
        }
        throw new Error(data.error || 'Unable to continue.');
      }

      setNeedsCohort(false);
      setStudent(data.student);
      setKeyword(data.student.keyword);
      setCohort(data.student.cohort || '');
      localStorage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(data.student));
      setView('authenticated');
      await loadOpenQuizzes(data.student.keyword);
    } catch (identifyError) {
      setError(identifyError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(event) {
    event.preventDefault();
    setRecovering(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to recover this quiz identity.');
      }

      setNeedsCohort(false);
      setStudent(data.student);
      setKeyword(data.student.keyword);
      setCohort(data.student.cohort || '');
      setRecoveryCode(data.student.recoveryCode || '');
      localStorage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(data.student));
      setView('authenticated');
      await loadOpenQuizzes(data.student.keyword);
    } catch (recoverError) {
      setError(recoverError.message);
    } finally {
      setRecovering(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
    setKeyword('');
    setCohort('');
    setRecoveryCode('');
    setStudent(null);
    setQuizzes([]);
    setNeedsCohort(false);
    setError('');
    setIdentifyMode('keyword');
    setView('identify');
  }

  function handleSwitchMode(nextMode) {
    setIdentifyMode(nextMode);
    setError('');
  }

  if (view === 'loading') {
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-panel" style={{ padding: '1.5rem' }}>
          <div className="quiz-empty-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (view === 'onboarding') {
    const step = ONBOARDING_STEPS[onboardingStep];
    const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-hero">
          <p className="quiz-kicker">{step.kicker}</p>
          <h1 className="quiz-title">{step.title}</h1>
          <p className="quiz-subtitle">{step.body}</p>
        </div>

        <div className="quiz-panel" style={{ padding: '1.4rem' }}>
          <div className="quiz-pill-row" style={{ marginBottom: '1rem' }}>
            {ONBOARDING_STEPS.map((_, index) => (
              <span
                key={index}
                className={`quiz-pill ${index === onboardingStep ? 'quiz-pill-navy' : 'quiz-pill-sand'}`}
              >
                {index + 1}
              </span>
            ))}
          </div>
          <div className="quiz-button-row">
            <button
              type="button"
              className="au-btn-primary"
              onClick={handleAdvanceOnboarding}
            >
              {isLast ? 'Got it — let’s set my keyword' : 'Next'}
            </button>
            {onboardingStep > 0 && (
              <button type="button" className="au-btn-secondary" onClick={handleBackOnboarding}>
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'identify') {
    const isRecover = identifyMode === 'recover';
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-hero">
          <p className="quiz-kicker">Live workshop quiz</p>
          <h1 className="quiz-title">
            {isRecover ? 'Recover your keyword.' : 'Enter your keyword to continue.'}
          </h1>
          <p className="quiz-subtitle">
            {isRecover
              ? 'Paste the recovery code you saved last time to bring back your keyword on this device.'
              : 'Your keyword is how we connect this week’s answers to your previous ones. Use the same one every workshop.'}
          </p>
        </div>

        <div className="quiz-panel" style={{ padding: '1.4rem' }}>
          <div className="quiz-pill-row" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className={`quiz-pill ${!isRecover ? 'quiz-pill-navy' : 'quiz-pill-sand'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => handleSwitchMode('keyword')}
            >
              New or returning keyword
            </button>
            <button
              type="button"
              className={`quiz-pill ${isRecover ? 'quiz-pill-navy' : 'quiz-pill-sand'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => handleSwitchMode('recover')}
            >
              Recover with code
            </button>
          </div>

          {!isRecover && (
            <form className="quiz-stack" onSubmit={handleIdentify}>
              <div>
                <label className="quiz-question-label" htmlFor="keyword">Your keyword</label>
                <input
                  id="keyword"
                  className="quiz-input"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="e.g. river-fox"
                  autoComplete="off"
                />
                <p className="quiz-inline-note">4-24 characters. Lowercase letters, numbers, hyphens, and underscores only.</p>
              </div>

              <div>
                <label className="quiz-question-label" htmlFor="cohort">Your workshop cohort</label>
                <select
                  id="cohort"
                  className="quiz-select"
                  value={cohort}
                  onChange={(event) => setCohort(event.target.value)}
                >
                  <option value="">Choose your workshop</option>
                  {COHORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {needsCohort && (
                  <p className="quiz-inline-note">First time on this keyword — please pick your workshop so we can group your answers.</p>
                )}
              </div>

              {error && <p className="quiz-error">{error}</p>}

              <div className="quiz-button-row">
                <button type="submit" className="au-btn-primary" disabled={loading || !keyword.trim()}>
                  {loading ? 'Checking...' : 'Save keyword and continue'}
                </button>
              </div>
            </form>
          )}

          {isRecover && (
            <form className="quiz-stack" onSubmit={handleRecover}>
              <div>
                <label className="quiz-question-label" htmlFor="recovery-code">Recovery code</label>
                <input
                  id="recovery-code"
                  className="quiz-input"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  placeholder="e.g. a7k2-m4pq-r8tw"
                  autoComplete="off"
                />
                <p className="quiz-inline-note">Anyone with this code can reclaim your keyword, so keep it private.</p>
              </div>

              {error && <p className="quiz-error">{error}</p>}

              <div className="quiz-button-row">
                <button type="submit" className="au-btn-primary" disabled={recovering || !recoveryCode.trim()}>
                  {recovering ? 'Recovering...' : 'Recover identity'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero">
        <p className="quiz-kicker">Live workshop quiz</p>
        <h1 className="quiz-title">Welcome back, {student?.keyword}.</h1>
        <p className="quiz-subtitle">
          Use the same keyword every workshop so your answers stay connected over time.
        </p>
      </div>

      <div className="quiz-panel quiz-panel-soft" style={{ padding: '1.35rem' }}>
        <div className="quiz-pill-row">
          <span className="quiz-pill quiz-pill-navy">Signed in as {student?.keyword}</span>
          <span className="quiz-pill quiz-pill-blue">{student?.cohort || 'unspecified'}</span>
        </div>
        {student?.recoveryCode && (
          <div className="quiz-note" style={{ marginTop: '1rem' }}>
            Recovery code: <strong>{student.recoveryCode}</strong>
            <div className="quiz-inline-note">Save this privately. It is the only self-serve way to reclaim this identity on a new device.</div>
          </div>
        )}
        <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
          <Link href="/quiz/me" className="au-btn-secondary" style={{ textDecoration: 'none' }}>
            My trajectory
          </Link>
          <button type="button" className="au-btn-secondary" onClick={handleSignOut}>
            This is not my device
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div className="quiz-panel-header" style={{ marginBottom: '0.9rem' }}>
          <div>
            <p className="quiz-kicker" style={{ marginBottom: '0.25rem' }}>Available now</p>
            <h2 className="quiz-question-title" style={{ fontSize: '1.55rem' }}>Open workshop quizzes</h2>
          </div>
          {loadingQuizzes && <span className="quiz-pill quiz-pill-sand">Refreshing...</span>}
        </div>
        {error && <p className="quiz-error" style={{ marginBottom: '0.9rem' }}>{error}</p>}
        <OpenQuizList quizzes={quizzes} />
      </div>
    </div>
  );
}
