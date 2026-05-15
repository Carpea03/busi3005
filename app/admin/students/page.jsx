'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminLoginCard from '../../../components/admin/admin-login-card';
import useAdminPassword from '../../../components/admin/use-admin-password';

export default function AdminStudentsPage() {
  const admin = useAdminPassword();
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin.authenticated) {
      return;
    }

    let ignore = false;

    async function loadStudents() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/students', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load student trajectories.');
        }

        if (!ignore) {
          setStudents(data.students || []);
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

    void loadStudents();
    return () => {
      ignore = true;
    };
  }, [admin.authenticated]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return students;
    }

    const needle = searchTerm.trim().toLowerCase();
    return students.filter((student) => (
      student.keyword?.toLowerCase().includes(needle) ||
      student.displayName?.toLowerCase().includes(needle) ||
      student.cohort?.toLowerCase().includes(needle)
    ));
  }, [searchTerm, students]);

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
        title="Student trajectories"
        subtitle="Use the existing admin password to access all saved student trajectories."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Student trajectories</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>Browse saved student records.</h1>
          <p className="quiz-subtitle">Each keyword acts as the student’s identity for workshop polling and the later Assignment 3 trajectory review.</p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Admin home</Link>
          <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Quiz control room</Link>
        </div>
      </div>

      <div className="quiz-panel" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
        <label className="quiz-question-label" htmlFor="student-search">Search students</label>
        <input
          id="student-search"
          className="quiz-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filter by keyword, display name, or cohort"
        />
      </div>

      {loading && <div className="quiz-empty-state">Loading students...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {!loading && filteredStudents.length === 0 && (
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <div className="quiz-empty-state">No student records match the current filter.</div>
        </div>
      )}

      <div className="quiz-grid quiz-grid-2">
        {filteredStudents.map((student) => (
          <div key={student.keyword} className="quiz-panel quiz-panel-soft" style={{ padding: '1.2rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '0.8rem' }}>
              <div>
                <p className="quiz-question-label">{student.displayName || 'No display name set'}</p>
                <h2 className="quiz-question-title" style={{ fontSize: '1.25rem' }}>{student.keyword}</h2>
              </div>
              <div className="quiz-pill-row">
                <span className="quiz-pill quiz-pill-navy">{student.cohort || 'unspecified'}</span>
              </div>
            </div>

            <div className="quiz-stat-row" style={{ marginTop: 0 }}>
              <span className="quiz-stat-chip">Quiz responses: {student.responseCount}</span>
              <span className="quiz-stat-chip">Free text: {student.freeTextCount}</span>
            </div>

            <p className="quiz-inline-note">Last seen {new Date(student.lastSeenAt).toLocaleString('en-AU')}</p>
            {student.lastSubmittedAt && <p className="quiz-inline-note">Last quiz answer {new Date(student.lastSubmittedAt).toLocaleString('en-AU')}</p>}

            <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
              <Link href={`/admin/students/${student.keyword}`} className="au-btn-primary" style={{ textDecoration: 'none' }}>Open trajectory</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}