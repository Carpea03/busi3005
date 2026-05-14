import Link from 'next/link';

export const metadata = {
  title: 'BUSI3005 — AI for Business Transformation',
  description: 'Adelaide University · Course hub for BUSI3005 AI for Business Transformation.',
};

const CARDS = [
  {
    title: 'Group formation',
    subtitle: 'Assignment 2 — AI Side Hustle Launch',
    body: 'Tell us whether you’re going solo, in a pair, or in a trio for Assignment 2. We use your answers to confirm group rosters in the Week 4 workshop.',
    href: '/group-formation',
    cta: 'Open the form',
  },
  {
    title: 'Workshop quizzes',
    subtitle: 'Live polls during weekly workshops',
    body: 'Baseline and reflect polls run every workshop. The lecturer opens each quiz on the day. Recovery codes let you return on a different device.',
    href: '/quiz',
    cta: 'Open quizzes',
  },
  {
    title: 'Lecturer dashboard',
    subtitle: 'Admin only',
    body: 'Manage quiz schedules, monitor live aggregates, drill down into student responses, and export data.',
    href: '/admin',
    cta: 'Lecturer sign in',
  },
];

export default function CourseHub() {
  return (
    <div className="quiz-shell">
      <header style={{ marginBottom: '2.5rem' }}>
        <p className="quiz-kicker">Adelaide University · Bachelor of Business</p>
        <h1 className="quiz-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)' }}>
          BUSI3005 — AI for Business Transformation
        </h1>
        <p className="quiz-subtitle" style={{ maxWidth: '46rem', marginTop: '0.5rem' }}>
          This is the course hub. Pick the section you need below. All data collected here is for teaching purposes only.
        </p>
      </header>

      <div className="quiz-grid quiz-grid-2">
        {CARDS.map((card) => (
          <article key={card.href} className="quiz-panel quiz-panel-soft" style={{ padding: '1.5rem' }}>
            <p className="quiz-kicker" style={{ marginBottom: '0.25rem' }}>{card.subtitle}</p>
            <h2 className="quiz-question-title" style={{ fontSize: '1.4rem', marginBottom: '0.6rem' }}>{card.title}</h2>
            <p className="quiz-subtitle" style={{ fontSize: '0.95rem', marginBottom: '1.2rem' }}>{card.body}</p>
            <Link href={card.href} className="au-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <footer style={{ marginTop: '3rem', fontSize: '0.85rem', color: '#6B6490', textAlign: 'center' }}>
        Adelaide University · Semester 2 2026
      </footer>
    </div>
  );
}
