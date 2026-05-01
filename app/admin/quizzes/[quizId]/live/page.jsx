'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminLoginCard from '../../../../../components/admin/admin-login-card';
import useAdminPassword from '../../../../../components/admin/use-admin-password';
import AggregateCard from '../../../../../components/quiz/aggregate-card';
import useLiveQuizStream from '../../../../../components/quiz/use-live-quiz-stream';
import { getAggregateForCohort, normaliseTextForSearch } from '../../../../../lib/quiz-core';

const PROJECTOR_COHORTS = ['wednesday', 'friday', 'unspecified'];
const MODERATION_COHORTS = ['all', ...PROJECTOR_COHORTS];

function createModerationState() {
  return {
    search: '',
    cohort: 'all',
    releaseFilter: 'unreleased',
    selectedResponseIds: [],
  };
}

function cohortLabel(cohort, aggregate) {
  const title = cohort.charAt(0).toUpperCase() + cohort.slice(1);
  return `${title} · n=${aggregate?.totalResponses || 0}`;
}

function getModerationState(stateByQuestion, questionId) {
  return stateByQuestion[questionId] || createModerationState();
}

function filterTextResponseQueue(question, state) {
  const search = normaliseTextForSearch(state.search);

  return (question.textResponseQueue || []).filter((entry) => {
    if (state.cohort !== 'all' && entry.cohort !== state.cohort) {
      return false;
    }

    if (state.releaseFilter === 'released' && !entry.isReleased) {
      return false;
    }

    if (state.releaseFilter === 'unreleased' && entry.isReleased) {
      return false;
    }

    if (!search) {
      return true;
    }

    return normaliseTextForSearch(`${entry.keyword} ${entry.text}`).includes(search);
  });
}

function connectionLabel(streamStatus) {
  if (streamStatus === 'live') {
    return 'Live updates connected';
  }

  if (streamStatus === 'polling') {
    return 'Fallback refresh mode';
  }

  if (streamStatus === 'reconnecting') {
    return 'Reconnecting live updates';
  }

  if (streamStatus === 'connecting') {
    return 'Connecting live updates';
  }

  return 'Live updates idle';
}

