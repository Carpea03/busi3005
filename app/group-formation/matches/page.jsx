'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function StatusBanner({ status, confirmedGroup }) {
  if (status === 'confirmed') {
    return (
      <div className="card" style={{ background: 'rgba(102,204,102,0.08)', border: '1.5px solid rgba(102,204,102,0.4)' }}>
        <p className="quiz-kicker" style={{ margin: 0 }}>Group confirmed</p>
        <p style={{ fontFamily: 'Georgia, serif', color: '#140F50', marginTop: '0.4rem', marginBottom: 0 }}>
          You and {confirmedGroup.join(', ')}. The lecturer will cross-check rosters in the Week 4 workshop.
        </p>
      </div>
    );
  }
  if (status === 'solo') {
    return (
      <div className="card" style={{ background: 'rgba(20,73,255,0.05)', border: '1.5px solid rgba(20,73,255,0.2)' }}>
        <p className="quiz-kicker" style={{ margin: 0 }}>Going solo</p>
        <p style={{ fontFamily: 'Georgia, serif', color: '#140F50', marginTop: '0.4rem', marginBottom: 0 }}>
          You’ve switched to solo. You can switch back to matchmaking at any time below.
        </p>
      </div>
    );
  }
  return null;
}

export default function MatchesPageWrapper() {
  return (
    <Suspense fallback={<div className="quiz-shell quiz-shell-narrow"><p className="quiz-subtitle">Loading…</p></div>}>
      <MatchesPage />
    </Suspense>
  );
}

function MatchesPage() {
  const params = useSearchParams();
  const initialCode = params?.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [self, setSelf] = useState(null);
  const [matches, setMatches] = useState([]);

  const [confirmInputs, setConfirmInputs] = useState(['', '']);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async (rawCode) => {
    if (!rawCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/group-formation/matches?code=${encodeURIComponent(rawCode)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load matches.');
        setLoaded(false);
        return;
      }
      setSelf(data.self);
      setMatches(data.matches || []);
      setLoaded(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) load(initialCode);
  }, [initialCode, load]);

  const handleLookup = (e) => {
    e?.preventDefault?.();
    load(code);
  };

  const sendAction = async (action, extra = {}) => {
    setActionBusy(true);
    try {
      const res = await fetch('/api/group-formation/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not update.');
        return;
      }
      await load(code);
      if (action === 'confirm') setConfirmInputs(['', '']);
    } catch {
      alert('Network error.');
    } finally {
      setActionBusy(false);
    }
  };

  if (!loaded) {
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-hero">
          <p className="quiz-kicker">Assignment 2 — Match me</p>
          <h1 className="quiz-title">Open your suggestions</h1>
          <p className="quiz-subtitle">
            Enter the recovery code you saw after submitting. It looks like <code>abcd-1234-wxyz</code>.
          </p>
        </div>

        <form className="card" onSubmit={handleLookup}>
          <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
            Recovery code
          </label>
          <input
            className="au-input"
            type="text"
            placeholder="abcd-1234-wxyz"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="mt-4 flex gap-3 flex-wrap">
            <button type="submit" className="au-btn-primary" disabled={loading || !code.trim()}>
              {loading ? 'Looking up…' : 'Open my suggestions →'}
            </button>
            <Link
              href="/group-formation"
              className="au-btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Back to the form
            </Link>
          </div>
        </form>
      </div>
    );
  }

  const isSeeking = self?.matchStatus === 'seeking';
  const isConfirmed = self?.matchStatus === 'confirmed';
  const isSolo = self?.matchStatus === 'solo';

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero">
        <p className="quiz-kicker">Assignment 2 — Match me · {self?.workshop}</p>
        <h1 className="quiz-title">Hello {self?.fullName?.split(/\s+/)[0] || ''}</h1>
        <p className="quiz-subtitle">
          {isSeeking && 'Up to five classmates we think might be a good fit. Reach out by email — the first useful conversation usually settles it.'}
          {isConfirmed && 'Your group is locked in. Keep this page bookmarked in case you need to make a change.'}
          {isSolo && 'You’re marked solo. You can switch back to matchmaking if circumstances change.'}
        </p>
      </div>

      <StatusBanner status={self?.matchStatus} confirmedGroup={self?.confirmedGroup || []} />

      {isSeeking && (
        <>
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-lg" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', margin: 0 }}>
                Suggested classmates
              </h2>
              <button
                type="button"
                className="au-btn-secondary text-sm"
                onClick={() => load(code)}
                disabled={loading}
                style={{ padding: '0.4rem 0.9rem' }}
              >
                {loading ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>

            {matches.length === 0 && (
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#6B6490' }}>
                No matches yet — check back once more classmates have submitted with “Match me”.
              </p>
            )}

            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.respondentId}
                  className="p-4 rounded-md"
                  style={{ border: '1.5px solid #E0D9F5', background: 'white' }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: 'Arial, sans-serif', color: '#140F50', fontWeight: 'bold' }}>
                          {m.firstName}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F0E5FF', color: '#6B00CC', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}
                        >
                          {m.aiExperience}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#3B3570', fontFamily: 'Georgia, serif' }}>
                        {m.rationale}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                        Hustle direction: {m.hustleDirection || '—'}
                        {m.hustleConcept ? ` · “${m.hustleConcept}”` : ''}
                      </p>
                    </div>
                    <a
                      href={`mailto:${m.email}?subject=BUSI3005%20Assignment%202%20%E2%80%94%20group?`}
                      className="au-btn-primary text-sm"
                      style={{ textDecoration: 'none', padding: '0.4rem 0.9rem', whiteSpace: 'nowrap' }}
                    >
                      Email {m.firstName}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 className="text-lg mb-2" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
              Found your people?
            </h2>
            <p className="text-sm mb-3" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              List the 1–2 other members by full name. They each need to have submitted a form too.
            </p>
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <input
                  key={i}
                  className="au-input"
                  type="text"
                  placeholder={i === 0 ? 'e.g. Jordan Lee' : 'Optional — third member'}
                  value={confirmInputs[i]}
                  onChange={(e) => {
                    const next = [...confirmInputs];
                    next[i] = e.target.value;
                    setConfirmInputs(next);
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-3 flex-wrap">
              <button
                type="button"
                className="au-btn-primary text-sm"
                disabled={actionBusy || !confirmInputs.some((s) => s.trim())}
                onClick={() => sendAction('confirm', { members: confirmInputs.map((s) => s.trim()).filter(Boolean) })}
              >
                Confirm group ✓
              </button>
              <button
                type="button"
                className="au-btn-secondary text-sm"
                disabled={actionBusy}
                onClick={() => {
                  if (confirm('Switch to solo? You can flip back to matchmaking later.')) {
                    sendAction('switch-to-solo');
                  }
                }}
              >
                Couldn’t find a group → switch to solo
              </button>
            </div>
          </div>
        </>
      )}

      {(isConfirmed || isSolo) && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="text-sm mb-3" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            Need to undo this and look at suggestions again?
          </p>
          <button
            type="button"
            className="au-btn-secondary text-sm"
            disabled={actionBusy}
            onClick={() => sendAction('reset')}
          >
            ↺ Back to matchmaking
          </button>
        </div>
      )}

      <p className="text-center text-xs mt-6" style={{ fontFamily: 'Georgia, serif', color: '#9E97C4' }}>
        Recovery code: <code>{self?.recoveryCode}</code>
      </p>
    </div>
  );
}
