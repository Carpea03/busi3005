'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import QuestionField, { isQuestionAnswered } from '../../../components/quiz/question-field';
import { STUDENT_IDENTITY_STORAGE_KEY } from '../../../lib/quiz-core';

function buildAnswerLookup(questions, existingResponse) {
  const answerLookup = {};

  for (const question of questions || []) {
    const answer = (existingResponse?.answers || []).find((entry) => entry.questionId === question.questionId);
    if (!answer) continue;
    answerLookup[question.questionId] = answer.value;
  }

  return answerLookup;
}

function questionError(question, value) {
  if (isQuestionAnswered(question, value)) {
    return '';
  }
  return 'Please answer this question before continuing.';
}

export default function QuizPlayPage({ params }) {
  const router = useRouter();
  const quizId = params.quizId;

  const [student, setStudent] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loadedExistingResponse, setLoadedExistingResponse] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const updateMode = () => setIsDesktop(mediaQuery.matches);
    updateMode();
    mediaQuery.addEventListener('change', updateMode);
    return () => mediaQuery.removeEventListener('change', updateMode);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STUDENT_IDENTITY_STORAGE_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed?.keyword) {
        setStudent(parsed);
      } else {
        setLoading(false);
      }
    } catch {
      localStorage.removeItem(STUDENT_IDENTITY_STORAGE_KEY);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!student?.keyword) return;

    let ignore = false;

    async function loadQuiz() {
      setLoading(true);
      try {
        const response = await fetch(`/api/quiz/${quizId}?keyword=${encodeURIComponent(student.keyword)}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load this quiz.');
        }

        if (!ignore) {
          setQuiz(data.quiz);
          setAnswers(buildAnswerLookup(data.quiz.questions, data.existingResponse));
          setLoadedExistingResponse(Boolean(data.existingResponse));
          setSubmitError('');
        }
      } catch (error) {
        if (!ignore) {
          setSubmitError(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadQuiz();
    return () => {
      ignore = true;
    };
  }, [quizId, student]);

  const questions = quiz?.questions || [];
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return ((activeIndex + 1) / questions.length) * 100;
  }, [activeIndex, questions.length]);

  function updateAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => ({ ...current, [questionId]: '' }));
  }

  function validateAllAnswers() {
    const nextErrors = {};

    for (const question of questions) {
      const value = answers[question.questionId];
      const error = questionError(question, value);
      if (error) {
        nextErrors[question.questionId] = error;
      }
    }

    setErrors(nextErrors);
    return nextErrors;
  }

  function handleNextQuestion() {
    const currentQuestion = questions[activeIndex];
    if (!currentQuestion) return;

    const error = questionError(currentQuestion, answers[currentQuestion.questionId]);
    if (error) {
      setErrors((current) => ({ ...current, [currentQuestion.questionId]: error }));
      return;
    }

    setActiveIndex((current) => Math.min(current + 1, questions.length - 1));
  }

  async function handleSubmit() {
    const nextErrors = validateAllAnswers();
    const firstQuestionWithError = questions.findIndex((question) => nextErrors[question.questionId]);

    if (firstQuestionWithError >= 0) {
      setActiveIndex(firstQuestionWithError);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        keyword: student.keyword,
        answers: questions.map((question) => ({
          questionId: question.questionId,
          value: answers[question.questionId],
        })),
      };

      const response = await fetch(`/api/quiz/${quizId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save your answers.');
      }

      router.push(`/quiz/${quizId}/done`);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!student && !loading) {
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-panel" style={{ padding: '1.4rem' }}>
          <h1 className="quiz-question-title">Start from the quiz landing page</h1>
          <p className="quiz-subtitle">Enter your keyword at /quiz first so we know which record to use.</p>
          <div className="quiz-button-row" style={{ marginTop: '1rem' }}>
            <Link href="/quiz" className="au-btn-primary" style={{ textDecoration: 'none' }}>Go to /quiz</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero" style={{ marginBottom: '1rem' }}>
        <p className="quiz-kicker">Week {quiz?.weekNumber || '...'}</p>
        <h1 className="quiz-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>{quiz?.title || 'Loading quiz...'}</h1>
        <p className="quiz-subtitle">
          Answer on your phone or laptop. If you submit again, your latest response replaces the earlier one.
        </p>
      </div>

      {loading && <div className="quiz-empty-state">Loading quiz...</div>}
      {submitError && <div className="quiz-note" style={{ marginBottom: '1rem', color: '#8a1c12' }}>{submitError}</div>}

      {!loading && quiz && (
        <>
          <div className="quiz-progress-meta">
            <span>{student?.keyword}</span>
            <span>{questions.length} questions</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: '1.1rem' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {loadedExistingResponse && (
            <div className="quiz-note" style={{ marginBottom: '1rem' }}>
              We found an earlier submission for this quiz. Editing and submitting again will overwrite it.
            </div>
          )}

          {isDesktop ? (
            <div className="quiz-stack">
              {questions.map((question, index) => (
                <QuestionField
                  key={question.questionId}
                  question={question}
                  index={index}
                  value={answers[question.questionId]}
                  onChange={(value) => updateAnswer(question.questionId, value)}
                  error={errors[question.questionId]}
                />
              ))}
              <div className="quiz-button-row">
                <button type="button" className="au-btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit responses'}
                </button>
                <Link href="/quiz" className="au-btn-secondary" style={{ textDecoration: 'none' }}>
                  Back to quiz home
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <QuestionField
                question={questions[activeIndex]}
                index={activeIndex}
                value={answers[questions[activeIndex]?.questionId]}
                onChange={(value) => updateAnswer(questions[activeIndex].questionId, value)}
                error={errors[questions[activeIndex]?.questionId]}
              />
              <div className="quiz-mobile-actions">
                <button
                  type="button"
                  className="au-btn-secondary"
                  onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                  disabled={activeIndex === 0}
                >
                  Back
                </button>
                {activeIndex === questions.length - 1 ? (
                  <button type="button" className="au-btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                ) : (
                  <button type="button" className="au-btn-primary" onClick={handleNextQuestion}>
                    Next question
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}