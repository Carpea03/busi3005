'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Survey for Assignment 2 (AI Side Hustle Launch). Groups are 1 (solo), 2, or 3.
// Wording reframed away from the old polished-pitch format.

const HUSTLE_DIRECTIONS = [
  'E-commerce (store, product listing, marketplace)',
  'Delivered freelance service (writing, design, research, automation)',
  'Content channel (newsletter, YouTube, social) built with AI tools',
  'AI-powered tool, workflow, or template for real users',
  'Client project for a real business (pro bono counts)',
  'Prototype with documented user testing',
  'Not sure yet — open to suggestions',
];

const BUILD_SKILLS = [
  'Customer / user research and conversations',
  'Writing and content production',
  'Visual design and image generation',
  'Video, audio, or AI-avatar production',
  'Light coding / no-code automation',
  'Spreadsheet and data work',
  'Outreach, sales, and DMs',
  'Project coordination and decision-making',
];

const AI_TOOLS = [
  'ChatGPT',
  'Claude',
  'Google Gemini',
  'Microsoft Copilot',
  'Perplexity',
  'Image generators (Midjourney, DALL-E, etc.)',
  'Video / avatar generators (HeyGen, Synthesia, etc.)',
  'Coding assistants (GitHub Copilot, Cursor, etc.)',
  'No-code automation (n8n, Make, Zapier with AI)',
  'None yet — new to AI tools',
];

const AVAILABILITY = [
  'Weekday mornings (before 12pm)',
  'Weekday afternoons (12pm–5pm)',
  'Weekday evenings (after 5pm)',
  'Weekend mornings',
  'Weekend afternoons',
  'Very flexible — most times work for me',
];

const WORKSHOPS = ['Wednesday 2–5pm', 'Friday 8–11am'];

const STEPS_BY_FORMAT = {
  solo: [
    { number: 1, label: 'About you' },
    { number: 2, label: 'AI fluency' },
    { number: 3, label: 'Hustle direction' },
  ],
  group: [
    { number: 1, label: 'About you' },
    { number: 2, label: 'AI fluency' },
    { number: 3, label: 'Working style' },
    { number: 4, label: 'Hustle direction' },
  ],
};

