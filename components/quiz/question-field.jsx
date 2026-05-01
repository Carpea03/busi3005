'use client';

import { wordCount } from '../../lib/quiz-core';

export function isQuestionAnswered(question, value) {
  if (question.type === 'multi_select') {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'slider') {
    return Number.isFinite(value);
  }

  if (question.type === 'free_text') {
    return String(value || '').trim().length > 0;
  }

  return String(value || '').trim().length > 0;
}

function QuestionHeader({ question, index }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p className="quiz-question-label">Question {index + 1}</p>
      <h2 className="quiz-question-title">{question.prompt}</h2>
      {question.helpText && <p className="quiz-question-help">{question.helpText}</p>}
    </div>
  );
}

function MultiChoiceField({ question, value, onChange, multiple }) {
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : [String(value || '')];

  return (
    <div className="quiz-option-grid">
      {(question.options || []).map((option) => {
        const isSelected = selectedValues.includes(option.value);

        return (
          <label key={option.value} className={`quiz-option-card${isSelected ? ' is-selected' : ''}`}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              checked={isSelected}
              onChange={() => {
                if (multiple) {
                  const nextValues = isSelected
                    ? selectedValues.filter((selected) => selected !== option.value)
                    : [...selectedValues, option.value];
                  onChange(nextValues);
                } else {
                  onChange(option.value);
                }
              }}
              className={multiple ? 'au-checkbox' : 'au-radio'}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function LikertField({ question, value, onChange }) {
  const lowLabel = question.options?.[0]?.label || 'Lower';
  const highLabel = question.options?.[question.options.length - 1]?.label || 'Higher';

  return (
    <div>
      <div className="quiz-likert-row">
        {(question.options || []).map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`quiz-likert-button${isSelected ? ' is-selected' : ''}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="quiz-likert-labels">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function SliderField({ question, value, onChange }) {
  const min = question.sliderConfig?.min ?? 0;
  const max = question.sliderConfig?.max ?? 100;
  const step = question.sliderConfig?.step ?? 1;
  const midpoint = Math.round((min + max) / 2);
  const displayValue = Number.isFinite(value) ? value : midpoint;

  return (
    <div>
      <input
        type="range"
        className="quiz-slider"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="quiz-slider-meta">
        <span>{question.sliderConfig?.labelMin || min}</span>
        <span className="quiz-slider-value">{displayValue}</span>
        <span>{question.sliderConfig?.labelMax || max}</span>
      </div>
      {!Number.isFinite(value) && (
        <p className="quiz-inline-note">Move the slider to confirm your answer.</p>
      )}
    </div>
  );
}

function FreeTextField({ question, value, onChange }) {
  const currentValue = String(value || '');
  const config = question.freeTextConfig || {};

  return (
    <div>
      <textarea
        className="quiz-textarea"
        placeholder={config.placeholder || 'Write your answer here...'}
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="quiz-slider-meta">
        <span>Words: {wordCount(currentValue)}</span>
        <span>
          {config.minWords || 0} min / {config.maxWords || 500} max
        </span>
      </div>
    </div>
  );
}

export default function QuestionField({ question, index, value, onChange, error }) {
  return (
    <div className="quiz-panel quiz-question-card">
      <QuestionHeader question={question} index={index} />

      {question.type === 'single_select' && (
        <MultiChoiceField question={question} value={value} onChange={onChange} multiple={false} />
      )}

      {question.type === 'multi_select' && (
        <MultiChoiceField question={question} value={value} onChange={onChange} multiple />
      )}

      {question.type === 'likert_5' && (
        <LikertField question={question} value={value} onChange={onChange} />
      )}

      {question.type === 'slider' && (
        <SliderField question={question} value={value} onChange={onChange} />
      )}

      {question.type === 'free_text' && (
        <FreeTextField question={question} value={value} onChange={onChange} />
      )}

      {error && <p className="quiz-error">{error}</p>}
    </div>
  );
}