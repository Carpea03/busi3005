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
  const [statusBusy, setStatusBusy] = useState({});
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    if (!admin.authenticated) return;

    let ignore = false;

    async function loadQuizzes() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/quizzes', { cache: 'no-store' });
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
  }, [admin.authenticated]);

  async function handleStatusChange(quizId, nextStatus) {
    setStatusBusy((prev) => ({ ...prev, [quizId]: nextStatus }));
    setError('');
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to change quiz status.');
      }
      setQuizzes((current) => current.map((quiz) => (quiz.quizId === quizId ? { ...quiz, ...data.quiz } : quiz)));
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setStatusBusy((prev) => {
        const next = { ...prev };
        delete next[quizId];
        return next;
      });
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
          <Link href="/admin" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Admin home</Link>
          <Link href="/" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Course hub</Link>
          <Link href="/admin/group-formation" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Group formation</Link>
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
            {weekQuizzes.map((quiz) => {
              const busy = statusBusy[quiz.quizId];
              const isPreviewing = previewId === quiz.quizId;
              return (
                <div key={quiz.quizId} className="quiz-panel quiz-panel-soft" style={{ padding: '1.1rem' }}>
                  <div className="quiz-pill-row" style={{ marginBottom: '0.55rem' }}>
                    <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
                    <span className="quiz-pill quiz-pill-sand">{quiz.phase || 'poll'}</span>
                    {quiz.statusOverride && (
                      <span className="quiz-pill quiz-pill-blue">Override: {quiz.statusOverride}</span>
                    )}
                  </div>
                  <h3 className="quiz-question-title" style={{ fontSize: '1.05rem' }}>{quiz.title}</h3>
                  <div className="quiz-stat-row" style={{ marginTop: '0.5rem' }}>
                    <span className="quiz-stat-chip">Responses: {quiz.responseCount}</span>
                    <span className="quiz-stat-chip">Questions: {quiz.questions?.length || 0}</span>
                  </div>
                  <div className="quiz-button-row" style={{ marginTop: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className={quiz.statusOverride === 'open' ? 'au-btn-primary' : 'au-btn-secondary'}
                      onClick={() => handleStatusChange(quiz.quizId, 'open')}
                      disabled={Boolean(busy)}
                    >
                      {busy === 'open' ? 'Opening...' : 'Send live'}
                    </button>
                    <button
                      type="button"
                      className={quiz.statusOverride === 'closed' ? 'au-btn-primary' : 'au-btn-secondary'}
                      onClick={() => handleStatusChange(quiz.quizId, 'closed')}
                      disabled={Boolean(busy)}
                    >
                      {busy === 'closed' ? 'Closing...' : 'Force close'}
                    </button>
                    {quiz.statusOverride && (
                      <button
                        type="button"
                        className="au-btn-secondary"
                        onClick={() => handleStatusChange(quiz.quizId, 'auto')}
                        disabled={Boolean(busy)}
                      >
                        {busy === 'auto' ? 'Clearing...' : 'Clear override'}
                      </button>
                    )}
                  </div>
                  <div className="quiz-button-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="au-btn-secondary"
                      onClick={() => setPreviewId(isPreviewing ? null : quiz.quizId)}
                    >
                      {isPreviewing ? 'Hide preview' : 'Preview questions'}
                    </button>
                    <Link href={`/admin/quizzes/${quiz.quizId}`} className="au-btn-secondary" style={{ textDecoration: 'none' }}>Details</Link>
                    <Link href={`/admin/quizzes/${quiz.quizId}/live`} className="au-btn-primary" style={{ textDecoration: 'none' }}>Live view</Link>
                  </div>
                  {isPreviewing && (
                    <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(20, 15, 80, 0.12)', paddingTop: '0.85rem' }}>
                      <ol style={{ paddingLeft: '1.1rem', margin: 0 }}>
                        {(quiz.questions || []).map((question) => (
                          <li key={question.questionId} style={{ marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                              <span className="quiz-pill quiz-pill-sand">{question.type}</span>
                              {question.isSpine && <span className="quiz-pill quiz-pill-lavender">Spine</span>}
                            </div>
                            <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0', fontSize: '0.92rem' }}>{question.prompt}</p>
                            {Array.isArray(question.options) && question.options.length > 0 && (
                              <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
                                {question.options.map((option) => (
                                  <li key={option.value} style={{ fontSize: '0.85rem', opacity: 0.85 }}>{option.label}</li>
                                ))}
                              </ul>
                            )}
                            {question.sliderConfig && (
                              <p className="quiz-subtitle" style={{ fontSize: '0.82rem', margin: '0.2rem 0 0 0' }}>
                                Slider {question.sliderConfig.min}–{question.sliderConfig.max} (step {question.sliderConfig.step})
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
