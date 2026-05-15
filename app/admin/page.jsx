'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLoginCard from '../../components/admin/admin-login-card';
import useAdminPassword from '../../components/admin/use-admin-password';

function statusTone(status) {
  if (status === 'open') return 'quiz-pill-blue';
  if (status === 'closed') return 'quiz-pill-sand';
  return 'quiz-pill-lavender';
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDateTime(value) {
  if (!value) {
    return 'Schedule not set';
  }

  try {
    return new Date(value).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function groupByWeek(quizzes) {
  const byWeek = new Map();

  for (const quiz of quizzes) {
    const weekNumber = quiz.weekNumber || 0;
    if (!byWeek.has(weekNumber)) {
      byWeek.set(weekNumber, []);
    }
    byWeek.get(weekNumber).push(quiz);
  }

  return [...byWeek.entries()]
    .sort(([left], [right]) => left - right)
    .map(([weekNumber, weekQuizzes]) => ({
      weekNumber,
      quizzes: weekQuizzes.sort((left, right) => String(left.phase).localeCompare(String(right.phase))),
    }));
}

function MetricCard({ label, value, note, tone = 'navy' }) {
  return (
    <div className={`quiz-panel admin-metric-card admin-metric-card-${tone}`}>
      <p className="admin-metric-value">{value}</p>
      <p className="admin-metric-label">{label}</p>
      {note ? <p className="admin-metric-note">{note}</p> : null}
    </div>
  );
}

function ActionCard({ href, kicker, title, description, tone = 'navy' }) {
  return (
    <Link href={href} className={`admin-link-card admin-link-card-${tone}`}>
      <p className="admin-link-kicker">{kicker}</p>
      <h3 className="admin-link-title">{title}</h3>
      <p className="admin-link-copy">{description}</p>
    </Link>
  );
}

function SpotlightQuizCard({ quiz, live }) {
  return (
    <div className="quiz-panel quiz-panel-soft admin-spotlight-card">
      <div className="quiz-pill-row" style={{ marginBottom: '0.65rem' }}>
        <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
        <span className="quiz-pill quiz-pill-sand">Week {quiz.weekNumber || '—'}</span>
        <span className="quiz-pill quiz-pill-navy">{quiz.phase || 'poll'}</span>
        {quiz.statusOverride ? <span className="quiz-pill quiz-pill-blue">Override: {quiz.statusOverride}</span> : null}
      </div>

      <h3 className="quiz-question-title" style={{ fontSize: '1.2rem' }}>{quiz.title}</h3>
      <p className="quiz-subtitle" style={{ marginTop: '0.45rem', fontSize: '0.96rem' }}>
        {live
          ? `${quiz.responseCount || 0} responses so far. Keep the projector page open while the room is active.`
          : `Scheduled ${formatDateTime(quiz.releaseAt)}.`}
      </p>

      <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
        <Link
          href={live ? `/admin/quizzes/${quiz.quizId}/live` : `/admin/quizzes/${quiz.quizId}`}
          className="au-btn-primary"
          style={{ textDecoration: 'none' }}
        >
          {live ? 'Open live view' : 'Open quiz details'}
        </Link>
        <Link href={`/admin/quizzes/${quiz.quizId}`} className="au-btn-secondary" style={{ textDecoration: 'none' }}>
          Status and questions
        </Link>
      </div>
    </div>
  );
}

async function downloadCsv(path, filename) {
  const response = await fetch(path);
  if (!response.ok) {
    let error = 'Unable to download export.';
    try {
      const data = await response.json();
      error = data.error || error;
    } catch {
      // Ignore JSON parsing issues and fall back to the generic message.
    }
    throw new Error(error);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const admin = useAdminPassword();
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [quizResponse, groupResponse] = await Promise.all([
        fetch('/api/admin/quizzes', { cache: 'no-store' }),
        fetch('/api/responses', { cache: 'no-store' }),
      ]);

      const [quizData, groupData] = await Promise.all([quizResponse.json(), groupResponse.json()]);

      if (!quizResponse.ok) {
        throw new Error(quizData.error || 'Unable to load quizzes.');
      }

      if (!groupResponse.ok) {
        throw new Error(groupData.error || 'Unable to load group formation data.');
      }

      setQuizzes(quizData.quizzes || []);
      setSubmissions(groupData.submissions || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the admin console.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!admin.authenticated) {
      return;
    }

    void loadDashboard();
  }, [admin.authenticated, loadDashboard]);

  const liveQuizzes = useMemo(() => quizzes.filter((quiz) => quiz.status === 'open'), [quizzes]);
  const groupedWeeks = useMemo(() => groupByWeek(quizzes), [quizzes]);
  const overrideCount = useMemo(() => quizzes.filter((quiz) => Boolean(quiz.statusOverride)).length, [quizzes]);
  const totalResponses = useMemo(() => quizzes.reduce((sum, quiz) => sum + (quiz.responseCount || 0), 0), [quizzes]);

  const nextQuiz = useMemo(() => {
    const now = Date.now();
    return quizzes
      .filter((quiz) => {
        const releaseAt = parseTimestamp(quiz.releaseAt);
        return releaseAt !== null && releaseAt > now;
      })
      .sort((left, right) => parseTimestamp(left.releaseAt) - parseTimestamp(right.releaseAt))[0] || null;
  }, [quizzes]);

  const spotlightQuizzes = liveQuizzes.length > 0
    ? liveQuizzes
    : nextQuiz
      ? [nextQuiz]
      : quizzes.slice(0, 2);

  const spotlightTitle = liveQuizzes.length > 0
    ? 'Live now'
    : nextQuiz
      ? 'Up next'
      : 'Quiz library';

  const spotlightCopy = liveQuizzes.length > 0
    ? 'These quizzes are active. Keep the projector open and move to the detail page if you need to override the schedule.'
    : nextQuiz
      ? 'No quiz is currently open. The next scheduled release is ready to brief and monitor.'
      : 'The quiz schedule is configured, but there is no live quiz or future release date available yet.';

  const groupStatusCounts = useMemo(() => submissions.reduce((accumulator, submission) => {
    const status = submission.matchStatus || 'seeking';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {}), [submissions]);

  const latestSubmissions = useMemo(() => submissions.slice(0, 5), [submissions]);

  async function handleGroupExport() {
    setExporting(true);
    setError('');

    try {
      await downloadCsv('/api/export', `group-formation-responses-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download export.');
    } finally {
      setExporting(false);
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
        title="Admin console"
        subtitle="Quizzes are the primary lecturer workflow. Use this console for live delivery, student trajectories, exports, and the secondary group-formation board."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel admin-console-hero">
        <div>
          <p className="quiz-kicker">Lecturer layer</p>
          <h1 className="quiz-title">Quiz-first admin console</h1>
          <p className="quiz-subtitle">
            Run the workshop from one place. Quiz visibility, live projector mode, student trajectories, and exports stay front and centre.
            Group formation is still here, but it now sits behind a secondary board instead of owning the whole admin surface.
          </p>
        </div>

        <div className="quiz-button-row" style={{ marginTop: '1.35rem' }}>
          <Link href="/admin/quizzes" className="au-btn-primary" style={{ textDecoration: 'none' }}>Open quiz control room</Link>
          <Link href="/admin/students" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Student trajectories</Link>
          <Link href="/admin/export" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Quiz exports</Link>
          <Link href="/admin/group-formation" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Group formation board</Link>
          <button type="button" className="au-btn-secondary" onClick={() => void loadDashboard()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="au-btn-secondary" onClick={admin.logout}>Sign out</button>
        </div>

        <div className="admin-metric-grid" style={{ marginTop: '1.35rem' }}>
          <MetricCard label="Quizzes configured" value={quizzes.length} note={`${groupedWeeks.length} teaching weeks in play`} tone="navy" />
          <MetricCard label="Live right now" value={liveQuizzes.length} note={liveQuizzes.length ? 'Projector-ready quizzes' : 'No quiz currently open'} tone="blue" />
          <MetricCard label="Quiz responses" value={totalResponses} note="Across all stored quiz attempts" tone="lavender" />
          <MetricCard label="Manual overrides" value={overrideCount} note={overrideCount ? 'Schedule temporarily overridden' : 'Schedule running as configured'} tone="sand" />
          <MetricCard label="Group forms" value={submissions.length} note={`${groupStatusCounts.seeking || 0} students still seeking`} tone="blue" />
        </div>
      </div>

      {error ? <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div> : null}
      {loading && quizzes.length === 0 && submissions.length === 0 ? <div className="quiz-empty-state">Loading admin console...</div> : null}

      <div className="admin-console-grid">
        <div className="quiz-stack">
          <div className="quiz-panel" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <p className="quiz-question-label">{spotlightTitle}</p>
                <h2 className="quiz-question-title">{spotlightCopy}</h2>
              </div>
              <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>See all quizzes</Link>
            </div>

            {spotlightQuizzes.length === 0 ? (
              <div className="quiz-empty-state">No quizzes have been configured yet.</div>
            ) : (
              <div className="admin-spotlight-grid">
                {spotlightQuizzes.map((quiz) => (
                  <SpotlightQuizCard key={quiz.quizId} quiz={quiz} live={quiz.status === 'open'} />
                ))}
              </div>
            )}
          </div>

          <div className="quiz-panel" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <p className="quiz-question-label">Semester map</p>
                <h2 className="quiz-question-title">Every quiz grouped by teaching week.</h2>
              </div>
              <p className="quiz-inline-note">Baseline and reflect phases stay split so the current week is easy to scan.</p>
            </div>

            {groupedWeeks.length === 0 ? (
              <div className="quiz-empty-state">No quiz definitions found. Edit lib/quizzes.js to add them.</div>
            ) : (
              <div className="admin-week-grid">
                {groupedWeeks.map(({ weekNumber, quizzes: weekQuizzes }) => {
                  const weekLiveCount = weekQuizzes.filter((quiz) => quiz.status === 'open').length;

                  return (
                    <div key={weekNumber} className="quiz-panel quiz-panel-soft admin-week-card">
                      <div className="quiz-panel-header" style={{ marginBottom: '0.75rem' }}>
                        <div>
                          <p className="quiz-question-label">Week {weekNumber}</p>
                          <h3 className="quiz-question-title" style={{ fontSize: '1.05rem' }}>
                            {weekQuizzes.length === 1 ? 'Single quiz touchpoint' : `${weekQuizzes.length} quiz touchpoints`}
                          </h3>
                        </div>
                        {weekLiveCount > 0 ? <span className="quiz-pill quiz-pill-blue">Live {weekLiveCount}</span> : null}
                      </div>

                      <div className="admin-inline-list">
                        {weekQuizzes.map((quiz) => (
                          <Link key={quiz.quizId} href={`/admin/quizzes/${quiz.quizId}`} className="admin-inline-link">
                            <span className="admin-inline-link-copy">
                              <strong>{quiz.title}</strong>
                              <span>{quiz.phase || 'poll'} · {quiz.questions?.length || 0} questions</span>
                            </span>
                            <span className={`quiz-pill ${statusTone(quiz.status)}`}>{quiz.status}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="quiz-stack">
          <div className="quiz-panel" style={{ padding: '1.25rem' }}>
            <p className="quiz-question-label">Quick actions</p>
            <h2 className="quiz-question-title" style={{ marginBottom: '1rem' }}>Move between the main lecturer workflows.</h2>
            <div className="admin-link-grid">
              <ActionCard
                href={liveQuizzes[0] ? `/admin/quizzes/${liveQuizzes[0].quizId}/live` : '/admin/quizzes'}
                kicker={liveQuizzes[0] ? 'Projector' : 'Quiz library'}
                title={liveQuizzes[0] ? 'Open the active live view' : 'Browse the full quiz schedule'}
                description={liveQuizzes[0]
                  ? `${liveQuizzes[0].title} is currently open with ${liveQuizzes[0].responseCount || 0} responses.`
                  : 'Preview questions, force-open a quiz, and inspect response counts by week.'}
                tone="blue"
              />
              <ActionCard
                href="/admin/students"
                kicker="Trajectories"
                title="Review student histories"
                description="Browse every saved keyword, cohort, and response trail without leaving the admin area."
                tone="navy"
              />
              <ActionCard
                href="/admin/export"
                kicker="Exports"
                title="Download marking-ready CSVs"
                description="Pull row-based response data or wide trajectory exports for analysis and assessment."
                tone="lavender"
              />
            </div>
          </div>

          <div className="quiz-panel" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <p className="quiz-question-label">Group formation</p>
                <h2 className="quiz-question-title">Keep this workflow visible without letting it dominate.</h2>
              </div>
              <Link href="/admin/group-formation" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Open board</Link>
            </div>

            <div className="quiz-stat-row" style={{ marginTop: 0 }}>
              <span className="quiz-stat-chip">Solo {groupStatusCounts.solo || 0}</span>
              <span className="quiz-stat-chip">Declared {groupStatusCounts.declared || 0}</span>
              <span className="quiz-stat-chip">Seeking {groupStatusCounts.seeking || 0}</span>
              <span className="quiz-stat-chip">Confirmed {groupStatusCounts.confirmed || 0}</span>
            </div>

            {latestSubmissions.length === 0 ? (
              <div className="quiz-empty-state" style={{ marginTop: '1rem' }}>No group-formation submissions yet.</div>
            ) : (
              <div className="admin-mini-list" style={{ marginTop: '1rem' }}>
                {latestSubmissions.map((submission) => (
                  <div key={submission.respondentId || submission.fullName} className="admin-mini-list-item">
                    <div>
                      <p className="admin-mini-list-title">{submission.fullName}</p>
                      <p className="admin-mini-list-copy">
                        {submission.workshop || 'Workshop not set'} · {submission.hustleDirection || 'No direction set yet'}
                      </p>
                    </div>
                    <span className="quiz-pill quiz-pill-sand">{submission.matchStatus || 'seeking'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
              <button type="button" className="au-btn-primary" onClick={() => void handleGroupExport()} disabled={exporting}>
                {exporting ? 'Downloading...' : 'Export group CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}