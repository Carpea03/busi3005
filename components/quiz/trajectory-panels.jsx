import { formatPercentage, getAggregateForCohort } from '../../lib/quiz-core.js';

function cohortLabel(cohort) {
  if (!cohort) {
    return 'Room';
  }

  return cohort.charAt(0).toUpperCase() + cohort.slice(1);
}

function describeAggregate(entry) {
  const aggregate = getAggregateForCohort(entry.aggregate, entry.cohort);
  if (!aggregate || !aggregate.totalResponses) {
    return 'No cohort snapshot available yet.';
  }

  const label = entry.aggregate?.byCohort?.[entry.cohort] ? `${cohortLabel(entry.cohort)} session snapshot` : 'Room snapshot';

  if ((entry.questionType === 'single_select' || entry.questionType === 'likert_5') && typeof entry.answerValue === 'string') {
    const count = aggregate.distribution?.counts?.[entry.answerValue] || 0;
    return `${label}: ${count} of ${aggregate.totalResponses} students chose this option (${formatPercentage(count, aggregate.totalResponses)}).`;
  }

  if (entry.questionType === 'multi_select' && Array.isArray(entry.answerValue)) {
    return `${label}: ${aggregate.totalResponses} students answered, averaging ${aggregate.distribution?.averageSelections || 0} selections each.`;
  }

  if (entry.questionType === 'slider') {
    return `${label}: mean ${aggregate.distribution?.mean || 0}, median ${aggregate.distribution?.median || 0}, n=${aggregate.totalResponses}.`;
  }

  if (entry.questionType === 'free_text') {
    return `${label}: ${aggregate.distribution?.count || aggregate.totalResponses} text responses.`;
  }

  return `${label}: ${aggregate.totalResponses} responses recorded.`;
}

export function SpineTrajectoryPanels({ spineQuestions, emptyMessage, title, subtitle }) {
  return (
    <section className="quiz-stack">
      <div>
        <p className="quiz-kicker" style={{ marginBottom: '0.3rem' }}>{title}</p>
        {subtitle && <p className="quiz-subtitle" style={{ marginTop: 0 }}>{subtitle}</p>}
      </div>

      {spineQuestions.length === 0 ? (
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <div className="quiz-empty-state">{emptyMessage}</div>
        </div>
      ) : (
        spineQuestions.map((spineQuestion) => (
          <div key={spineQuestion.questionId} className="quiz-panel" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '0.8rem' }}>
              <div>
                <p className="quiz-question-label">{spineQuestion.questionId}</p>
                <h2 className="quiz-question-title" style={{ fontSize: '1.35rem' }}>{spineQuestion.prompt}</h2>
              </div>
              <div className="quiz-pill-row">
                <span className="quiz-pill quiz-pill-navy">{spineQuestion.questionType?.replace('_', ' ') || 'spine'}</span>
                <span className="quiz-pill quiz-pill-sand">{spineQuestion.entries.length} points</span>
              </div>
            </div>

            <div className="quiz-stack">
              {spineQuestion.entries.map((entry) => (
                <div
                  key={`${spineQuestion.questionId}-${entry.quizId}-${entry.submittedAt}`}
                  className="quiz-panel quiz-panel-soft"
                  style={{ padding: '1rem', borderLeft: '4px solid #140F50' }}
                >
                  <div className="quiz-panel-header" style={{ marginBottom: '0.65rem' }}>
                    <div>
                      <p className="quiz-question-label">Week {entry.weekNumber} · {entry.quizTitle}</p>
                      <h3 className="quiz-question-title" style={{ fontSize: '1.1rem' }}>{entry.answerLabel}</h3>
                    </div>
                    <div className="quiz-pill-row">
                      <span className="quiz-pill quiz-pill-lavender">{entry.cohort}</span>
                    </div>
                  </div>
                  <p className="quiz-muted" style={{ margin: 0 }}>{describeAggregate(entry)}</p>
                  <p className="quiz-inline-note">Frozen at submission time so later workshops do not rewrite this snapshot.</p>
                  <p className="quiz-inline-note">Submitted {new Date(entry.submittedAt).toLocaleString('en-AU')}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function QuizTimelinePanels({ timeline, emptyMessage }) {
  return (
    <section className="quiz-stack">
      <div>
        <p className="quiz-kicker" style={{ marginBottom: '0.3rem' }}>Across all quizzes</p>
        <p className="quiz-subtitle" style={{ marginTop: 0 }}>Every response is grouped by quiz so Alex can review the full sequence, not just the spine.</p>
      </div>

      {timeline.length === 0 ? (
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <div className="quiz-empty-state">{emptyMessage}</div>
        </div>
      ) : (
        timeline.map((item) => (
          <div key={`${item.quizId}-${item.submittedAt}`} className="quiz-panel" style={{ padding: '1.25rem' }}>
            <div className="quiz-panel-header" style={{ marginBottom: '0.75rem' }}>
              <div>
                <p className="quiz-question-label">Week {item.weekNumber}</p>
                <h2 className="quiz-question-title" style={{ fontSize: '1.25rem' }}>{item.quizTitle}</h2>
              </div>
              <div className="quiz-pill-row">
                <span className="quiz-pill quiz-pill-blue">{item.cohort}</span>
              </div>
            </div>

            <div className="quiz-stack">
              {item.answers.map((answer) => (
                <div key={`${item.quizId}-${answer.questionId}`} style={{ borderTop: '1px solid #EEE7FB', paddingTop: '0.8rem' }}>
                  <p className="quiz-question-label" style={{ marginBottom: '0.2rem' }}>{answer.questionId}</p>
                  <h3 className="quiz-question-title" style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{answer.prompt}</h3>
                  <p className="quiz-muted" style={{ margin: 0 }}>{answer.answerLabel}</p>
                </div>
              ))}
            </div>

            <p className="quiz-inline-note">Submitted {new Date(item.submittedAt).toLocaleString('en-AU')}</p>
          </div>
        ))
      )}
    </section>
  );
}

export function FreeTextPanels({ freeTextResponses, emptyMessage, title = 'Free-text responses', subtitle }) {
  return (
    <section className="quiz-stack">
      <div>
        <p className="quiz-kicker" style={{ marginBottom: '0.3rem' }}>{title}</p>
        {subtitle && <p className="quiz-subtitle" style={{ marginTop: 0 }}>{subtitle}</p>}
      </div>

      {freeTextResponses.length === 0 ? (
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <div className="quiz-empty-state">{emptyMessage}</div>
        </div>
      ) : (
        <div className="quiz-stack">
          {freeTextResponses.map((entry) => (
            <div key={`${entry.quizId}-${entry.questionId}-${entry.submittedAt}`} className="quiz-panel quiz-panel-soft" style={{ padding: '1rem' }}>
              <p className="quiz-question-label">Week {entry.weekNumber} · {entry.quizTitle}</p>
              <h3 className="quiz-question-title" style={{ fontSize: '1rem', marginBottom: '0.45rem' }}>{entry.prompt}</h3>
              <p className="quiz-muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.value}</p>
              <p className="quiz-inline-note">Submitted {new Date(entry.submittedAt).toLocaleString('en-AU')}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}