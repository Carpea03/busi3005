'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SpineTrajectoryPanels, FreeTextPanels } from '../../../components/quiz/trajectory-panels';
import { STUDENT_IDENTITY_STORAGE_KEY } from '../../../lib/quiz-core';

export default function QuizTrajectoryPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState(null);
  const [trajectory, setTrajectory] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STUDENT_IDENTITY_STORAGE_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed?.keyword) {
        setIdentity(parsed);
      } else {
        setLoading(false);
      }
    } catch {
      localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!identity?.keyword) {
      return;
    }

    let ignore = false;

    async function loadTrajectory() {
      setLoading(true);
      try {
        const response = await fetch(`/api/quiz/me/${encodeURIComponent(identity.keyword)}/trajectory`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load your trajectory.');
        }

        if (!ignore) {
          setTrajectory(data.trajectory);
          setDisplayName(data.trajectory.student.displayName || '');
          setError('');
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadTrajectory();
    return () => {
      ignore = true;
    };
  }, [identity]);

  async function handleSaveDisplayName() {
    if (!identity?.keyword) {
      return;
    }

    setSavingName(true);
    setError('');

    try {
      const response = await fetch('/api/quiz/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: identity.keyword,
          displayName,
          cohort: identity.cohort,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save your display name.');
      }

      const nextIdentity = { ...identity, ...data.student };
      localStorage.setItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(nextIdentity));
      setIdentity(nextIdentity);
      setTrajectory((current) => current ? { ...current, student: data.student } : current);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingName(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
    router.push('/quiz');
  }

  if (!identity && !loading) {
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-panel" style={{ padding: '1.5rem' }}>
          <p className="quiz-kicker">Your trajectory</p>
          <h1 className="quiz-question-title" style={{ fontSize: '1.8rem' }}>Open this from your saved quiz keyword.</h1>
          <p className="quiz-subtitle" style={{ marginTop: '0.65rem' }}>
            We use the keyword saved on this device to show your longitudinal answers. Start at /quiz if this device has not been used before.
          </p>
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <Link href="/quiz" className="au-btn-primary" style={{ textDecoration: 'none' }}>Go to quiz home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Your trajectory</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>How your answers moved over time.</h1>
          <p className="quiz-subtitle">This page trusts the keyword stored on this device. If this is not your device, sign out below. Cohort snapshots are frozen when you submit, so later room changes do not overwrite earlier weeks, and your recovery code below lets you reclaim this identity on a new device.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/quiz" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to quiz home</Link>
          <button type="button" className="au-btn-secondary" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {loading && <div className="quiz-empty-state">Loading your trajectory...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {!loading && trajectory && (
        <div className="quiz-stack">
          <div className="quiz-grid quiz-grid-2">
            <div className="quiz-panel" style={{ padding: '1.25rem' }}>
              <p className="quiz-question-label">Saved identity</p>
              <h2 className="quiz-question-title" style={{ fontSize: '1.35rem' }}>{trajectory.student.keyword}</h2>
              <div className="quiz-stat-row">
                <span className="quiz-stat-chip">Quizzes answered: {trajectory.quizzesAnswered}</span>
                <span className="quiz-stat-chip">Spine questions: {trajectory.spineQuestions.length}</span>
                <span className="quiz-stat-chip">Cohort: {trajectory.student.cohort || 'unspecified'}</span>
              </div>
              {trajectory.student.recoveryCode && (
                <div className="quiz-note" style={{ marginTop: '0.9rem' }}>
                  Recovery code: <strong>{trajectory.student.recoveryCode}</strong>
                  <div className="quiz-inline-note">Save this privately. Anyone with this code can reclaim your keyword.</div>
                </div>
              )}
            </div>

            <div className="quiz-panel" style={{ padding: '1.25rem' }}>
              <label className="quiz-question-label" htmlFor="display-name">Optional display name for your export</label>
              <input
                id="display-name"
                className="quiz-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Add your preferred display name"
              />
              <div className="quiz-button-row" style={{ marginTop: '0.9rem' }}>
                <button type="button" className="au-btn-primary" onClick={handleSaveDisplayName} disabled={savingName}>
                  {savingName ? 'Saving...' : 'Save display name'}
                </button>
              </div>
            </div>
          </div>

          <SpineTrajectoryPanels
            spineQuestions={trajectory.spineQuestions}
            title="Longitudinal spine"
            subtitle="Each card tracks the same spine question across the weeks where it appeared."
            emptyMessage="No spine answers have been recorded for this keyword yet."
          />

          <FreeTextPanels
            freeTextResponses={trajectory.freeTextResponses}
            title="Your free-text answers"
            subtitle="Any written responses you submitted stay attached to your keyword as well."
            emptyMessage="You have not submitted any free-text answers yet."
          />
        </div>
      )}
    </div>
  );
}