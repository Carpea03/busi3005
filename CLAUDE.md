# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # local dev server on http://localhost:3000
npm run build     # production build (next build)
npm start         # serve production build
npm test          # full test suite — Node's built-in runner: `node --test "tests/**/*.test.js"`
```

Run a single test file directly:

```bash
node --test tests/quiz-core.test.js
```

There is no lint or typecheck script. Tests use the built-in Node test runner — there is no Jest/Vitest. The project is plain JavaScript (ESM, `"type": "module"`), not TypeScript.

To wipe the deployed Redis (one-shot, before a fresh semester rollout):

```bash
REDIS_URL=rediss://... node scripts/flush-redis.js
```

## Architecture

This is a Next.js 14 (App Router) app deployed on Vercel. The landing page at `/` is a course hub for BUSI3005 (AI for Business Transformation). It links to three subsystems, each with its own auth boundary and Redis namespace.

### Subsystem 1 — Group formation for Assignment 2 (AI Side Hustle Launch)

Reworked from the older "AI Business Pitch" assignment. Students self-select an `intent` on the form: `solo`, `declared-group` (they already have their group and list 1–2 other members by name), or `seeking` (matchmaking). There is no Claude-driven auto-grouping — `seeking` students get a deterministic top-5 same-workshop recommendation list and form their own group via email.

- Student survey at `/group-formation` → `POST /api/submit` writes to the Redis hash `submissions` (keyed by lowercase `fullName`). For `seeking` submissions a recovery code is allocated and indexed in the Redis hash `group-formation:recovery` (field = code, value = respondentId).
- `/group-formation/matches` is the student-facing landing for matchmaking. Recovery-code lookup → up to 5 same-workshop suggestions with first name, uni email, and a one-line rationale. Same page lets the student confirm a group, switch to solo, or reset back to seeking.
- Match scoring is pure and lives in [lib/group-formation-core.js](lib/group-formation-core.js): same workshop (hard requirement) + overlap on hustle direction + complementary build skills + experience balance + availability overlap. No LLM, no Anthropic SDK call on this path.
- Admin dashboard at `/admin` reads via `GET /api/responses` and exports CSV via `GET /api/export`. Filters by status (`solo` / `declared` / `seeking` / `confirmed`) and workshop. No "generate groups" action — that path was removed.
- `GET /api/group-formation/matches?code=...` returns the seeker's profile + matches. `PATCH` with `{ code, action: 'confirm'|'switch-to-solo'|'reset', members?: string[] }` updates the student's `matchStatus`.

### Subsystem 2 — Workshop quizzes (S1 2027 deployment model)

The quiz subsystem ran as a Weeks 9–10 trial in S1 2026. For S1 2027 it runs from Week 1 with a fixed 5-question spine repeating each week, plus 2–3 week-specific reflect questions. See [S1_2027_Handoff_Planned_Changes.md](S1_2027_Handoff_Planned_Changes.md) for the pedagogy spec.

- **Quiz definitions live in [lib/quizzes.js](lib/quizzes.js)**, not in Redis. To change quiz content, edit that file and redeploy. Each week has a `baseline` quiz (spine only) and a `reflect` quiz (spine + week-specific extras). Week 4 has baseline only (assessment week).
- The five-question spine: `view-placement`, `career-confidence`, `ai-dependency`, `primary-risk`, `policy-position`. "View placement" includes a "LLMs are a dead end" option alongside augmentation and full-automation views.
- Status is derived per request from a date gate plus an optional manual override: `computeEffectiveStatus({ releaseAt, closeAt, override, now })` in [lib/quiz-core.js](lib/quiz-core.js). The override lives in Redis at `quiz:status-override:{quizId}` ∈ `{open, closed}` (or absent).
- Admin pages:
  - `/admin/quizzes` — list grouped by week. No "Create quiz" button (definitions live in code).
  - `/admin/quizzes/[quizId]` — read-only quiz details + Force open / Force close / Clear override buttons.
  - `/admin/quizzes/[quizId]/live` — projector mode, real-time aggregates via Redis pub/sub.
- Student pages: `/quiz` landing, `/quiz/[quizId]` quiz form, `/quiz/me` recovery-code-based session recovery. Identity is a `keyword` + recovery code, not a name.
- New `GET /api/quiz/trajectory?question=...&cohort=...&phase=...` returns per-week histograms for a spine question, intended for embedding cross-week movement in workshop decks (Change 4 in the handoff doc — scaffolded, not yet wired).

### Subsystem 3 — Lecturer dashboard

`/admin` is the single admin entry point. Inside: group-formation responses + AI suggestion view, quiz control room, student drill-down, exports. All admin routes call [lib/auth.js](lib/auth.js) which checks the `x-admin-password` header or `?password=` query param against `ADMIN_PASSWORD`.

### Shared infrastructure

- **Redis client** — [lib/redis.js](lib/redis.js) is the only place that constructs clients; reuse its factory for both regular commands and pub/sub. The connection URL comes from `REDIS_URL`, which Vercel injects when a Redis store is attached.
- **Redis key layout** (Redis stores responses/aggregates/overrides only — never quiz definitions):
  - `submissions` — hash of group-formation submissions, field = lowercase fullName. Submission shape includes `intent`, `matchStatus`, `members[]` (declared), `confirmedGroup[]` (matchmaking), `email`, `consentShare`, `recoveryCode`.
  - `group-formation:recovery` — hash of recovery codes → respondentId, for matchmaking lookups.
  - `response:{quizId}:{keyword}` — one student's quiz response.
  - `aggregate:{quizId}:{questionId}` — live tallies updated on each submission.
  - `quiz:status-override:{quizId}` — admin's manual `open`/`closed` override (absent = use date gate).
  - `student:{keyword}`, `student-recovery:{code}` — student identity records.
  - Pub/sub channels under the same `{quizId}` namespace drive the live view.

### What is intentionally NOT here

- No online quiz builder. The `/admin/quizzes/new` route and the `quiz-editor.jsx` component were deleted. Quizzes are code, not data.
- No leaderboards, prizes, gamification, AI-generated insights on the projector, or email notifications. These are explicitly rejected in the handoff doc.
- No zod or other schema library — validation in [lib/quiz-core.js](lib/quiz-core.js) is hand-rolled.
- No auto-generated groups. The `/api/generate-groups` route and the Anthropic-fetch path for group formation were removed; matchmaking is deterministic and lives in [lib/group-formation-core.js](lib/group-formation-core.js).
- No server-side email send. Matched students contact each other directly from their `/group-formation/matches` page via `mailto:` links.

## Embedding a quiz in a workshop deck (Change 4 reference)

Workshop decks in [Teaching Material/Lecture Slides/](Teaching%20Material/Lecture%20Slides/) are self-contained HTML in the Adelaide University brand system. To embed a quiz or its trajectory:

- Iframe the student form: `<iframe src="https://busi3005.vercel.app/quiz/week3-baseline" />`.
- Fetch a single aggregate inline: `GET /api/quiz/{quizId}/aggregate` (returns released question distributions for student-side display).
- Fetch trajectory across weeks: `GET /api/quiz/trajectory?question=view-placement&cohort=both` returns per-week histograms suitable for charting.

## Branding

Adelaide University. Brand colours live in [app/globals.css](app/globals.css):

| | |
|---|---|
| Dark Blue | `#140F50` |
| North Terrace Purple | `#856BFF` |
| Bright Blue | `#1449FF` |
| South East Limestone | `#F8EFE0` |

Use these (via the existing CSS variables / utility classes) rather than introducing new colours in new UI.

## Conventions

- **Australian English** in all user-facing strings: organise, behaviour, analyse, favourite, optimise.
- New surveys and quizzes go through the existing question schema in [lib/quiz-core.js](lib/quiz-core.js) (`single_select`, `multi_select`, `likert_5`, `slider`, `free_text`).
- The student `intent` field on group-formation submissions takes only `'solo' | 'declared-group' | 'seeking'`. Solo submissions skip availability/deadline/meeting questions. Declared-group submissions add a `members[]` list of the 1–2 other members. Seeking submissions add `email`, `consentShare`, and a `recoveryCode`.

## Environment

Required env vars: `REDIS_URL` (Vercel injects), `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`. Local setup is covered in [README.md](README.md) — use `vercel env pull .env.local` after `vercel link`.

Deployment is Vercel-only (see [vercel.json](vercel.json)).