function CheckboxGroup({ options, selected, onChange, cols = 1 }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors"
          style={{
            backgroundColor: selected.includes(opt) ? 'rgba(133,107,255,0.1)' : 'rgba(248,239,224,0.6)',
            border: selected.includes(opt) ? '1.5px solid #856BFF' : '1.5px solid #E0D9F5',
          }}
        >
          <input
            type="checkbox"
            className="au-checkbox mt-0.5 shrink-0"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
          />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#140F50' }}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ options, selected, onChange }) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => {
        const value = opt.value || opt;
        const label = opt.label || opt;
        const isSelected = selected === value;
        return (
          <label
            key={value}
            className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors"
            style={{
              backgroundColor: isSelected ? 'rgba(133,107,255,0.1)' : 'rgba(248,239,224,0.6)',
              border: isSelected ? '1.5px solid #856BFF' : '1.5px solid #E0D9F5',
            }}
          >
            <input
              type="radio"
              className="au-radio shrink-0"
              checked={isSelected}
              onChange={() => onChange(value)}
            />
            <div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#140F50', fontWeight: isSelected ? '600' : '400' }}>
                {label}
              </span>
              {opt.description && (
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem', color: '#6B6490', marginTop: '2px' }}>
                  {opt.description}
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

function LikertScale({ value, onChange, lowLabel, highLabel }) {
  return (
    <div>
      <div className="flex gap-2 justify-center mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="w-12 h-12 rounded-lg font-bold transition-all"
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: '1rem',
              backgroundColor: value === n ? '#140F50' : 'white',
              color: value === n ? 'white' : '#140F50',
              border: value === n ? '2px solid #140F50' : '2px solid #E0D9F5',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs" style={{ fontFamily: 'Georgia, serif', color: '#6B6490' }}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export default function GroupFormationSurvey() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    // Step 0 — format choice (shown above the steps; not a navigated step)
    format: '', // 'solo' | 'pair' | 'trio'
    // Step 1
    fullName: '',
    workshop: '',
    // Step 2
    aiExperience: '',
    aiTools: [],
    buildSkills: [],
    // Step 3 (group only)
    availability: [],
    deadlineApproach: null,
    meetingPreference: null,
    // Step 4 (or Step 3 if solo)
    hustleDirection: '',
    hustleConcept: '',
    peerPreference: '',
  });

  const isSolo = form.format === 'solo';
  const steps = isSolo ? STEPS_BY_FORMAT.solo : STEPS_BY_FORMAT.group;
  const finalStep = steps.length;

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function pickFormat(format) {
    setForm((prev) => ({ ...prev, format }));
    setStep(1);
    setErrors({});
  }

  const validateStep = () => {
    const newErrors = {};
    if (!form.format) {
      newErrors.format = 'Please choose solo, pair, or trio.';
      setErrors(newErrors);
      return false;
    }

    if (step === 1) {
      if (!form.fullName.trim()) newErrors.fullName = 'Please enter your full name.';
      if (!form.workshop) newErrors.workshop = 'Please select your workshop.';
    }
    if (step === 2) {
      if (!form.aiExperience) newErrors.aiExperience = 'Please select your AI experience level.';
      if (form.buildSkills.length === 0) newErrors.buildSkills = 'Please pick at least one build skill.';
    }
    if (!isSolo && step === 3) {
      if (form.availability.length === 0) newErrors.availability = 'Please select at least one availability window.';
      if (!form.deadlineApproach) newErrors.deadlineApproach = 'Please rate your deadline approach.';
    }
    if (step === finalStep) {
      if (!form.hustleDirection) newErrors.hustleDirection = 'Please pick a hustle direction.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/group-formation/success');
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format choice gate
  if (!form.format) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="quiz-kicker">Assignment 2 — AI Side Hustle Launch</p>
          <h1 className="text-3xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
            Group formation
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', color: '#6B6490', fontSize: '1rem' }}>
            Assignment 2 can be done individually or in groups of up to three. We use this form to confirm rosters in the Week 4 workshop. Takes about 4 minutes.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl mb-3" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
            How are you doing Assignment 2?
          </h2>
          <RadioGroup
            selected={form.format}
            onChange={pickFormat}
            options={[
              { value: 'solo', label: 'Solo', description: 'Just me. Skip the group-matching questions.' },
              { value: 'pair', label: 'Pair', description: 'Two of us. The other person submits separately.' },
              { value: 'trio', label: 'Trio', description: 'Three of us. Each member submits separately.' },
            ]}
          />
          {errors.format && <p className="text-red-500 text-xs mt-2">{errors.format}</p>}

          <div className="mt-6 text-xs" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            <p style={{ marginBottom: '0.4rem' }}>
              <strong>Reminder:</strong> the brief is founder-honest, not pitch-polished. A real but unsuccessful attempt counts.
            </p>
            <p>
              <Link href="/" style={{ color: '#1449FF' }}>Back to course hub</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step - 1) / (finalStep - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <p className="quiz-kicker">Assignment 2 — AI Side Hustle Launch · {form.format}</p>
        <h1 className="text-3xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
          Group formation
        </h1>
        <button type="button" onClick={() => pickFormat('')} className="text-xs underline" style={{ color: '#6B6490' }}>
          change format
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between mb-3">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  backgroundColor: step > s.number ? '#856BFF' : step === s.number ? '#140F50' : 'white',
                  color: step >= s.number ? 'white' : '#9E97C4',
                  border: step < s.number ? '2px solid #E0D9F5' : 'none',
                }}
              >
                {step > s.number ? '✓' : s.number}
              </div>
              <span className="text-xs mt-1 hidden sm:block" style={{ fontFamily: 'Arial, sans-serif', color: step === s.number ? '#140F50' : '#9E97C4', fontWeight: step === s.number ? 'bold' : 'normal' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-none w-8 h-0.5 mx-1 mb-4" style={{ backgroundColor: step > s.number ? '#856BFF' : '#E0D9F5' }} />
            )}
          </div>
        ))}
      </div>

      <div className="progress-bar mb-8">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card">
        {step === 1 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>About you</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              Your name and workshop. No student ID or email collected here.
            </p>
            <div className="space-y-5">
              <div>
                <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Full name <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <input
                  className="au-input"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Which workshop are you in? <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <RadioGroup
                  selected={form.workshop}
                  onChange={(v) => update('workshop', v)}
                  options={WORKSHOPS}
                />
                {errors.workshop && <p className="text-red-500 text-xs mt-1">{errors.workshop}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
              Your AI fluency
            </h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              We use this to match complementary skills and ensure no group is stranded without AI experience.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Current experience with AI tools? <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <RadioGroup
                  selected={form.aiExperience}
                  onChange={(v) => update('aiExperience', v)}
                  options={[
                    { value: 'Beginner', label: 'Beginner', description: 'Just starting to explore AI tools.' },
                    { value: 'Intermediate', label: 'Intermediate', description: 'Use AI tools occasionally for specific tasks.' },
                    { value: 'Advanced', label: 'Advanced', description: 'Regular user; experiment with prompts and tools.' },
                    { value: 'Expert', label: 'Expert', description: 'Comfortable across multiple tools and workflows.' },
                  ]}
                />
                {errors.aiExperience && <p className="text-red-500 text-xs mt-1">{errors.aiExperience}</p>}
              </div>
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Which AI tools have you used before? (Select all that apply)
                </label>
                <CheckboxGroup
                  options={AI_TOOLS}
                  selected={form.aiTools}
                  onChange={(v) => update('aiTools', v)}
                  cols={2}
                />
              </div>
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Which build skills can you bring to a hustle? <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <CheckboxGroup
                  options={BUILD_SKILLS}
                  selected={form.buildSkills}
                  onChange={(v) => update('buildSkills', v)}
                  cols={2}
                />
                {errors.buildSkills && <p className="text-red-500 text-xs mt-1">{errors.buildSkills}</p>}
              </div>
            </div>
          </div>
        )}

        {!isSolo && step === 3 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Working style</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              Helps us pair you with people whose schedule and deadline habits overlap with yours.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  When can you generally meet? <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <CheckboxGroup
                  options={AVAILABILITY}
                  selected={form.availability}
                  onChange={(v) => update('availability', v)}
                />
                {errors.availability && <p className="text-red-500 text-xs mt-1">{errors.availability}</p>}
              </div>
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  I prefer to finish well before the deadline rather than close to it. <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <LikertScale
                  value={form.deadlineApproach}
                  onChange={(v) => update('deadlineApproach', v)}
                  lowLabel="Strongly disagree"
                  highLabel="Strongly agree"
                />
                {errors.deadlineApproach && <p className="text-red-500 text-xs mt-1">{errors.deadlineApproach}</p>}
              </div>
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  I prefer to meet in person rather than online.
                </label>
                <LikertScale
                  value={form.meetingPreference}
                  onChange={(v) => update('meetingPreference', v)}
                  lowLabel="Strongly disagree"
                  highLabel="Strongly agree"
                />
              </div>
            </div>
          </div>
        )}

        {step === finalStep && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Hustle direction</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              Rough direction is enough — you’ll confirm the concept by Week 5.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Closest hustle direction <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <RadioGroup
                  selected={form.hustleDirection}
                  onChange={(v) => update('hustleDirection', v)}
                  options={HUSTLE_DIRECTIONS}
                />
                {errors.hustleDirection && <p className="text-red-500 text-xs mt-1">{errors.hustleDirection}</p>}
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Concept sketch (optional)
                </label>
                <p className="text-xs mb-2" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                  One or two sentences. e.g. “Etsy store selling AI-generated dog-breed prints to Adelaide pet owners.”
                </p>
                <textarea
                  className="au-input"
                  rows={3}
                  placeholder="Optional — what do you imagine building?"
                  value={form.hustleConcept}
                  onChange={(e) => update('hustleConcept', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              {!isSolo && (
                <div>
                  <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                    Anyone you’d especially like to work with, or prefer not to? (Optional)
                  </label>
                  <p className="text-xs mb-2" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
                    Considered where feasible. Not guaranteed.
                  </p>
                  <textarea
                    className="au-input"
                    rows={2}
                    placeholder="Optional — names only if relevant…"
                    value={form.peerPreference}
                    onChange={(e) => update('peerPreference', e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`mt-8 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button type="button" className="au-btn-secondary" onClick={handleBack}>← Back</button>
          )}
          {step < finalStep ? (
            <button type="button" className="au-btn-primary" onClick={handleNext}>Continue →</button>
          ) : (
            <button
              type="button"
              className="au-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit ✓'}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs mt-6" style={{ fontFamily: 'Georgia, serif', color: '#9E97C4' }}>
        Your responses are used only to confirm Assignment 2 rosters. They are not shared with other students.
      </p>
    </div>
  );
}
