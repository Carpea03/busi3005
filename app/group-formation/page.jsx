'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Survey for Assignment 2 (AI Side Hustle Launch). Three intents:
//   solo            — just me
//   declared-group  — I already have my group (list members by name)
//   seeking         — match me with classmates (I'll form the group myself)

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

const STEPS_BY_INTENT = {
  solo: [
    { number: 1, label: 'About you' },
    { number: 2, label: 'AI fluency' },
    { number: 3, label: 'Hustle direction' },
  ],
  'declared-group': [
    { number: 1, label: 'About you' },
    { number: 2, label: 'AI fluency' },
    { number: 3, label: 'Your group' },
    { number: 4, label: 'Hustle direction' },
  ],
  seeking: [
    { number: 1, label: 'About you' },
    { number: 2, label: 'AI fluency' },
    { number: 3, label: 'Working style' },
    { number: 4, label: 'Hustle direction' },
    { number: 5, label: 'Sharing' },
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
    intent: '', // 'solo' | 'declared-group' | 'seeking'
    fullName: '',
    workshop: '',
    aiExperience: '',
    aiTools: [],
    buildSkills: [],
    availability: [],
    deadlineApproach: null,
    meetingPreference: null,
    hustleDirection: '',
    hustleConcept: '',
    members: ['', ''],
    email: '',
    consentShare: false,
  });

  const steps = form.intent ? STEPS_BY_INTENT[form.intent] : [];
  const finalStep = steps.length;
  const isSolo = form.intent === 'solo';
  const isDeclared = form.intent === 'declared-group';
  const isSeeking = form.intent === 'seeking';

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function pickIntent(intent) {
    setForm((prev) => ({ ...prev, intent }));
    setStep(1);
    setErrors({});
  }

  const validateStep = () => {
    const newErrors = {};
    if (!form.intent) {
      newErrors.intent = 'Please choose how you’re doing Assignment 2.';
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
    if (isDeclared && step === 3) {
      const filled = form.members.map((m) => m.trim()).filter(Boolean);
      if (filled.length < 1) newErrors.members = 'List the names of the 1–2 other people in your group.';
    }
    if (isSeeking && step === 3) {
      if (form.availability.length === 0) newErrors.availability = 'Please select at least one availability window.';
      if (!form.deadlineApproach) newErrors.deadlineApproach = 'Please rate your deadline approach.';
    }
    if (step === finalStep) {
      if (!form.hustleDirection) newErrors.hustleDirection = 'Please pick a hustle direction.';
      if (isSeeking) {
        if (!form.email.trim()) newErrors.email = 'Enter your uni email so matches can contact you.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) newErrors.email = 'That email doesn’t look right.';
        if (!form.consentShare) newErrors.consentShare = 'Please tick the consent box to use matchmaking.';
      }
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
      const payload = {
        intent: form.intent,
        fullName: form.fullName,
        workshop: form.workshop,
        aiExperience: form.aiExperience,
        aiTools: form.aiTools,
        buildSkills: form.buildSkills,
        availability: form.availability,
        deadlineApproach: form.deadlineApproach,
        meetingPreference: form.meetingPreference,
        hustleDirection: form.hustleDirection,
        hustleConcept: form.hustleConcept,
        members: isDeclared ? form.members.map((m) => m.trim()).filter(Boolean) : [],
        email: isSeeking ? form.email.trim() : '',
        consentShare: isSeeking ? form.consentShare : false,
      };
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.recoveryCode) {
          router.push(`/group-formation/success?code=${encodeURIComponent(data.recoveryCode)}`);
        } else {
          router.push('/group-formation/success');
        }
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Intent choice gate
  if (!form.intent) {
    return (
      <div className="quiz-shell quiz-shell-narrow">
        <div className="quiz-hero">
          <p className="quiz-kicker">Assignment 2 — AI Side Hustle Launch</p>
          <h1 className="quiz-title">Group formation</h1>
          <p className="quiz-subtitle">
            Assignment 2 can be done individually or in groups of up to three. Tell us how you want
            to approach it — takes about 4 minutes.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl mb-3" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
            How are you doing Assignment 2?
          </h2>
          <RadioGroup
            selected={form.intent}
            onChange={pickIntent}
            options={[
              { value: 'solo', label: 'Solo', description: 'Just me. Skip the group-matching questions.' },
              { value: 'declared-group', label: 'I already have my group', description: 'A pair or trio. List the other 1–2 members by name.' },
              { value: 'seeking', label: 'Match me with classmates', description: 'I don’t have a group yet. Suggest up to five classmates I might work well with — I’ll reach out and form the group myself.' },
            ]}
          />
          {errors.intent && <p className="text-red-500 text-xs mt-2">{errors.intent}</p>}

          <div className="mt-6 text-xs" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
            <p style={{ marginBottom: '0.4rem' }}>
              <strong>Reminder:</strong> the brief is founder-honest, not pitch-polished. A real but unsuccessful attempt counts.
            </p>
            <p>
              <Link href="/group-formation/matches" style={{ color: '#1449FF' }}>
                Already submitted with “match me”? Open your suggestions →
              </Link>
            </p>
            <p style={{ marginTop: '0.4rem' }}>
              <Link href="/" style={{ color: '#1449FF' }}>Back to course hub</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step - 1) / Math.max(finalStep - 1, 1)) * 100;
  const intentLabel = isSolo ? 'solo' : isDeclared ? 'declared group' : 'matchmaking';

  return (
    <div className="quiz-shell quiz-shell-narrow">
      <div className="quiz-hero" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p className="quiz-kicker">Assignment 2 — AI Side Hustle Launch · {intentLabel}</p>
        <h1 className="quiz-title">Group formation</h1>
        <button
          type="button"
          onClick={() => pickIntent('')}
          className="text-xs underline"
          style={{ color: '#6B6490', marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
        >
          change choice
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
              Your name and workshop. No student ID collected here.
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
              We use this to suggest complementary classmates and to plan workshop support.
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

        {isDeclared && step === 3 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Your group</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              List the 1–2 other people in your group by full name. Each member submits their own
              form — the lecturer cross-checks names in the Week 4 workshop.
            </p>
            <div className="space-y-3">
              {[0, 1].map((idx) => (
                <div key={idx}>
                  <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                    Member {idx + 2} {idx === 0 && <span style={{ color: '#856BFF' }}>*</span>}
                  </label>
                  <input
                    className="au-input"
                    type="text"
                    placeholder={idx === 0 ? 'e.g. Jordan Lee' : 'Optional — third member'}
                    value={form.members[idx]}
                    onChange={(e) => {
                      const next = [...form.members];
                      next[idx] = e.target.value;
                      update('members', next);
                    }}
                  />
                </div>
              ))}
              {errors.members && <p className="text-red-500 text-xs mt-1">{errors.members}</p>}
            </div>
          </div>
        )}

        {isSeeking && step === 3 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Working style</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              Helps us suggest classmates whose schedule and deadline habits overlap with yours.
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

        {((isSolo && step === 3) || (isDeclared && step === 4) || (isSeeking && step === 4)) && (
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
            </div>
          </div>
        )}

        {isSeeking && step === 5 && (
          <div>
            <h2 className="text-xl mb-1" style={{ color: '#140F50', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>Sharing</h2>
            <p className="mb-6 text-sm" style={{ color: '#6B6490', fontFamily: 'Georgia, serif' }}>
              We’ll suggest up to five classmates in your workshop. To let them reach out to you (and
              for you to reach out to them), we share first names and uni emails between matches only.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block mb-1.5 text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#140F50' }}>
                  Your uni email <span style={{ color: '#856BFF' }}>*</span>
                </label>
                <input
                  className="au-input"
                  type="email"
                  placeholder="a1234567@adelaide.edu.au"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <label
                className="flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors"
                style={{
                  backgroundColor: form.consentShare ? 'rgba(133,107,255,0.1)' : 'rgba(248,239,224,0.6)',
                  border: form.consentShare ? '1.5px solid #856BFF' : '1.5px solid #E0D9F5',
                }}
              >
                <input
                  type="checkbox"
                  className="au-checkbox mt-0.5 shrink-0"
                  checked={form.consentShare}
                  onChange={(e) => update('consentShare', e.target.checked)}
                />
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: '#140F50' }}>
                  I’m OK with my first name and uni email being shown to up to five suggested
                  classmates in my workshop so we can decide whether to form a group. Nothing else is
                  shared, and my full name and email aren’t shown publicly.
                </span>
              </label>
              {errors.consentShare && <p className="text-red-500 text-xs mt-1">{errors.consentShare}</p>}

              <div className="text-xs p-3 rounded-md" style={{ background: 'rgba(20,73,255,0.05)', border: '1px solid rgba(20,73,255,0.15)', color: '#1449FF', fontFamily: 'Georgia, serif' }}>
                After you submit, you’ll get a recovery code. Use it on the “Match me” page to view,
                refresh, or switch your matches at any time.
              </div>
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
        Your responses are used only to confirm Assignment 2 rosters and {isSeeking ? 'to suggest classmates within your workshop' : 'to plan workshop support'}.
      </p>
    </div>
  );
}
