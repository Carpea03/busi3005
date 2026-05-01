'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLoginCard from '../../../../components/admin/admin-login-card';
import useAdminPassword from '../../../../components/admin/use-admin-password';
import QuizEditor from '../../../../components/quiz/quiz-editor';

function statusTone(status) {
  if (status === 'open') return 'quiz-pill-blue';
  if (status === 'closed') return 'quiz-pill-sand';
  return 'quiz-pill-lavender';
}

export default function AdminQuizDetailPage({ params }) {
  const admin = useAdminPassword();
  const [quiz, setQuiz] = useState(null);
  const [existingSpineQuestionIds, setExistingSpineQuestionIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
          setExistingSpineQuestionIds(data.existingSpineQuestionIds || []);
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

  async function handleUpdateQuiz(payload) {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/quizzes/${params.quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...admin.getAdminHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save quiz changes.');
      }

      setQuiz(data.quiz);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

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
        title="Edit live quiz"
        subtitle="Use the existing admin password to manage this workshop quiz."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Quiz detail</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>{quiz?.title || 'Loading quiz...'}</h1>
          <p className="quiz-subtitle">Open and close this quiz live, monitor response count, and keep the question structure stable once answers start arriving.</p>
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
          <span className="quiz-pill quiz-pill-navy">Responses {quiz.responseCount}</span>
          <span className="quiz-pill quiz-pill-lavender">Released {quiz.releasedQuestionIds?.length || 0}</span>
        </div>
      )}

      <div className="quiz-button-row" style={{ marginBottom: '1rem' }}>
        {['draft', 'open', 'closed'].map((status) => (
          <button
            key={status}
            type="button"
            className={quiz?.status === status ? 'au-btn-primary' : 'au-btn-secondary'}
            onClick={() => handleStatusChange(status)}
            disabled={!quiz || statusLoading === status}
          >
            {statusLoading === status ? 'Updating...' : `Set ${status}`}
          </button>
        ))}
      </div>

      {loading && <div className="quiz-empty-state">Loading quiz...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {quiz && (
        <QuizEditor
          initialQuiz={quiz}
          existingSpineQuestionIds={existingSpineQuestionIds}
          onSubmit={handleUpdateQuiz}
          saving={saving}
          error={error}
          locked={quiz.responseCount > 0}
          saveLabel="Save quiz changes"
        />
      )}
    </div>
  );
}