'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { STUDENT_IDENTITY_STORAGE_KEY } from '../../lib/quiz-core';

const COHORT_OPTIONS = [
  { value: 'wednesday', label: 'Wednesday workshop' },
  { value: 'friday', label: 'Friday workshop' },
  { value: 'unspecified', label: 'Unspecified for now' },
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
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (parsed?.keyword) {
        setKeyword(parsed.keyword);
        setCohort(parsed.cohort || '');
        setStudent(parsed);
        void loadOpenQuizzes(parsed.keyword);
      }
    } catch {
      localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
    }
  }, []);

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
  }

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero">
        <p className="quiz-kicker">Live workshop quiz</p>
        <h1 className="quiz-title">Use one keyword every week.</h1>
        <p className="quiz-subtitle">
          Your keyword is your identity. Choose something only you would pick. There&apos;s no password: anyone who knows your keyword can answer as you, so save the recovery code shown below somewhere private.
        </p>
      </div>

      <div className="quiz-grid">
        <div className="quiz-panel" style={{ padding: '1.4rem' }}>
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

            {(needsCohort || !student) && (
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
              </div>
            )}

            {error && <p className="quiz-error">{error}</p>}

            <div className="quiz-button-row">
              <button type="submit" className="au-btn-primary" disabled={loading || !keyword.trim()}>
                {loading ? 'Checking...' : student ? 'Continue' : 'Save keyword'}
              </button>
              {student && (
                <button type="button" className="au-btn-secondary" onClick={handleSignOut}>
                  This is not my device
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="quiz-panel quiz-panel-soft" style={{ padding: '1.35rem' }}>
          <h2 className="quiz-question-title" style={{ fontSize: '1.45rem' }}>Recover or confirm this identity</h2>
          <p className="quiz-subtitle" style={{ marginTop: '0.55rem', fontSize: '0.95rem' }}>
            Keep your recovery code private. Anyone with it can reclaim your saved quiz keyword on a new device.
          </p>

          <form className="quiz-stack" style={{ marginTop: '1rem' }} onSubmit={handleRecover}>
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
              <p className="quiz-inline-note">Enter this to recover your keyword if this device is lost or cleared.</p>
            </div>

            <div className="quiz-button-row">
              <button type="submit" className="au-btn-secondary" disabled={recovering || !recoveryCode.trim()}>
                {recovering ? 'Recovering...' : 'Recover with code'}
              </button>
            </div>
          </form>

          <div className="quiz-note" style={{ marginTop: '1rem' }}>
            Use the same keyword every workshop so your answers stay connected over time.
          </div>
          {student && (
            <div className="quiz-stack" style={{ marginTop: '1rem' }}>
              <div className="quiz-pill-row">
                <span className="quiz-pill quiz-pill-navy">Signed in as {student.keyword}</span>
                <span className="quiz-pill quiz-pill-blue">{student.cohort || 'unspecified'}</span>
              </div>
              <div className="quiz-note">
                Recovery code: <strong>{student.recoveryCode}</strong>
                <div className="quiz-inline-note">Save this privately. It is the only self-serve way to reclaim this identity.</div>
              </div>
            </div>
          )}
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <Link href="/quiz/me" style={{ color: '#1449FF', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
              My trajectory
            </Link>
          </div>
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
        <OpenQuizList quizzes={quizzes} />
      </div>
    </div>
  );
}