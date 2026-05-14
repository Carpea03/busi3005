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

function groupByWeek(quizzes) {
  const byWeek = new Map();
  for (const quiz of quizzes) {
    const week = quiz.weekNumber || 0;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(quiz);
  }
  return [...byWeek.entries()].sort(([a], [b]) => a - b).map(([weekNumber, weekQuizzes]) => ({
    weekNumber,
    quizzes: weekQuizzes.sort((left, right) => String(left.phase).localeCompare(String(right.phase))),
  }));
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
        title="Quiz control room"
        subtitle="Quiz definitions live in lib/quizzes.js. This dashboard controls visibility and shows live aggregates."
      />
    );
  }

  const grouped = groupByWeek(quizzes);

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Lecturer layer</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>Quiz control room</h1>
          <p className="quiz-subtitle">All quizzes are defined in <code>lib/quizzes.js</code>. Use the schedule, or force-open during the workshop.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Course hub</Link>
          <Link href="/admin" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Group formation</Link>
          <Link href="/admin/students" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Students</Link>
          <Link href="/admin/export" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Exports</Link>
          <button type="button" className="au-btn-secondary" onClick={admin.logout}>Sign out</button>
        </div>
      </div>

      {loading && <div className="quiz-empty-state">Loading quizzes...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12' }}>{error}</div>}

      {!loading && grouped.length === 0 && (
        <div className="quiz-panel" style={{ padding: '1.35rem' }}>
          <div className="quiz-empty-state">No quizzes defined. Edit lib/quizzes.js to add them.</div>
        </div>
      )}

      {grouped.map(({ weekNumber, quizzes: weekQuizzes }) => (
        <div key={weekNumber} className="quiz-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 className="quiz-question-title" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            Week {weekNumber}
          </h2>
          <div className="quiz-grid quiz-grid-2">
            {weekQuizzes.map((quiz) => (
              <div key={quiz.quizId} className="quiz-panel quiz-panel-soft" style={{ padding: '1.1rem' }}>
                <div className="quiz-pill-row" style={{ marginBottom: '0.55rem' }}>
                  <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
                  <span className="quiz-pill quiz-pill-sand">{quiz.phase || 'poll'}</span>
                  {quiz.statusOverride && (
                    <span className="quiz-pill quiz-pill-blue">Override</span>
                  )}
                </div>
                <h3 className="quiz-question-title" style={{ fontSize: '1.05rem' }}>{quiz.title}</h3>
                <div className="quiz-stat-row" style={{ marginTop: '0.5rem' }}>
                  <span className="quiz-stat-chip">Responses: {quiz.responseCount}</span>
                  <span className="quiz-stat-chip">Questions: {quiz.questions?.length || 0}</span>
                </div>
                <div className="quiz-button-row" style={{ marginTop: '0.85rem' }}>
                  <Link href={`/admin/quizzes/${quiz.quizId}`} className="au-btn-secondary" style={{ textDecoration: 'none' }}>Status / preview</Link>
                  <Link href={`/admin/quizzes/${quiz.quizId}/live`} className="au-btn-primary" style={{ textDecoration: 'none' }}>Live view</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
