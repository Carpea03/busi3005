'use client';

export default function AdminLoginCard({ password, setPassword, onLogin, authError, loading, title, subtitle }) {
  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-panel" style={{ padding: '1.5rem' }}>
        <p className="quiz-kicker">Lecturer access</p>
        <h1 className="quiz-question-title" style={{ fontSize: '1.9rem' }}>{title}</h1>
        <p className="quiz-subtitle" style={{ marginTop: '0.55rem' }}>{subtitle}</p>
        <div className="quiz-stack" style={{ marginTop: '1.25rem' }}>
          <input
            type="password"
            className="quiz-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onLogin();
              }
            }}
            placeholder="Enter admin password"
          />
          {authError && <p className="quiz-error">{authError}</p>}
          <div className="quiz-button-row">
            <button type="button" className="au-btn-primary" onClick={() => void onLogin()} disabled={loading || !password}>
              {loading ? 'Checking...' : 'Enter lecturer view'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}