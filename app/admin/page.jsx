'use client';

import { useState, useCallback } from 'react';

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
  const c = EXPERIENCE_COLOURS[level] || { bg: '#F0F0F0', text: '#555' };
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text, fontFamily: 'Arial, sans-serif' }}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLOURS[status] || { bg: '#F0F0F0', text: '#555', label: status || '—' };
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text, fontFamily: 'Arial, sans-serif' }}
    >
      {c.label}
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

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWorkshop, setFilterWorkshop] = useState('All');
  const [expandedStudent, setExpandedStudent] = useState(null);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem('au.quiz.admin.password', password);
        setAuthenticated(true);
        loadData(password);
      } else {
        setAuthError('Incorrect password. Please try again.');
      }
    } catch {
      setAuthError('Connection error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = useCallback(async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/responses', { headers: { 'x-admin-password': pwd || password } });
      if (!res.ok) throw new Error('Failed to load responses');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError('Failed to load data. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handleExport = () => {
    fetch('/api/export', { headers: { 'x-admin-password': password } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `group-formation-responses-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      });
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.hustleDirection?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.hustleConcept?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.members || []).some((m) => m.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.confirmedGroup || []).some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'All' || s.matchStatus === filterStatus;
    const matchesWorkshop = filterWorkshop === 'All' || s.workshop === filterWorkshop;
    return matchesSearch && matchesStatus && matchesWorkshop;
  });

  const statusCounts = submissions.reduce((acc, s) => {
    const status = s.matchStatus || 'seeking';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <div className="card text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-5"
            style={{ backgroundColor: '#140F50' }}
          >
            🔒
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mb-6" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            AI for Business Transformation — Group Formation
          </p>

          <input
            className="au-input mb-3"
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          {authError && (
            <p className="text-red-500 text-sm mb-3" style={{ fontFamily: 'Georgia, serif' }}>{authError}</p>
          )}

          <button
            className="au-btn-primary w-full"
            onClick={handleLogin}
            disabled={authLoading || !password}
            style={{ opacity: authLoading ? 0.7 : 1 }}
          >
            {authLoading ? 'Verifying...' : 'Enter Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            Assignment 2: AI Side Hustle Launch — Group Formation
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <a
            className="au-btn-secondary text-sm"
            href="/admin/quizzes"
            style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            🎛 Live Quizzes
          </a>
          <button
            className="au-btn-secondary text-sm"
            onClick={() => loadData()}
            style={{ padding: '0.5rem 1rem' }}
          >
            ↻ Refresh
          </button>
          <button
            className="au-btn-primary text-sm"
            onClick={handleExport}
            style={{ padding: '0.5rem 1rem' }}
          >
            ↓ Export CSV
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

      {loading && (
        <div className="text-center py-16" style={{ color: '#9E97C4', fontFamily: 'Georgia, serif' }}>
          Loading submissions...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#FFF0F0', border: '1px solid #FFB3B3', color: '#CC0000', fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {!loading && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <input
              className="au-input flex-1 min-w-48"
              style={{ maxWidth: '320px' }}
              placeholder="Search by name, hustle, or member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="au-input"
              style={{ width: 'auto', cursor: 'pointer' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              onChange={(e) => setFilterWorkshop(e.target.value)}
            >
              <option value="All">Both workshops</option>
              <option value="Wednesday 2–5pm">Wednesday 2–5pm</option>
              <option value="Friday 8–11am">Friday 8–11am</option>
            </select>
          </div>

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-16" style={{ color: '#9E97C4', fontFamily: 'Georgia, serif' }}>
              {submissions.length === 0 ? 'No submissions yet. Share the form link with students.' : 'No results match your filters.'}
            </div>
          )}

          <div className="space-y-3">
            {filteredSubmissions.map((s) => {
              const rowId = s.respondentId || s.fullName;
              const groupSummary = s.matchStatus === 'confirmed' && s.confirmedGroup?.length
                ? `→ ${s.confirmedGroup.join(', ')}`
                : s.matchStatus === 'declared' && s.members?.length
                  ? `→ ${s.members.join(', ')}`
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
                          {s.fullName}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#EAF2FF', color: '#1449FF', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
                        >
                          {s.workshop || 'Workshop not set'}
                        </span>
                        <ExperienceBadge level={s.aiExperience} />
                        <StatusBadge status={s.matchStatus} />
                      </div>
                      <p className="text-sm mt-1 truncate" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                        {s.hustleDirection || '—'} {groupSummary}
                      </p>
                    </div>
                    <div className="text-xs shrink-0" style={{ color: '#C4BBE8', fontFamily: 'Georgia, serif' }}>
                      {expandedStudent === rowId ? '▲' : '▼'}
                    </div>
                  </div>

                  {expandedStudent === rowId && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0ECF8' }}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intent</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.intent || '—'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.workshop || '—'}</p>
                        </div>
                        {s.intent === 'declared-group' && (
                          <div className="sm:col-span-2">
                            <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Declared group members</h4>
                            <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{(s.members || []).join(', ') || '—'}</p>
                          </div>
                        )}
                        {s.matchStatus === 'confirmed' && (s.confirmedGroup || []).length > 0 && (
                          <div className="sm:col-span-2">
                            <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed group (via matchmaking)</h4>
                            <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.confirmedGroup.join(', ')}</p>
                          </div>
                        )}
                        {s.intent === 'seeking' && (
                          <div className="sm:col-span-2">
                            <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h4>
                            <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>
                              {s.email || '—'} {s.consentShare ? '· consent: yes' : '· consent: no'}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI tools used</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.aiTools?.join(', ') || 'None selected'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Build skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {(s.buildSkills || []).map((sk) => (
                              <span key={sk} className="tag text-xs">{sk}</span>
                            ))}
                          </div>
                        </div>
                        {s.intent === 'seeking' && (
                          <>
                            <div>
                              <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</h4>
                              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{(s.availability || []).join(', ') || '—'}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working style</h4>
                              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>
                                Deadline approach: {s.deadlineApproach || '–'}/5 · Meeting preference: {s.meetingPreference || '–'}/5
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hustle concept</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.hustleConcept || '—'}</p>
                        </div>
                      </div>
                      <p className="text-xs mt-4" style={{ color: '#C4BBE8', fontFamily: 'Georgia, serif' }}>
                        Submitted {s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-AU') : '—'}
                        {s.updatedAt && s.updatedAt !== s.submittedAt ? ` · last updated ${new Date(s.updatedAt).toLocaleString('en-AU')}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
