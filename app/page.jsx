import Link from 'next/link';

export const metadata = {
  title: 'BUSI3005 — AI for Business Transformation',
  description: 'Adelaide University · Course hub for BUSI3005 AI for Business Transformation.',
};

export default function CourseHub() {
  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero">
        <p className="quiz-kicker">Adelaide University · Bachelor of Business</p>
        <h1 className="quiz-title">BUSI3005 — AI for Business Transformation</h1>
        <p className="quiz-subtitle">
          The course hub. Data collected here is for teaching purposes only.
        </p>
      </div>

      <article className="quiz-panel" style={{ padding: '1.75rem' }}>
        <p className="quiz-kicker" style={{ margin: 0 }}>This week’s workshop</p>
        <h2 className="quiz-question-title" style={{ fontSize: '1.6rem', margin: '0.5rem 0 0.65rem' }}>
          Workshop quizzes
        </h2>
        <p className="quiz-subtitle" style={{ margin: '0 0 1.25rem', maxWidth: '36rem' }}>
          Baseline and reflect polls run every workshop. The lecturer opens each quiz on the day —
          your keyword keeps your answers connected across the semester.
        </p>
        <Link
          href="/quiz"
          className="au-btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Open quizzes
        </Link>
      </article>

      <aside
        style={{
          marginTop: '1.25rem',
          padding: '1.1rem 1.25rem',
          border: '1px solid var(--au-line)',
          borderRadius: '0.85rem',
          background: 'rgba(255, 255, 255, 0.55)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="quiz-kicker" style={{ margin: 0 }}>Assignment 2 · One-off</p>
          <p
            style={{
              margin: '0.2rem 0 0',
              color: 'var(--au-navy)',
              fontFamily: 'Georgia, serif',
              fontSize: '0.98rem',
            }}
          >
            Group formation — solo, pair, or trio for the AI Side Hustle Launch.
          </p>
        </div>
        <Link
          href="/group-formation"
          className="au-btn-secondary"
          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Open the form
        </Link>
      </aside>

      <footer
        style={{
          marginTop: '3rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--au-line)',
          fontSize: '0.82rem',
          color: '#8b85a6',
          fontFamily: 'Georgia, serif',
        }}
      >
        Adelaide University · Semester 1 2027
      </footer>
    </div>
  );
}
