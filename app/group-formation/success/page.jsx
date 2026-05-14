import Link from 'next/link';

export const metadata = {
  title: 'Submission received · BUSI3005',
};

export default function GroupFormationSuccessPage({ searchParams }) {
  const recoveryCode = typeof searchParams?.code === 'string' ? searchParams.code : '';

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero">
        <p className="quiz-kicker">Assignment 2 — AI Side Hustle Launch</p>
        <h1 className="quiz-title">Submission received</h1>
        <p className="quiz-subtitle">
          Thank you. Your group-formation response is saved. We will confirm rosters in the Week 4
          workshop.
        </p>
      </div>

      {recoveryCode && (
        <div
          className="card"
          style={{ marginBottom: '1.25rem', border: '2px solid #856BFF', background: 'rgba(133,107,255,0.06)' }}
        >
          <p className="quiz-kicker" style={{ margin: 0 }}>Save this — your recovery code</p>
          <p
            style={{
              fontFamily: 'Menlo, Consolas, monospace',
              fontSize: '1.6rem',
              fontWeight: 'bold',
              color: '#140F50',
              letterSpacing: '0.08em',
              margin: '0.5rem 0',
            }}
          >
            {recoveryCode}
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem', color: '#3B3570', margin: 0 }}>
            Use this code on the “Match me” page to see your suggested classmates, refresh them, or
            switch to solo. Screenshot it or write it down — we don’t store it against your email.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link
              href={`/group-formation/matches?code=${encodeURIComponent(recoveryCode)}`}
              className="au-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              View my matches →
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link
          href="/"
          className="au-btn-secondary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Course hub
        </Link>
        <Link
          href="/group-formation"
          className="au-btn-secondary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Update your response
        </Link>
      </div>
    </div>
  );
}
