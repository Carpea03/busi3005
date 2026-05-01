'use client';

import { useEffect, useMemo, useState } from 'react';
import { normalizeQuestionId } from '../../lib/quiz-core';

const QUESTION_TYPE_OPTIONS = [
  { value: 'single_select', label: 'Single select' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'likert_5', label: 'Likert 1-5' },
  { value: 'slider', label: 'Slider' },
  { value: 'free_text', label: 'Free text' },
];

function defaultOptions(type) {
  if (type === 'likert_5') {
    return [
      { value: '1', label: 'Strongly disagree' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: 'Strongly agree' },
    ];
  }

  return [
    { value: 'option-a', label: 'Option A' },
    { value: 'option-b', label: 'Option B' },
    { value: 'option-c', label: 'Option C' },
  ];
}

function createQuestion(type = 'single_select', index = 0) {
  return {
    questionId: `question-${index + 1}`,
    type,
    prompt: '',
    helpText: '',
    options: type === 'slider' || type === 'free_text' ? [] : defaultOptions(type),
    sliderConfig: type === 'slider'
      ? { min: 0, max: 100, step: 1, labelMin: 'Lower', labelMax: 'Higher' }
      : { min: 0, max: 100, step: 1, labelMin: 'Lower', labelMax: 'Higher' },
    freeTextConfig: type === 'free_text'
      ? { minWords: 0, maxWords: 120, placeholder: 'Write a short answer...' }
      : { minWords: 0, maxWords: 120, placeholder: 'Write a short answer...' },
    isSpine: false,
  };
}

function normalizeEditorQuestion(question, index) {
  return {
    questionId: question.questionId || `question-${index + 1}`,
    type: question.type || 'single_select',
    prompt: question.prompt || '',
    helpText: question.helpText || '',
    options: question.options?.length ? question.options : (question.type === 'slider' || question.type === 'free_text' ? [] : defaultOptions(question.type || 'single_select')),
    sliderConfig: question.sliderConfig || { min: 0, max: 100, step: 1, labelMin: 'Lower', labelMax: 'Higher' },
    freeTextConfig: question.freeTextConfig || { minWords: 0, maxWords: 120, placeholder: 'Write a short answer...' },
    isSpine: Boolean(question.isSpine),
  };
}

function normalizeFormState(quiz) {
  return {
    title: quiz?.title || '',
    weekNumber: quiz?.weekNumber || 9,
    cohort: quiz?.cohort || 'both',
    questions: (quiz?.questions?.length ? quiz.questions : [createQuestion()]).map(normalizeEditorQuestion),
  };
}

