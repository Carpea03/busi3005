'use client';

import Link from 'next/link';
import { useState } from 'react';
import AggregateCard from '../../../../components/quiz/aggregate-card';
import useLiveQuizStream from '../../../../components/quiz/use-live-quiz-stream';

function connectionLabel(streamStatus) {
  if (streamStatus === 'live') {
    return 'Live results connected';
  }

  if (streamStatus === 'polling') {
    return 'Fallback refresh mode';
  }

  if (streamStatus === 'reconnecting') {
    return 'Reconnecting live results';
  }

  if (streamStatus === 'connecting') {
    return 'Connecting live results';
  }

  return 'Live results idle';
}

export default function QuizDonePage({ params }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const streamStatus = useLiveQuizStream({
    enabled: true,
    url: `/api/quiz/${params.quizId}/events`,
    fallbackIntervalMs: 12000,
    load: async ({ silent } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const response = await fetch(`/api/quiz/${params.quizId}/aggregate`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load released results.');
        }

        setPayload(data);
        setError('');
      } catch (aggregateError) {
        setError(aggregateError.message);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
  });

  return (
    <div className="quiz-shell">
      <div className="quiz-hero">
        <p className="quiz-kicker">Submission received</p>
        <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>
          Thanks. Your answers are saved.
        </h1>
        <p className="quiz-subtitle">
          Released room distributions appear here as Alex chooses to share them. This page now listens for live release updates instead of waiting for the next timer refresh.
        </p>
      </div>

      <div className="quiz-button-row" style={{ marginBottom: '1rem' }}>
        <Link href="/quiz" className="au-btn-secondary" style={{ textDecoration: 'none' }}>
          Return to quiz home
        </Link>
        <Link href="/quiz/me" style={{ color: '#1449FF', fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
          My trajectory
        </Link>
        <span className={`quiz-pill ${streamStatus === 'live' ? 'quiz-pill-blue' : 'quiz-pill-lavender'}`}>{connectionLabel(streamStatus)}</span>
      </div>

      {loading && <div className="quiz-empty-state">Loading released results...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12' }}>{error}</div>}

      {!loading && payload && payload.questions.length === 0 && (
        <div className="quiz-panel" style={{ padding: '1.35rem' }}>
          <div className="quiz-empty-state">
            Nothing has been released to students yet. Keep this page open and new releases will appear automatically.
          </div>
        </div>
      )}

      {!loading && payload && payload.questions.length > 0 && (
        <div className="quiz-summary-grid">
          {payload.questions.map((question) => (
            <AggregateCard key={question.questionId} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}