function FreeTextModerationQueue({
  question,
  state,
  busy,
  onStateChange,
  onToggleSelection,
  onSelectVisible,
  onClearSelection,
  onBulkToggle,
  onSingleToggle,
}) {
  const filteredQueue = filterTextResponseQueue(question, state);
  const selectedSet = new Set(state.selectedResponseIds || []);
  const visibleIds = filteredQueue.map((entry) => entry.responseId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((responseId) => selectedSet.has(responseId));

  return (
    <div className="quiz-panel quiz-panel-soft" style={{ padding: '1rem', marginTop: '0.85rem' }}>
      <div className="quiz-panel-header" style={{ marginBottom: '0.8rem' }}>
        <div>
          <p className="quiz-question-label">Moderation queue</p>
          <h3 className="quiz-question-title" style={{ fontSize: '1.05rem' }}>Search, filter, and batch release free-text responses.</h3>
        </div>
        <div className="quiz-pill-row">
          <span className="quiz-pill quiz-pill-sand">Showing {filteredQueue.length} of {question.textResponseQueue?.length || 0}</span>
          <span className="quiz-pill quiz-pill-blue">Selected {selectedSet.size}</span>
        </div>
      </div>

      <div className="quiz-moderation-toolbar">
        <input
          className="quiz-input"
          value={state.search}
          onChange={(event) => onStateChange({ search: event.target.value, selectedResponseIds: [] })}
          placeholder="Search keyword or text"
        />
        <select
          className="quiz-select"
          value={state.cohort}
          onChange={(event) => onStateChange({ cohort: event.target.value, selectedResponseIds: [] })}
        >
          {MODERATION_COHORTS.map((cohort) => (
            <option key={cohort} value={cohort}>
              {cohort === 'all' ? 'All cohorts' : cohort.charAt(0).toUpperCase() + cohort.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="quiz-select"
          value={state.releaseFilter}
          onChange={(event) => onStateChange({ releaseFilter: event.target.value, selectedResponseIds: [] })}
        >
          <option value="all">All responses</option>
          <option value="unreleased">Unreleased only</option>
          <option value="released">Released only</option>
        </select>
      </div>

      <div className="quiz-button-row" style={{ marginTop: '0.8rem' }}>
        <button
          type="button"
          className="au-btn-secondary"
          onClick={() => onSelectVisible(allVisibleSelected ? [] : visibleIds)}
          disabled={busy || visibleIds.length === 0}
        >
          {allVisibleSelected ? 'Unselect visible' : 'Select visible'}
        </button>
        <button
          type="button"
          className="au-btn-secondary"
          onClick={onClearSelection}
          disabled={busy || selectedSet.size === 0}
        >
          Clear selection
        </button>
        <button
          type="button"
          className="au-btn-primary"
          onClick={() => onBulkToggle(state.selectedResponseIds, true)}
          disabled={busy || state.selectedResponseIds.length === 0}
        >
          {busy ? 'Updating...' : 'Release selected'}
        </button>
        <button
          type="button"
          className="au-btn-secondary"
          onClick={() => onBulkToggle(state.selectedResponseIds, false)}
          disabled={busy || state.selectedResponseIds.length === 0}
        >
          {busy ? 'Updating...' : 'Hide selected'}
        </button>
      </div>

      {filteredQueue.length === 0 ? (
        <div className="quiz-empty-state" style={{ marginTop: '1rem' }}>No text responses match the current filters.</div>
      ) : (
        <div className="quiz-scroll-card" style={{ marginTop: '1rem' }}>
          {filteredQueue.map((entry, index) => (
            <div
              key={entry.responseId}
              className="quiz-moderation-row"
              style={{ paddingTop: index === 0 ? 0 : undefined, borderTop: index === 0 ? '0' : undefined }}
            >
              <input
                type="checkbox"
                className="au-checkbox"
                checked={selectedSet.has(entry.responseId)}
                onChange={() => onToggleSelection(entry.responseId)}
                disabled={busy}
              />
              <div style={{ flex: 1 }}>
                <div className="quiz-pill-row" style={{ marginBottom: '0.45rem' }}>
                  <span className="quiz-pill quiz-pill-navy">{entry.keyword}</span>
                  <span className="quiz-pill quiz-pill-blue">{entry.cohort}</span>
                  <span className={`quiz-pill ${entry.isReleased ? 'quiz-pill-sand' : 'quiz-pill-lavender'}`}>
                    {entry.isReleased ? 'Released' : 'Queued'}
                  </span>
                </div>
                <p className="quiz-muted" style={{ margin: 0 }}>{entry.text}</p>
                <p className="quiz-inline-note">
                  {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString('en-AU') : 'No time recorded'}
                </p>
              </div>
              <button
                type="button"
                className={entry.isReleased ? 'au-btn-secondary' : 'au-btn-primary'}
                onClick={() => onSingleToggle(entry.responseId, !entry.isReleased)}
                disabled={busy}
              >
                {entry.isReleased ? 'Hide' : 'Release'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminQuizLivePage({ params }) {
  const admin = useAdminPassword();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [releasingQuestionId, setReleasingQuestionId] = useState('');
  const [releasingTextKey, setReleasingTextKey] = useState('');
  const [viewMode, setViewMode] = useState('single');
  const [selectedCohort, setSelectedCohort] = useState('wednesday');
  const [moderationState, setModerationState] = useState({});

  const streamStatus = useLiveQuizStream({
    enabled: admin.authenticated,
    url: `/api/quiz/${params.quizId}/events/admin?password=${encodeURIComponent(admin.password)}`,
    fallbackIntervalMs: 12000,
    load: async ({ silent } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const response = await fetch(`/api/quiz/${params.quizId}/aggregate/admin`, {
          headers: admin.getAdminHeaders(),
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load the live projector view.');
        }

        setQuiz(data);
        setError('');
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
  });

  function patchModerationState(questionId, patch) {
    setModerationState((current) => ({
      ...current,
      [questionId]: {
        ...createModerationState(),
        ...(current[questionId] || {}),
        ...patch,
      },
    }));
  }

  function toggleResponseSelection(questionId, responseId) {
    const state = getModerationState(moderationState, questionId);
    const selectedSet = new Set(state.selectedResponseIds || []);

    if (selectedSet.has(responseId)) {
      selectedSet.delete(responseId);
    } else {
      selectedSet.add(responseId);
    }

    patchModerationState(questionId, { selectedResponseIds: [...selectedSet] });
  }

  function setVisibleSelection(questionId, responseIds) {
    patchModerationState(questionId, { selectedResponseIds: responseIds });
  }

  function applyTextReleaseUpdate(question, responseIds, released) {
    const responseIdSet = new Set(responseIds);
    const nextReleasedIds = released
      ? [...new Set([...(question.releasedTextResponseIds || []), ...responseIds])]
      : (question.releasedTextResponseIds || []).filter((entry) => !responseIdSet.has(entry));
    const nextQueue = (question.textResponseQueue || []).map((entry) => (
      responseIdSet.has(entry.responseId) ? { ...entry, isReleased: released } : entry
    ));

    return {
      ...question,
      releasedTextResponseIds: nextReleasedIds,
      textResponseQueue: nextQueue,
      releasedTextResponses: nextQueue.filter((entry) => entry.isReleased),
    };
  }

  async function toggleRelease(questionId, released) {
    setReleasingQuestionId(questionId);
    setError('');

    try {
      const response = await fetch(`/api/admin/quiz/${params.quizId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...admin.getAdminHeaders(),
        },
        body: JSON.stringify({ questionId, released }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to change release status.');
      }

      setQuiz((current) => ({
        ...current,
        releasedQuestionIds: released
          ? [...new Set([...(current?.releasedQuestionIds || []), questionId])]
          : (current?.releasedQuestionIds || []).filter((value) => value !== questionId),
        questions: (current?.questions || []).map((question) => (
          question.questionId === questionId ? { ...question, isReleased: released } : question
        )),
      }));
    } catch (releaseError) {
      setError(releaseError.message);
    } finally {
      setReleasingQuestionId('');
    }
  }

  async function toggleTextRelease(questionId, responseIds, released) {
    const ids = Array.isArray(responseIds) ? responseIds.filter(Boolean) : [responseIds].filter(Boolean);
    if (ids.length === 0) {
      return;
    }

    const releaseKey = `${questionId}:${released ? 'release' : 'hide'}`;
    setReleasingTextKey(releaseKey);
    setError('');

    try {
      const response = await fetch(`/api/admin/quiz/${params.quizId}/text-release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...admin.getAdminHeaders(),
        },
        body: JSON.stringify(
          ids.length === 1
            ? { questionId, responseId: ids[0], released }
            : { questionId, responseIds: ids, released },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to change text release status.');
      }

      setQuiz((current) => ({
        ...current,
        questions: (current?.questions || []).map((question) => {
          if (question.questionId !== questionId) {
            return question;
          }

          return applyTextReleaseUpdate(question, ids, released);
        }),
      }));
      patchModerationState(questionId, { selectedResponseIds: [] });
    } catch (textReleaseError) {
      setError(textReleaseError.message);
    } finally {
      setReleasingTextKey('');
    }
  }

  function renderAggregate(question) {
    if (quiz?.cohort !== 'both') {
      return (
        <AggregateCard
          question={question}
          projector
          showModerationControls={question.type === 'free_text'}
        />
      );
    }

    if (viewMode === 'split') {
      return (
        <div className="quiz-split-grid">
          {['wednesday', 'friday'].map((cohort) => {
            const aggregate = getAggregateForCohort(question.aggregate, cohort);
            return (
              <AggregateCard
                key={`${question.questionId}-${cohort}`}
                question={question}
                projector
                aggregateOverride={aggregate}
                cohortLabel={cohortLabel(cohort, aggregate)}
              />
            );
          })}
        </div>
      );
    }

    const aggregate = getAggregateForCohort(question.aggregate, selectedCohort);
    return (
      <AggregateCard
        question={question}
        projector
        aggregateOverride={aggregate}
        cohortLabel={cohortLabel(selectedCohort, aggregate)}
        showModerationControls={question.type === 'free_text'}
      />
    );
  }

  function renderModerationQueue(question) {
    if (question.type !== 'free_text') {
      return null;
    }

    if (quiz?.cohort === 'both' && viewMode === 'split') {
      return (
        <div className="quiz-note" style={{ marginTop: '0.85rem' }}>
          Switch back to single-cohort view to moderate projector text. Split view is summary-only for free-text.
        </div>
      );
    }

    const state = getModerationState(moderationState, question.questionId);

    return (
      <FreeTextModerationQueue
        question={question}
        state={state}
        busy={releasingTextKey.startsWith(`${question.questionId}:`)}
        onStateChange={(patch) => patchModerationState(question.questionId, patch)}
        onToggleSelection={(responseId) => toggleResponseSelection(question.questionId, responseId)}
        onSelectVisible={(responseIds) => setVisibleSelection(question.questionId, responseIds)}
        onClearSelection={() => patchModerationState(question.questionId, { selectedResponseIds: [] })}
        onBulkToggle={(responseIds, released) => toggleTextRelease(question.questionId, responseIds, released)}
        onSingleToggle={(responseId, released) => toggleTextRelease(question.questionId, responseId, released)}
      />
    );
  }

  if (admin.verifying && !admin.authenticated) {
    return <div className="quiz-empty-state">Checking admin access...</div>;
  }

  if (!admin.authenticated) {
    return (
      <AdminLoginCard
        password={admin.password}
        setPassword={admin.setPassword}
        onLogin={admin.login}
        authError={admin.authError}
        loading={admin.verifying}
        title="Projector view"
        subtitle="Use the existing admin password to open the live projector dashboard."
      />
    );
  }

  return (
    <div className="projector-shell">
      <div className="quiz-panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <p className="quiz-kicker">Projector view</p>
          <h1 className="quiz-title">{quiz?.title || 'Loading live quiz...'}</h1>
          <p className="quiz-subtitle">Designed for the workshop screen. Live updates stream in automatically, released questions appear on the student done page, and free-text stays projector-only with a filterable moderation queue.</p>
        </div>
        <div className="quiz-button-row">
          <Link href={`/admin/quizzes/${params.quizId}`} className="au-btn-secondary" style={{ textDecoration: 'none' }}>Back to quiz</Link>
          <span className="quiz-pill quiz-pill-navy">Status: {quiz?.status || '...'}</span>
          <span className="quiz-pill quiz-pill-sand">Responses: {quiz?.responseCount || 0}</span>
          <span className={`quiz-pill ${streamStatus === 'live' ? 'quiz-pill-blue' : 'quiz-pill-lavender'}`}>{connectionLabel(streamStatus)}</span>
        </div>
      </div>

      {quiz?.cohort === 'both' && (
        <div className="quiz-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="quiz-panel-header" style={{ marginBottom: '0.8rem' }}>
            <div>
              <p className="quiz-question-label">Cohort view</p>
              <h2 className="quiz-question-title" style={{ fontSize: '1.2rem' }}>Switch between the active workshop cohort and the split comparison view.</h2>
            </div>
          </div>
          <div className="quiz-button-row">
            <button type="button" className={viewMode === 'single' ? 'au-btn-primary' : 'au-btn-secondary'} onClick={() => setViewMode('single')}>
              Current cohort only
            </button>
            <button type="button" className={viewMode === 'split' ? 'au-btn-primary' : 'au-btn-secondary'} onClick={() => setViewMode('split')}>
              Show Wednesday and Friday side by side
            </button>
            {viewMode === 'single' && PROJECTOR_COHORTS.map((cohort) => (
              <button
                key={cohort}
                type="button"
                className={selectedCohort === cohort ? 'au-btn-primary' : 'au-btn-secondary'}
                onClick={() => setSelectedCohort(cohort)}
              >
                {cohort.charAt(0).toUpperCase() + cohort.slice(1)}
              </button>
            ))}
          </div>
          {viewMode === 'split' && <p className="quiz-inline-note">Free-text moderation stays in single-cohort view so unreleased text does not appear in both columns at once.</p>}
        </div>
      )}

      {loading && !quiz && <div className="quiz-empty-state">Loading projector data...</div>}
      {error && <div className="quiz-note" style={{ color: '#8a1c12', marginBottom: '1rem' }}>{error}</div>}

      {quiz && quiz.questions.length === 0 && (
        <div className="quiz-panel" style={{ padding: '1.4rem' }}>
          <div className="quiz-empty-state">This quiz has no questions yet.</div>
        </div>
      )}

      <div className="projector-grid" style={quiz?.cohort === 'both' && viewMode === 'split' ? { gridTemplateColumns: '1fr' } : undefined}>
        {(quiz?.questions || []).map((question) => (
          <div key={question.questionId}>
            <div className="quiz-button-row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className={`quiz-pill ${question.type === 'free_text' ? 'quiz-pill-sand' : question.isReleased ? 'quiz-pill-blue' : 'quiz-pill-lavender'}`}>
                {question.type === 'free_text'
                  ? `Projector-only · ${question.releasedTextResponses?.length || 0} released · ${question.textResponseQueue?.length || 0} queued`
                  : question.isReleased
                    ? 'Visible to students'
                    : 'Hidden from students'}
              </span>
              {question.type !== 'free_text' ? (
                <button
                  type="button"
                  className={question.isReleased ? 'au-btn-secondary' : 'au-btn-primary'}
                  onClick={() => toggleRelease(question.questionId, !question.isReleased)}
                  disabled={releasingQuestionId === question.questionId}
                >
                  {releasingQuestionId === question.questionId
                    ? 'Updating...'
                    : question.isReleased
                      ? 'Hide from students'
                      : 'Release to students'}
                </button>
              ) : (
                <span className="quiz-inline-note">
                  {releasingTextKey.startsWith(`${question.questionId}:`) ? 'Updating moderation queue...' : 'Use the moderation queue below to search, filter, and batch release text.'}
                </span>
              )}
            </div>
            {renderAggregate(question)}
            {renderModerationQueue(question)}
          </div>
        ))}
      </div>
    </div>
  );
}