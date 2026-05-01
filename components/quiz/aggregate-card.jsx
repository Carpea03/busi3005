import { formatPercentage } from '../../lib/quiz-core';

function cohortDisplayLabel(cohortLabel) {
  if (!cohortLabel) {
    return null;
  }

  return <span className="quiz-pill quiz-pill-blue">{cohortLabel}</span>;
}

function StatRow({ label, value }) {
  return <span className="quiz-stat-chip">{label}: {value}</span>;
}

function HorizontalBars({ question, aggregate, projector }) {
  const counts = aggregate?.distribution?.counts || {};
  const total = aggregate?.totalResponses || 0;

  return (
    <div className="quiz-bar-stack">
      {(question.options || []).map((option) => {
        const count = counts[option.value] || 0;
        const width = total ? `${(count / total) * 100}%` : '0%';

        return (
          <div key={option.value} className="quiz-bar-row">
            <div className="quiz-bar-heading">
              <span>{option.label}</span>
              <span>{count} · {formatPercentage(count, total)}</span>
            </div>
            <div className="quiz-bar-track">
              <div className="quiz-bar-fill" style={{ width }} />
            </div>
          </div>
        );
      })}

      {question.type === 'multi_select' && (
        <p className="quiz-inline-note">
          Students selected {aggregate?.distribution?.averageSelections || 0} options on average.
        </p>
      )}

      {!total && <div className="quiz-empty-state">Waiting for responses.</div>}
    </div>
  );
}

function SliderHistogram({ aggregate }) {
  const buckets = aggregate?.distribution?.buckets || [];
  const peak = Math.max(...buckets.map((bucket) => bucket.count), 0);

  if (!aggregate?.totalResponses) {
    return <div className="quiz-empty-state">Waiting for slider responses.</div>;
  }

  return (
    <div>
      <div className="quiz-bar-stack">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="quiz-bar-row">
            <div className="quiz-bar-heading">
              <span>{bucket.label}</span>
              <span>{bucket.count}</span>
            </div>
            <div className="quiz-bar-track">
              <div className="quiz-bar-fill" style={{ width: peak ? `${(bucket.count / peak) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="quiz-stat-row">
        <StatRow label="Mean" value={aggregate.distribution.mean} />
        <StatRow label="Median" value={aggregate.distribution.median} />
        <StatRow label="Std dev" value={aggregate.distribution.stddev} />
      </div>
    </div>
  );
}

function FreeTextSummary({
  aggregate,
  showSamples,
  releasedTextResponses = [],
  textResponseQueue = [],
  showModerationControls = false,
}) {
  const count = aggregate?.distribution?.count || 0;
  const sample = aggregate?.distribution?.sample || [];

  return (
    <div>
      <div className="quiz-stat-row" style={{ marginTop: 0 }}>
        <StatRow label="Responses" value={count} />
        <StatRow label="Released" value={releasedResponses.length} />
        {showModerationControls && <StatRow label="Queued" value={textResponseQueue.length} />}
      </div>

      {releasedResponses.length > 0 && (
        <div className="quiz-scroll-card" style={{ marginTop: '0.9rem' }}>
          {releasedResponses.map((entry, index) => (
            <div key={entry.responseId} className="quiz-text-release-row" style={{ paddingTop: index === 0 ? 0 : undefined, borderTop: index === 0 ? '0' : undefined }}>
              <div style={{ flex: 1 }}>
                <p className="quiz-muted" style={{ margin: 0 }}>{entry.text}</p>
                <p className="quiz-inline-note">{entry.cohort} · {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString('en-AU') : 'No time recorded'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModerationControls ? (
        <p className="quiz-inline-note" style={{ marginTop: '0.9rem' }}>
          Use the moderation queue below to search, filter, and batch release projector text. Released entries stay visible even after newer responses arrive.
        </p>
      ) : (
        showSamples ? (
          <div className="quiz-scroll-card" style={{ marginTop: '0.9rem' }}>
            {sample.length === 0 ? (
              <p className="quiz-muted" style={{ margin: 0 }}>No text samples available yet.</p>
            ) : (
              sample.map((entry, index) => (
                <p key={`${entry}-${index}`} className="quiz-muted" style={{ margin: index === 0 ? 0 : '0.8rem 0 0' }}>
                  {entry}
                </p>
              ))
            )}
          </div>
        ) : (
          releasedResponses.length === 0 && (
            <p className="quiz-inline-note" style={{ marginTop: '0.9rem' }}>
              Free-text stays projector-only and each response must be released individually.
            </p>
          )
        )
      )}
    </div>
  );
}

export default function AggregateCard({
  question,
  projector = false,
  showTextSamples = false,
  aggregateOverride = null,
  cohortLabel = '',
  showModerationControls = false,
}) {
  const aggregate = aggregateOverride || question.aggregate || {};
  const headerLabel = question.type === 'free_text'
    ? 'Projector moderation'
    : question.isReleased
      ? 'Released to students'
      : 'Private to Alex';

  return (
    <div className={`quiz-panel quiz-panel-soft ${projector ? 'quiz-panel-projector projector-card' : ''}`} style={{ padding: projector ? undefined : '1.2rem' }}>
      <div className="quiz-panel-header">
        <div>
          <p className="quiz-question-label">{headerLabel}</p>
          <h3 className="quiz-question-title">{question.prompt}</h3>
          {question.helpText && <p className="quiz-question-help">{question.helpText}</p>}
        </div>
        <div className="quiz-pill-row">
          <span className="quiz-pill quiz-pill-navy">{question.type.replace('_', ' ')}</span>
          {cohortDisplayLabel(cohortLabel)}
          <span className="quiz-pill quiz-pill-sand">n = {aggregate.totalResponses || 0}</span>
        </div>
      </div>

      {(question.type === 'single_select' || question.type === 'likert_5' || question.type === 'multi_select') && (
        <HorizontalBars question={question} aggregate={aggregate} projector={projector} />
      )}

      {question.type === 'slider' && <SliderHistogram aggregate={aggregate} />}

      {question.type === 'free_text' && (
        <FreeTextSummary
          aggregate={aggregate}
          showSamples={showTextSamples}
          releasedTextResponses={question.releasedTextResponses}
          textResponseQueue={question.textResponseQueue}
          showModerationControls={showModerationControls}
        />
      )}
    </div>
  );
}