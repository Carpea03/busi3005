'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLoginCard from '../../../../components/admin/admin-login-card';
import useAdminPassword from '../../../../components/admin/use-admin-password';
import { FreeTextPanels, QuizTimelinePanels, SpineTrajectoryPanels } from '../../../../components/quiz/trajectory-panels';

export default function AdminStudentDetailPage({ params }) {
  const admin = useAdminPassword();
  const [trajectory, setTrajectory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin.authenticated) {
      return;
    }

    let ignore = false;

    async function loadStudent() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/students/${encodeURIComponent(params.keyword)}`, {
          headers: admin.getAdminHeaders(),
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load this student trajectory.');
        }

        if (!ignore) {
          setTrajectory(data.trajectory);
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

    void loadStudent();
    return () => {
      ignore = true;
    };
  }, [admin.authenticated, admin.getAdminHeaders, params.keyword]);

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
        title="Student trajectory"
        subtitle="Use the existing admin password to view this student’s trajectory."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Student detail</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>{trajectory?.student.displayName || trajectory?.student.keyword || 'Loading student...'}</h1>
          <p className="quiz-subtitle">Keyword-backed record used for workshop polling and later Assignment 3 review. Historical cohort snapshots are frozen at each submission point.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin/students" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to students</Link>
          <Link href="/admin/export" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Exports</Link>
        </div>
      </div>

      {loading && <div className="quiz-empty-state">Loading student trajectory...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {!loading && trajectory && (
        <div className="quiz-stack">
          <div className="quiz-grid quiz-grid-2">
            <div className="quiz-panel" style={{ padding: '1.2rem' }}>
              <p className="quiz-question-label">Identity</p>
              <h2 className="quiz-question-title" style={{ fontSize: '1.25rem' }}>{trajectory.student.keyword}</h2>
              <div className="quiz-stat-row">
                <span className="quiz-stat-chip">Cohort: {trajectory.student.cohort || 'unspecified'}</span>
                <span className="quiz-stat-chip">Quizzes answered: {trajectory.quizzesAnswered}</span>
                <span className="quiz-stat-chip">Spine points: {trajectory.spineQuestions.length}</span>
              </div>
              <p className="quiz-inline-note">Created {new Date(trajectory.student.createdAt).toLocaleString('en-AU')}</p>
              <p className="quiz-inline-note">Last seen {new Date(trajectory.student.lastSeenAt).toLocaleString('en-AU')}</p>
            </div>
            <div className="quiz-panel" style={{ padding: '1.2rem' }}>
              <p className="quiz-question-label">Marking context</p>
              <p className="quiz-muted" style={{ margin: 0 }}>
                This view keeps the full sequence together: spine questions for longitudinal change, free-text answers for interpretation, the quiz-by-quiz timeline for context, and the frozen cohort snapshot that existed when each answer was submitted.
              </p>
            </div>
          </div>

          <SpineTrajectoryPanels
            spineQuestions={trajectory.spineQuestions}
            title="Spine trajectory"
            subtitle="Repeated spine questions joined across weeks by normalised question ID."
            emptyMessage="No spine answers were found for this student."
          />

          <FreeTextPanels
            freeTextResponses={trajectory.freeTextResponses}
            subtitle="Written answers Alex may want to read while reviewing Assignment 3."
            emptyMessage="No free-text answers were recorded for this student."
          />

          <QuizTimelinePanels
            timeline={trajectory.timeline}
            emptyMessage="This student has not submitted any quiz responses yet."
          />
        </div>
      )}
    </div>
  );
}