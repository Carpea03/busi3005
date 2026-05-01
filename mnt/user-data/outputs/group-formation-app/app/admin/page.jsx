'use client';

import { useState, useCallback } from 'react';

const EXPERIENCE_COLOURS = {
  Beginner: { bg: '#FFF0E0', text: '#B35A00' },
  Intermediate: { bg: '#E0F0FF', text: '#0055B3' },
  Advanced: { bg: '#E5F5E5', text: '#1A7A1A' },
  Expert: { bg: '#F0E5FF', text: '#6B00CC' },
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
  const [view, setView] = useState('responses'); // 'responses' | 'groups'

  const [generatingGroups, setGeneratingGroups] = useState(false);
  const [groups, setGroups] = useState(null);
  const [groupSummary, setGroupSummary] = useState('');
  const [flaggedItems, setFlaggedItems] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterExperience, setFilterExperience] = useState('All');
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

      // Also check for existing groups
      const groupRes = await fetch('/api/generate-groups', { headers: { 'x-admin-password': pwd || password } });
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        if (groupData.groups) {
          setGroups(groupData.groups);
          setGroupSummary(groupData.summary || '');
          setFlaggedItems(groupData.flaggedConsiderations || []);
          setGeneratedAt(groupData.generatedAt);
        }
      }
    } catch (err) {
      setError('Failed to load data. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handleGenerateGroups = async () => {
    setGeneratingGroups(true);
    try {
      const res = await fetch('/api/generate-groups', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error generating groups');
        return;
      }
      setGroups(data.groups);
      setGroupSummary(data.summary || '');
      setFlaggedItems(data.flaggedConsiderations || []);
      setGeneratedAt(data.generatedAt);
      setView('groups');
    } catch {
      alert('Network error generating groups.');
    } finally {
      setGeneratingGroups(false);
    }
  };

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
      s.industryInterest?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterExperience === 'All' || s.aiExperience === filterExperience;
    return matchesSearch && matchesFilter;
  });

  const experienceCounts = submissions.reduce((acc, s) => {
    acc[s.aiExperience] = (acc[s.aiExperience] || 0) + 1;
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
      {/* Dashboard header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            Assignment 2: AI Business Pitch — Group Formation
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
            className="au-btn-secondary text-sm"
            onClick={handleExport}
            style={{ padding: '0.5rem 1rem' }}
          >
            ↓ Export CSV
          </button>
          <button
            className="au-btn-primary text-sm"
            onClick={handleGenerateGroups}
            disabled={generatingGroups || submissions.length < 3}
            style={{ padding: '0.5rem 1.25rem', opacity: generatingGroups || submissions.length < 3 ? 0.6 : 1 }}
          >
            {generatingGroups ? '🤖 Generating...' : '🤖 Generate Groups with AI'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <StatCard label="Total submissions" value={submissions.length} accent="#856BFF" />
        <StatCard label="Beginner" value={experienceCounts['Beginner'] || 0} accent="#FFB366" />
        <StatCard label="Intermediate" value={experienceCounts['Intermediate'] || 0} accent="#66B3FF" />
        <StatCard label="Advanced" value={experienceCounts['Advanced'] || 0} accent="#66CC66" />
        <StatCard label="Expert" value={experienceCounts['Expert'] || 0} accent="#B366FF" />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6">
        {['responses', 'groups'].map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className="px-5 py-2 rounded-md text-sm font-bold transition-all"
            style={{
              fontFamily: 'Arial, sans-serif',
              backgroundColor: view === tab ? '#140F50' : 'white',
              color: view === tab ? 'white' : '#140F50',
              border: view === tab ? '2px solid #140F50' : '2px solid #E0D9F5',
            }}
          >
            {tab === 'responses' ? `📋 Responses (${submissions.length})` : `🧩 Groups${groups ? ` (${groups.length})` : ''}`}
          </button>
        ))}
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

      {/* ── RESPONSES VIEW ── */}
      {view === 'responses' && !loading && (
        <div>
          {/* Search and filter */}
          <div className="flex flex-wrap gap-3 mb-5">
            <input
              className="au-input flex-1 min-w-48"
              style={{ maxWidth: '320px' }}
              placeholder="Search by name or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="au-input"
              style={{ width: 'auto', cursor: 'pointer' }}
              value={filterExperience}
              onChange={(e) => setFilterExperience(e.target.value)}
            >
              <option value="All">All experience levels</option>
              {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-16" style={{ color: '#9E97C4', fontFamily: 'Georgia, serif' }}>
              {submissions.length === 0 ? 'No submissions yet. Share the form link with students.' : 'No results match your search.'}
            </div>
          )}

          <div className="space-y-3">
            {filteredSubmissions.map((s) => (
              (() => {
                const rowId = s.respondentId || s.fullName;
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
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F0E5FF', color: '#6B00CC', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
                      >
                        {s.preferredRole}
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                      🏭 {s.industryInterest}
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
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.workshop || 'Not provided'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Tools Used</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.aiTools?.join(', ') || 'None selected'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {s.skills?.map((sk) => (
                            <span key={sk} className="tag text-xs">{sk}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.availability?.join(', ')}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Application Interests</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.aiApplicationInterests?.join(', ')}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working style</h4>
                        <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>
                          Deadline approach: {s.deadlineApproach}/5 &nbsp;·&nbsp; Meeting preference: {s.meetingPreference || '–'}/5
                        </p>
                      </div>
                      {s.peerPreference && (
                        <div className="sm:col-span-2">
                          <h4 className="text-xs font-bold mb-2" style={{ fontFamily: 'Arial, sans-serif', color: '#856BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peer preference</h4>
                          <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570' }}>{s.peerPreference}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-4" style={{ color: '#C4BBE8', fontFamily: 'Georgia, serif' }}>
                      Submitted {new Date(s.submittedAt).toLocaleString('en-AU')}
                    </p>
                  </div>
                )}
              </div>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {/* ── GROUPS VIEW ── */}
      {view === 'groups' && !loading && (
        <div>
          {!groups ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif' }}>
                No groups generated yet
              </h3>
              <p className="text-sm mb-6" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                Once students have submitted the survey, click "Generate Groups with AI" to create balanced group suggestions.
              </p>
              <button
                className="au-btn-primary"
                onClick={handleGenerateGroups}
                disabled={generatingGroups || submissions.length < 3}
                style={{ opacity: submissions.length < 3 ? 0.5 : 1 }}
              >
                {generatingGroups ? '🤖 Generating...' : '🤖 Generate Groups with AI'}
              </button>
              {submissions.length < 3 && (
                <p className="text-xs mt-3" style={{ color: '#9E97C4', fontFamily: 'Georgia, serif' }}>
                  Minimum 3 submissions required (currently {submissions.length})
                </p>
              )}
            </div>
          ) : (
            <div>
              {/* Summary banner */}
              <div
                className="p-5 rounded-lg mb-6"
                style={{ backgroundColor: 'rgba(133,107,255,0.08)', border: '1.5px solid rgba(133,107,255,0.25)' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                      AI Grouping Summary
                    </h3>
                    <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#3B3570', lineHeight: '1.6' }}>
                      {groupSummary}
                    </p>
                    {generatedAt && (
                      <p className="text-xs mt-2" style={{ color: '#9E97C4', fontFamily: 'Georgia, serif' }}>
                        Generated {new Date(generatedAt).toLocaleString('en-AU')} · {groups.length} groups suggested
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Flagged considerations */}
              {flaggedItems.length > 0 && (
                <div
                  className="p-4 rounded-lg mb-6"
                  style={{ backgroundColor: '#FFF8E0', border: '1.5px solid #FFD966' }}
                >
                  <h4 className="font-bold mb-2 text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#8A6600' }}>
                    ⚠️ Considerations for your review
                  </h4>
                  <ul className="space-y-1">
                    {flaggedItems.map((item, i) => (
                      <li key={i} className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#8A6600' }}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div
                className="p-3 rounded-md mb-6 text-sm"
                style={{ backgroundColor: '#F0F8FF', border: '1px solid #B3D9FF', color: '#004080', fontFamily: 'Georgia, serif' }}
              >
                📝 These groups are AI-suggested — please review and adjust as needed before publishing to Canvas.
              </div>

              {/* Group cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.groupNumber} className="group-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50', fontSize: '1rem' }}>
                        Group {group.groupNumber}
                      </h3>
                      {group.industryFocus && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: '#F0F8FF', color: '#1449FF', fontFamily: 'Arial, sans-serif' }}
                        >
                          {group.industryFocus}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      {group.members.map((member) => (
                        <div key={`${member.name}-${member.role || member.aiExperience || 'member'}`} className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: '#140F50', color: 'white', fontFamily: 'Arial, sans-serif' }}
                          >
                            {member.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                              {member.name}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <ExperienceBadge level={member.aiExperience} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {group.rationale && (
                      <p className="text-xs mt-3 pt-3 italic" style={{ fontFamily: 'Georgia, serif', color: '#6B6490', borderTop: '1px solid #F0ECF8' }}>
                        {group.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Regenerate button */}
              <div className="mt-6 flex justify-center">
                <button
                  className="au-btn-secondary text-sm"
                  onClick={handleGenerateGroups}
                  disabled={generatingGroups}
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {generatingGroups ? '🤖 Regenerating...' : '↺ Regenerate Groups'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
