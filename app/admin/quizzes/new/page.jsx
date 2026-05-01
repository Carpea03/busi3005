'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLoginCard from '../../../../components/admin/admin-login-card';
import useAdminPassword from '../../../../components/admin/use-admin-password';
import QuizEditor from '../../../../components/quiz/quiz-editor';

export default function AdminNewQuizPage() {
  const router = useRouter();
  const admin = useAdminPassword();
  const [existingSpineQuestionIds, setExistingSpineQuestionIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin.authenticated) return;

    let ignore = false;

    async function loadContext() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/quizzes', { headers: admin.getAdminHeaders(), cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load quiz context.');
        }
        if (!ignore) {
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

    void loadContext();
    return () => {
      ignore = true;
    };
  }, [admin.authenticated, admin.getAdminHeaders]);

  async function handleCreateQuiz(payload) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...admin.getAdminHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create quiz.');
      }
      router.push(`/admin/quizzes/${data.quiz.quizId}`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
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
        title="Create live quiz"
        subtitle="Use the existing admin password to author a new workshop quiz."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">New quiz</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>Author a workshop quiz</h1>
          <p className="quiz-subtitle">Build questions, mark spine items carefully, then open the quiz when Alex is ready to run it live.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to quiz list</Link>
        </div>
      </div>

      {loading ? (
        <div className="quiz-empty-state">Loading editor...</div>
      ) : (
        <QuizEditor
          initialQuiz={null}
          existingSpineQuestionIds={existingSpineQuestionIds}
          onSubmit={handleCreateQuiz}
          saving={saving}
          error={error}
          saveLabel="Create quiz"
        />
      )}
    </div>
  );
}