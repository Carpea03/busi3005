'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLoginCard from '../../../components/admin/admin-login-card';
import useAdminPassword from '../../../components/admin/use-admin-password';

const EXPERIENCE_COLOURS = {
  Beginner: { bg: '#FFF0E0', text: '#B35A00' },
  Intermediate: { bg: '#E0F0FF', text: '#0055B3' },
  Advanced: { bg: '#E5F5E5', text: '#1A7A1A' },
  Expert: { bg: '#F0E5FF', text: '#6B00CC' },
};

const STATUS_COLOURS = {
  solo: { bg: '#EAF2FF', text: '#1449FF', label: 'Solo' },
  declared: { bg: '#F0E5FF', text: '#6B00CC', label: 'Declared group' },
  seeking: { bg: '#FFF8E0', text: '#8A6600', label: 'Seeking' },
  confirmed: { bg: '#E5F5E5', text: '#1A7A1A', label: 'Confirmed' },
};

function ExperienceBadge({ level }) {
  const colours = EXPERIENCE_COLOURS[level] || { bg: '#F0F0F0', text: '#555' };
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: colours.bg, color: colours.text, fontFamily: 'Arial, sans-serif' }}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }) {
  const colours = STATUS_COLOURS[status] || { bg: '#F0F0F0', text: '#555', label: status || '—' };
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: colours.bg, color: colours.text, fontFamily: 'Arial, sans-serif' }}
    >
      {colours.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col items-center justify-center text-center"
      style={{ backgroundColor: 'white', border: `2px solid ${accent || '#E0D9F5'}` }}
    >
      <div className="text-3xl font-bold mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif' }}>{value}</div>
      <div className="text-xs" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>{label}</div>
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

export default function AdminGroupFormationPage() {
  const admin = useAdminPassword();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWorkshop, setFilterWorkshop] = useState('All');
  const [expandedStudent, setExpandedStudent] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/responses', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load group formation responses.');
      }

      setSubmissions(data.submissions || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load group formation responses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!admin.authenticated) {
      return;
    }

    void loadData();
  }, [admin.authenticated, loadData]);

  const filteredSubmissions = useMemo(() => submissions.filter((submission) => {
    const needle = searchTerm.trim().toLowerCase();
    const matchesSearch = !needle
      || submission.fullName?.toLowerCase().includes(needle)
      || submission.hustleDirection?.toLowerCase().includes(needle)
      || submission.hustleConcept?.toLowerCase().includes(needle)
      || (submission.members || []).some((member) => member.toLowerCase().includes(needle))
      || (submission.confirmedGroup || []).some((member) => member.toLowerCase().includes(needle));

    const matchesStatus = filterStatus === 'All' || submission.matchStatus === filterStatus;
    const matchesWorkshop = filterWorkshop === 'All' || submission.workshop === filterWorkshop;
    return matchesSearch && matchesStatus && matchesWorkshop;
  }), [filterStatus, filterWorkshop, searchTerm, submissions]);

  const statusCounts = useMemo(() => submissions.reduce((accumulator, submission) => {
    const status = submission.matchStatus || 'seeking';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {}), [submissions]);

  async function handleExport() {
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
        title="Group formation board"
        subtitle="This is now the secondary lecturer workflow. Use it to monitor Assignment 2 intent mix, review matchmaking activity, and export the form data."
      />
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Assignment 2 support</p>
          <h1 className="quiz-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>Group formation board</h1>
          <p className="quiz-subtitle">
            Quizzes now lead the admin console. This board stays available for reviewing solo, declared-group, seeking,
            and confirmed submissions without crowding the primary lecturer workflow.
          </p>
        </div>
        <div className="quiz-button-row">
          <Link href="/admin" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Admin home</Link>
          <Link href="/admin/quizzes" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Quiz control room</Link>
          <button type="button" className="au-btn-secondary" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="au-btn-secondary" onClick={admin.logout}>Sign out</button>
          <button type="button" className="au-btn-primary" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? 'Downloading...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <StatCard label="Total submissions" value={submissions.length} accent="#856BFF" />
        <StatCard label="Solo" value={statusCounts.solo || 0} accent="#66B3FF" />
        <StatCard label="Declared groups" value={statusCounts.declared || 0} accent="#B366FF" />
        <StatCard label="Seeking" value={statusCounts.seeking || 0} accent="#FFB366" />
        <StatCard label="Confirmed" value={statusCounts.confirmed || 0} accent="#66CC66" />
      </div>

      {loading && submissions.length === 0 ? <div className="quiz-empty-state">Loading group formation submissions...</div> : null}
      {error ? <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div> : null}

      <div className="quiz-panel" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
        <div className="quiz-panel-header" style={{ marginBottom: '0.9rem' }}>
          <div>
            <p className="quiz-question-label">Filters</p>
            <h2 className="quiz-question-title" style={{ fontSize: '1.2rem' }}>Search by name, idea, or group member.</h2>
          </div>
          <p className="quiz-inline-note">{filteredSubmissions.length} results shown</p>
        </div>

        <div className="quiz-button-row" style={{ alignItems: 'stretch' }}>
          <input
            className="au-input"
            style={{ flex: '1 1 18rem', maxWidth: '24rem' }}
            placeholder="Search by name, hustle, or member"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="au-input"
            style={{ width: 'auto', cursor: 'pointer' }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="solo">Solo</option>
            <option value="declared">Declared group</option>
            <option value="seeking">Seeking</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <select
            className="au-input"
            style={{ width: 'auto', cursor: 'pointer' }}
            value={filterWorkshop}
            onChange={(event) => setFilterWorkshop(event.target.value)}
          >
            <option value="All">Both workshops</option>
            <option value="Wednesday 2–5pm">Wednesday 2–5pm</option>
            <option value="Friday 8–11am">Friday 8–11am</option>
          </select>
        </div>
      </div>

      {filteredSubmissions.length === 0 && !loading ? (
        <div className="quiz-empty-state">
          {submissions.length === 0 ? 'No submissions yet. Share the form link with students.' : 'No results match the current filters.'}
        </div>
      ) : null}

      <div className="quiz-stack">
        {filteredSubmissions.map((submission) => {
          const rowId = submission.respondentId || submission.fullName;
          const groupSummary = submission.matchStatus === 'confirmed' && submission.confirmedGroup?.length
            ? `→ ${submission.confirmedGroup.join(', ')}`
            : submission.matchStatus === 'declared' && submission.members?.length
              ? `→ ${submission.members.join(', ')}`
              : '';

          return (
            <div
              key={rowId}
              className="card"
              style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}
              onClick={() => setExpandedStudent(expandedStudent === rowId ? null : rowId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                      {submission.fullName}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#EAF2FF', color: '#1449FF', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
                    >
                      {submission.workshop || 'Workshop not set'}
                    </span>
                    <ExperienceBadge level={submission.aiExperience} />
                    <StatusBadge status={submission.matchStatus} />
                  </div>
                  <p className="text-sm mt-1 truncate" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                    {submission.hustleDirection || '—'} {groupSummary}
                  </p>
                </div>
                <div className="text-xs shrink-0" style={{ color: '#C4BBE8', fontFamily: 'Georgia, serif' }}>
                  {expandedStudent === rowId ? '▲' : '▼'}
                </div>
              </div>

              {expandedStudent === rowId ? (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0ECF8' }}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intent</h4>
                      <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{submission.intent || '—'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop</h4>
                      <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{submission.workshop || '—'}</p>
                    </div>
                    {submission.intent === 'declared-group' ? (
                      <div className="sm:col-span-2">
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Declared group members</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{(submission.members || []).join(', ') || '—'}</p>
                      </div>
                    ) : null}
                    {submission.matchStatus === 'confirmed' && (submission.confirmedGroup || []).length > 0 ? (
                      <div className="sm:col-span-2">
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed group (via matchmaking)</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{submission.confirmedGroup.join(', ')}</p>
                      </div>
                    ) : null}
                    {submission.intent === 'seeking' ? (
                      <div className="sm:col-span-2">
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>
                          {submission.email || '—'} {submission.consentShare ? '· consent: yes' : '· consent: no'}
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI tools used</h4>
                      <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{submission.aiTools?.join(', ') || 'None selected'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Build skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {(submission.buildSkills || []).map((skill) => (
                          <span key={skill} className="tag text-xs">{skill}</span>
                        ))}
                      </div>
                    </div>
                    {submission.intent === 'seeking' ? (
                      <>
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{(submission.availability || []).join(', ') || '—'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working style</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>
                            Deadline approach: {submission.deadlineApproach || '–'}/5 · Meeting preference: {submission.meetingPreference || '–'}/5
                          </p>
                        </div>
                      </>
                    ) : null}
                    <div>
                      <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hustle concept</h4>
                      <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{submission.hustleConcept || '—'}</p>
                    </div>
                  </div>
                  <p className="text-xs mt-4" style={{ color: '#C4BBE8', fontFamily: 'Georgia, serif' }}>
                    Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('en-AU') : '—'}
                    {submission.updatedAt && submission.updatedAt !== submission.submittedAt
                      ? ` · last updated ${new Date(submission.updatedAt).toLocaleString('en-AU')}`
                      : ''}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}