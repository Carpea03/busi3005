'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminLoginCard from '../../../components/admin/admin-login-card';
import useAdminPassword from '../../../components/admin/use-admin-password';

export default function AdminExportPage() {
  const admin = useAdminPassword();
  const [downloading, setDownloading] = useState('');
  const [error, setError] = useState('');

  async function downloadCsv(path, filename) {
    setDownloading(filename);
    setError('');

    try {
      const response = await fetch(path, { headers: admin.getAdminHeaders() });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to download export.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading('');
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
        title="Quiz exports"
        subtitle="Use the existing admin password to download quiz response and trajectory CSVs."
      />
    );
  }

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Exports</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>Download quiz data for marking and analysis.</h1>
          <p className="quiz-subtitle">Responses export is row-based. Trajectory export is wide, with one row per student and spine question IDs spread across weeks.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to quiz control room</Link>
          <Link href="/admin/students" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Student trajectories</Link>
        </div>
      </div>

      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      <div className="quiz-stack">
        <div className="quiz-panel" style={{ padding: '1.3rem' }}>
          <p className="quiz-question-label">Responses CSV</p>
          <h2 className="quiz-question-title" style={{ fontSize: '1.3rem' }}>One row per student per question.</h2>
          <p className="quiz-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Includes keyword, display name, cohort at submission, week number, quiz, question, answer value, and submitted time.
          </p>
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="au-btn-primary"
              onClick={() => downloadCsv('/api/admin/export/responses.csv', `quiz-responses-${new Date().toISOString().split('T')[0]}.csv`)}
              disabled={Boolean(downloading)}
            >
              {downloading.startsWith('quiz-responses') ? 'Downloading...' : 'Download responses CSV'}
            </button>
          </div>
        </div>

        <div className="quiz-panel" style={{ padding: '1.3rem' }}>
          <p className="quiz-question-label">Trajectory CSV</p>
          <h2 className="quiz-question-title" style={{ fontSize: '1.3rem' }}>One row per student, spine columns by week.</h2>
          <p className="quiz-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Includes keyword, display name, cohort, and a column for every spine question-week combination such as spine.career-confidence__week_4.
          </p>
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="au-btn-primary"
              onClick={() => downloadCsv('/api/admin/export/trajectory.csv', `quiz-trajectory-${new Date().toISOString().split('T')[0]}.csv`)}
              disabled={Boolean(downloading)}
            >
              {downloading.startsWith('quiz-trajectory') ? 'Downloading...' : 'Download trajectory CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}