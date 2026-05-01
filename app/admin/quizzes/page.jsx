'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLoginCard from '../../../components/admin/admin-login-card';
import useAdminPassword from '../../../components/admin/use-admin-password';

function statusTone(status) {
  if (status === 'open') return 'quiz-pill-blue';
  if (status === 'closed') return 'quiz-pill-sand';
  return 'quiz-pill-lavender';
}

export default function AdminQuizzesPage() {
  const admin = useAdminPassword();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin.authenticated) return;

    let ignore = false;

    async function loadQuizzes() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/quizzes', {
          headers: admin.getAdminHeaders(),
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load quizzes.');
        }
        if (!ignore) {
          setQuizzes(data.quizzes || []);
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

    void loadQuizzes();
    return () => {
      ignore = true;
    };
  }, [admin.authenticated, admin.getAdminHeaders]);

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
        title="Live quiz admin"
        subtitle="Author quizzes, open them during workshops, and control what students can see."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Lecturer layer</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>Quiz control room</h1>
          <p className="quiz-subtitle">Phase 1 ships authoring, live polling, manual releases, and projector-friendly distributions.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Assignment 2 dashboard</Link>
          <Link href="/admin/students" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Students</Link>
          <Link href="/admin/export" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Exports</Link>
          <Link href="/admin/quizzes/new" className="au-btn-primary" style={{ textDecoration: 'none' }}>Create quiz</Link>
          <button type="button" className="au-btn-secondary" onClick={admin.logout}>Sign out</button>
        </div>
      </div>

      <div className="quiz-note" style={{ marginBottom: '1rem' }}>
        Trajectory export, student drill-down, and cohort split views land in later phases. This screen is the operational surface for Week 9.
      </div>

      {loading && <div className="quiz-empty-state">Loading quizzes...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12' }}>{error}</div>}

      {!loading && quizzes.length === 0 && (
        <div className="quiz-panel" style={{ padding: '1.35rem' }}>
          <div className="quiz-empty-state">No quizzes yet. Create one to start the live workshop flow.</div>
        </div>
      )}

      <div className="quiz-grid quiz-grid-2">
        {quizzes.map((quiz) => (
          <div key={quiz.quizId} className="quiz-panel quiz-panel-soft" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '0.8rem' }}>
              <div>
                <div className="quiz-pill-row" style={{ marginBottom: '0.55rem' }}>
                  <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
                  <span className="quiz-pill quiz-pill-sand">Week {quiz.weekNumber}</span>
                  <span className="quiz-pill quiz-pill-navy">{quiz.cohort}</span>
                </div>
                <h2 className="quiz-question-title" style={{ fontSize: '1.35rem' }}>{quiz.title}</h2>
              </div>
            </div>
            <div className="quiz-stat-row" style={{ marginTop: 0 }}>
              <span className="quiz-stat-chip">Responses: {quiz.responseCount}</span>
              <span className="quiz-stat-chip">Released: {quiz.releaseCount}</span>
              <span className="quiz-stat-chip">Questions: {quiz.questions?.length || 0}</span>
            </div>
            <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
              <Link href={`/admin/quizzes/${quiz.quizId}`} className="au-btn-secondary" style={{ textDecoration: 'none' }}>Edit quiz</Link>
              <Link href={`/admin/quizzes/${quiz.quizId}/live`} className="au-btn-primary" style={{ textDecoration: 'none' }}>Project live view</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}