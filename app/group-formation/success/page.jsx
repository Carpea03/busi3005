import Link from 'next/link';

export const metadata = {
  title: 'Submission received · BUSI3005',
};

export default function GroupFormationSuccessPage() {
  return (
    <div style={{ maxWidth: '42rem', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1 style={{ color: '#140F50', marginBottom: '0.75rem' }}>Submission received</h1>
      <p style={{ color: '#3B3570', marginBottom: '1.5rem' }}>
        Thank you. Your group-formation response is saved. We will confirm rosters in the Week 4 workshop.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Course hub</Link>
        <Link href="/group-formation" className="au-btn-secondary" style={{ textDecoration: 'none' }}>Update your response</Link>
      </div>
    </div>
  );
}