export default function QuizEditor({
  initialQuiz,
  existingSpineQuestionIds = [],
  onSubmit,
  saving,
  error,
  locked = false,
  saveLabel,
}) {
  const [form, setForm] = useState(() => normalizeFormState(initialQuiz));

  useEffect(() => {
    setForm(normalizeFormState(initialQuiz));
  }, [initialQuiz]);

  const spineSuggestions = useMemo(
    () => [...new Set(existingSpineQuestionIds.map((value) => normalizeQuestionId(value)).filter(Boolean))],
    [existingSpineQuestionIds],
  );

  function patchQuestion(index, updater) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => {
        if (questionIndex !== index) return question;
        return typeof updater === 'function' ? updater(question) : { ...question, ...updater };
      }),
    }));
  }

  function addQuestion(type) {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, createQuestion(type, current.questions.length)],
    }));
  }

  function removeQuestion(index) {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
  }

  function moveQuestion(index, direction) {
    setForm((current) => {
      const nextQuestions = [...current.questions];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextQuestions.length) {
        return current;
      }
      const [movedQuestion] = nextQuestions.splice(index, 1);
      nextQuestions.splice(targetIndex, 0, movedQuestion);
      return { ...current, questions: nextQuestions };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      ...form,
      weekNumber: Number(form.weekNumber),
      questions: form.questions.map((question) => ({
        questionId: question.questionId,
        type: question.type,
        prompt: question.prompt,
        helpText: question.helpText,
        options: question.options,
        sliderConfig: question.sliderConfig,
        freeTextConfig: question.freeTextConfig,
        isSpine: question.isSpine,
      })),
    });
  }

  return (
    <form className="quiz-stack" onSubmit={handleSubmit}>
      <div className="quiz-grid quiz-grid-2">
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <label className="quiz-question-label" htmlFor="quiz-title">Quiz title</label>
          <input
            id="quiz-title"
            className="quiz-input"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            disabled={locked}
          />
        </div>
        <div className="quiz-panel" style={{ padding: '1.25rem' }}>
          <div className="quiz-grid quiz-grid-2">
            <div>
              <label className="quiz-question-label" htmlFor="quiz-week">Week number</label>
              <input
                id="quiz-week"
                type="number"
                min="1"
                max="52"
                className="quiz-input"
                value={form.weekNumber}
                onChange={(event) => setForm((current) => ({ ...current, weekNumber: event.target.value }))}
                disabled={locked}
              />
            </div>
            <div>
              <label className="quiz-question-label" htmlFor="quiz-cohort">Quiz cohort</label>
              <select
                id="quiz-cohort"
                className="quiz-select"
                value={form.cohort}
                onChange={(event) => setForm((current) => ({ ...current, cohort: event.target.value }))}
                disabled={locked}
              >
                <option value="both">Both workshops</option>
                <option value="wednesday">Wednesday only</option>
                <option value="friday">Friday only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {locked && (
        <div className="quiz-note">
          This quiz already has responses, so its structure is locked. Use the status controls for opening or closing, and create a new quiz if the questions need to change.
        </div>
      )}

      {form.questions.map((question, index) => (
        <div key={`${question.questionId}-${index}`} className="quiz-panel" style={{ padding: '1.3rem' }}>
          <div className="quiz-panel-header">
            <div>
              <p className="quiz-question-label">Question {index + 1}</p>
              <h2 className="quiz-question-title" style={{ fontSize: '1.35rem' }}>{question.prompt || 'Untitled question'}</h2>
            </div>
            <div className="quiz-button-row">
              <button type="button" className="au-btn-secondary" onClick={() => moveQuestion(index, -1)} disabled={locked || index === 0}>Up</button>
              <button type="button" className="au-btn-secondary" onClick={() => moveQuestion(index, 1)} disabled={locked || index === form.questions.length - 1}>Down</button>
              <button type="button" className="au-btn-secondary" onClick={() => removeQuestion(index)} disabled={locked || form.questions.length === 1}>Remove</button>
            </div>
          </div>

          <div className="quiz-grid quiz-grid-2">
            <div>
              <label className="quiz-question-label">Question type</label>
              <select
                className="quiz-select"
                value={question.type}
                onChange={(event) => {
                  const nextType = event.target.value;
                  patchQuestion(index, {
                    ...question,
                    type: nextType,
                    options: nextType === 'slider' || nextType === 'free_text' ? [] : defaultOptions(nextType),
                  });
                }}
                disabled={locked}
              >
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="quiz-question-label">Question ID</label>
              <input
                className="quiz-input"
                value={question.questionId}
                list={question.isSpine ? `spine-question-ids-${index}` : undefined}
                onChange={(event) => patchQuestion(index, { questionId: event.target.value })}
                disabled={locked}
              />
              {question.isSpine && (
                <>
                  <datalist id={`spine-question-ids-${index}`}>
                    {spineSuggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                  <p className="quiz-inline-note">Reuse an existing spine ID where appropriate to keep the trajectory stable.</p>
                </>
              )}
            </div>
          </div>

          <div className="quiz-stack" style={{ marginTop: '1rem' }}>
            <div>
              <label className="quiz-question-label">Prompt</label>
              <textarea
                className="quiz-textarea"
                value={question.prompt}
                onChange={(event) => {
                  const nextPrompt = event.target.value;
                  patchQuestion(index, (currentQuestion) => ({
                    ...currentQuestion,
                    prompt: nextPrompt,
                    questionId: currentQuestion.questionId.startsWith('question-') || !currentQuestion.questionId
                      ? normalizeQuestionId(nextPrompt) || currentQuestion.questionId
                      : currentQuestion.questionId,
                  }));
                }}
                disabled={locked}
              />
            </div>

            <div>
              <label className="quiz-question-label">Help text</label>
              <input
                className="quiz-input"
                value={question.helpText}
                onChange={(event) => patchQuestion(index, { helpText: event.target.value })}
                disabled={locked}
              />
            </div>

            <label className={`quiz-option-card${question.isSpine ? ' is-selected' : ''}`} style={{ cursor: locked ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                className="au-checkbox"
                checked={question.isSpine}
                onChange={(event) => patchQuestion(index, { isSpine: event.target.checked })}
                disabled={locked}
              />
              <span>Part of the longitudinal spine</span>
            </label>
          </div>

          {(question.type === 'single_select' || question.type === 'multi_select' || question.type === 'likert_5') && (
            <div className="quiz-stack" style={{ marginTop: '1rem' }}>
              <div className="quiz-panel-header" style={{ marginBottom: '0.6rem' }}>
                <h3 className="quiz-question-title" style={{ fontSize: '1.1rem' }}>Options</h3>
                <button type="button" className="au-btn-secondary" onClick={() => patchQuestion(index, { options: [...question.options, { value: `option-${question.options.length + 1}`, label: `Option ${question.options.length + 1}` }] })} disabled={locked || question.type === 'likert_5'}>
                  Add option
                </button>
              </div>

              {question.options.map((option, optionIndex) => (
                <div key={`${option.value}-${optionIndex}`} className="quiz-grid quiz-grid-2">
                  <input
                    className="quiz-input"
                    value={option.label}
                    onChange={(event) => patchQuestion(index, {
                      options: question.options.map((entry, entryIndex) => (
                        entryIndex === optionIndex ? { ...entry, label: event.target.value } : entry
                      )),
                    })}
                    placeholder="Option label"
                    disabled={locked}
                  />
                  <div className="quiz-button-row">
                    <input
                      className="quiz-input"
                      value={option.value}
                      onChange={(event) => patchQuestion(index, {
                        options: question.options.map((entry, entryIndex) => (
                          entryIndex === optionIndex ? { ...entry, value: event.target.value } : entry
                        )),
                      })}
                      placeholder="option-value"
                      disabled={locked}
                    />
                    {question.type !== 'likert_5' && (
                      <button
                        type="button"
                        className="au-btn-secondary"
                        onClick={() => patchQuestion(index, { options: question.options.filter((_, entryIndex) => entryIndex !== optionIndex) })}
                        disabled={locked || question.options.length <= 2}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {question.type === 'slider' && (
            <div className="quiz-grid quiz-grid-2" style={{ marginTop: '1rem' }}>
              {['min', 'max', 'step', 'labelMin', 'labelMax'].map((field) => (
                <div key={field}>
                  <label className="quiz-question-label">{field}</label>
                  <input
                    className="quiz-input"
                    value={question.sliderConfig[field]}
                    onChange={(event) => patchQuestion(index, {
                      sliderConfig: {
                        ...question.sliderConfig,
                        [field]: ['min', 'max', 'step'].includes(field) ? Number(event.target.value) : event.target.value,
                      },
                    })}
                    disabled={locked}
                  />
                </div>
              ))}
            </div>
          )}

          {question.type === 'free_text' && (
            <div className="quiz-grid quiz-grid-2" style={{ marginTop: '1rem' }}>
              <div>
                <label className="quiz-question-label">Minimum words</label>
                <input
                  type="number"
                  className="quiz-input"
                  value={question.freeTextConfig.minWords}
                  onChange={(event) => patchQuestion(index, { freeTextConfig: { ...question.freeTextConfig, minWords: Number(event.target.value) } })}
                  disabled={locked}
                />
              </div>
              <div>
                <label className="quiz-question-label">Maximum words</label>
                <input
                  type="number"
                  className="quiz-input"
                  value={question.freeTextConfig.maxWords}
                  onChange={(event) => patchQuestion(index, { freeTextConfig: { ...question.freeTextConfig, maxWords: Number(event.target.value) } })}
                  disabled={locked}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="quiz-question-label">Placeholder</label>
                <input
                  className="quiz-input"
                  value={question.freeTextConfig.placeholder}
                  onChange={(event) => patchQuestion(index, { freeTextConfig: { ...question.freeTextConfig, placeholder: event.target.value } })}
                  disabled={locked}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="quiz-panel quiz-panel-soft" style={{ padding: '1.25rem' }}>
        <div className="quiz-panel-header">
          <div>
            <p className="quiz-question-label">Build questions</p>
            <h2 className="quiz-question-title" style={{ fontSize: '1.3rem' }}>Add another question</h2>
          </div>
          <div className="quiz-button-row">
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <button key={option.value} type="button" className="au-btn-secondary" onClick={() => addQuestion(option.value)} disabled={locked}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="quiz-error">{error}</p>}
        {!locked && (
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <button type="submit" className="au-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : saveLabel}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}