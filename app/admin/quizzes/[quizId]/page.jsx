'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLoginCard from '../../../../components/admin/admin-login-card';
import useAdminPassword from '../../../../components/admin/use-admin-password';

function statusTone(status) {
  if (status === 'open') return 'quiz-pill-blue';
  if (status === 'closed') return 'quiz-pill-sand';
  return 'quiz-pill-lavender';
}

function formatDate(value) {
  if (!value) return 'not scheduled';
  try {
    return new Date(value).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function QuestionPreview({ question, index }) {
  return (
    <div className="quiz-panel quiz-panel-soft" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
      <div className="quiz-pill-row" style={{ marginBottom: '0.5rem' }}>
        <span className="quiz-pill quiz-pill-navy">Q{index + 1}</span>
        <span className="quiz-pill quiz-pill-sand">{question.type}</span>
        {question.isSpine && <span className="quiz-pill quiz-pill-lavender">Spine</span>}
      </div>
      <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{question.prompt}</p>
      {question.helpText && <p className="quiz-subtitle" style={{ fontSize: '0.9rem' }}>{question.helpText}</p>}
      {Array.isArray(question.options) && question.options.length > 0 && (
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
          {question.options.map((option) => (
            <li key={option.value} style={{ fontSize: '0.9rem' }}>{option.label}</li>
          ))}
        </ul>
      )}
      {question.sliderConfig && (
        <p className="quiz-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
          Slider {question.sliderConfig.min}–{question.sliderConfig.max} (step {question.sliderConfig.step})
          {question.sliderConfig.labelMin || question.sliderConfig.labelMax
            ? ` · ${question.sliderConfig.labelMin || ''} → ${question.sliderConfig.labelMax || ''}`
            : ''}
        </p>
      )}
    </div>
  );
}

export default function AdminQuizDetailPage({ params }) {
  const admin = useAdminPassword();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin.authenticated) return;

    let ignore = false;

    async function loadQuiz() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/quizzes/${params.quizId}`, {
          headers: admin.getAdminHeaders(),
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load this quiz.');
        }

        if (!ignore) {
          setQuiz(data.quiz);
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

    void loadQuiz();
    return () => {
      ignore = true;
    };
  }, [admin.authenticated, admin.getAdminHeaders, params.quizId]);

  async function handleStatusChange(nextStatus) {
    setStatusLoading(nextStatus);
    setError('');
    try {
      const response = await fetch(`/api/admin/quiz/${params.quizId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...admin.getAdminHeaders(),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to change quiz status.');
      }

      setQuiz((current) => ({ ...current, ...data.quiz }));
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setStatusLoading('');
    }
  }

  if (admin.verifying && !admin.authenticated) {
    return <div className="quiz-empty-state">Checking admin access...</div>;
  }

  if (!admin.authenticated) {
    return (
      <AdminLoginCard
        password={admin.password}
        setPassword={admin.setPassword}
        onLogin={admin.login}
        authError={admin.authError}
        loading={admin.verifying}
        title="Quiz status control"
        subtitle="Quiz content is defined in code. This page controls when students see each quiz."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Quiz status control</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>{quiz?.title || 'Loading quiz...'}</h1>
          <p className="quiz-subtitle">Quiz wording lives in <code>lib/quizzes.js</code>. Use this page to force-open, force-close, or revert to the scheduled date gate.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to quiz list</Link>
          {quiz && <Link href={`/admin/quizzes/${quiz.quizId}/live`} className="au-btn-primary" style={{ textDecoration: 'none' }}>Open live view</Link>}
        </div>
      </div>

      {quiz && (
        <div className="quiz-pill-row" style={{ marginBottom: '1rem' }}>
          <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
          <span className="quiz-pill quiz-pill-sand">Week {quiz.weekNumber}</span>
          <span className="quiz-pill quiz-pill-navy">{quiz.phase || 'poll'}</span>
          <span className="quiz-pill quiz-pill-lavender">Responses {quiz.responseCount ?? 0}</span>
          {quiz.statusOverride && (
            <span className="quiz-pill quiz-pill-blue">Override: {quiz.statusOverride}</span>
          )}
        </div>
      )}

      {quiz && (
        <div className="quiz-panel quiz-panel-soft" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p className="quiz-subtitle" style={{ marginBottom: '0.4rem' }}>Scheduled window</p>
          <p style={{ marginBottom: '0.2rem' }}>Release: <strong>{formatDate(quiz.releaseAt)}</strong></p>
          <p>Close: <strong>{formatDate(quiz.closeAt)}</strong></p>
        </div>
      )}

      <div className="quiz-button-row" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={quiz?.statusOverride === 'open' ? 'au-btn-primary' : 'au-btn-secondary'}
          onClick={() => handleStatusChange('open')}
          disabled={!quiz || statusLoading === 'open'}
        >
          {statusLoading === 'open' ? 'Opening...' : 'Force open'}
        </button>
        <button
          type="button"
          className={quiz?.statusOverride === 'closed' ? 'au-btn-primary' : 'au-btn-secondary'}
          onClick={() => handleStatusChange('closed')}
          disabled={!quiz || statusLoading === 'closed'}
        >
          {statusLoading === 'closed' ? 'Closing...' : 'Force close'}
        </button>
        <button
          type="button"
          className="au-btn-secondary"
          onClick={() => handleStatusChange('auto')}
          disabled={!quiz || statusLoading === 'auto' || !quiz.statusOverride}
        >
          {statusLoading === 'auto' ? 'Clearing...' : 'Clear override (use schedule)'}
        </button>
      </div>

      {loading && <div className="quiz-empty-state">Loading quiz...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {quiz && (
        <div>
          <h2 className="quiz-question-title" style={{ marginBottom: '0.75rem' }}>Questions (read-only)</h2>
          {(quiz.questions || []).map((question, index) => (
            <QuestionPreview key={question.questionId} question={question} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
