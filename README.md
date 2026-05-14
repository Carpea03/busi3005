# BUSI3005 — AI for Business Transformation

Adelaide University course hub for **BUSI3005 AI for Business Transformation** (Bachelor of Business). Built on Next.js 14 + Redis, deployed on Vercel.

Landing page at `/` is a hub with three cards:

- **Group formation** (`/group-formation`) — student survey for Assignment 2: AI Side Hustle Launch. Solo, pair, or trio (max 3).
- **Workshop quizzes** (`/quiz`) — baseline + reflect polls run each weekly workshop. Quiz content lives in [lib/quizzes.js](lib/quizzes.js); status is date-gated with manual override.
- **Lecturer dashboard** (`/admin`) — group-formation responses, AI group suggestions, quiz control room, student drill-down, CSV exports.

## Tech stack

- Next.js 14 (App Router)
- Redis (`redis` package)
- Tailwind utility classes + custom Adelaide University brand CSS in [app/globals.css](app/globals.css)
- Claude API for group suggestions (fetch-based; no SDK dependency)

## Local development

```bash
npm install
cp .env.example .env.local            # then fill in ADMIN_PASSWORD and ANTHROPIC_API_KEY
vercel link                           # one-off, to wire to Vercel
vercel env pull .env.local            # adds REDIS_URL from the connected store
npm run dev                           # http://localhost:3000
npm test                              # node --test
```

Required env vars:

| Variable | Value |
|---|---|
| `REDIS_URL` | Vercel adds this when you connect a Redis store. |
| `ADMIN_PASSWORD` | Your chosen admin password. |
| `ANTHROPIC_API_KEY` | From console.anthropic.com — used for AI group suggestions only. |

## Deployment

Vercel-only (see [vercel.json](vercel.json)). Connect a Redis store via Storage → Create Database → Redis. Set the two env vars above in Settings → Environment Variables. `vercel --prod` deploys.

## Rolling out a fresh semester

Quiz definitions live in [lib/quizzes.js](lib/quizzes.js). To run the same code with new content, edit that file, push, and redeploy.

To wipe the deployed Redis (drops all submissions, quiz responses, aggregates, student identities, status overrides):

```bash
REDIS_URL=rediss://... node scripts/flush-redis.js
# add --yes to skip the confirmation prompt
```

The script refuses to run without `REDIS_URL` and asks for explicit `yes` confirmation.

## Architecture overview

See [CLAUDE.md](CLAUDE.md) for the detailed architecture notes. The pedagogy intent for the quiz subsystem (five-question spine, weekly additions, trajectory tracking) is documented in [S1_2027_Handoff_Planned_Changes.md](S1_2027_Handoff_Planned_Changes.md).

Key files when starting work:

- [lib/quizzes.js](lib/quizzes.js) — spine + per-week quiz definitions (source of truth).
- [lib/quiz-core.js](lib/quiz-core.js) — pure validation, normalization, aggregation, `computeEffectiveStatus`.
- [lib/quiz-store.js](lib/quiz-store.js) — Redis persistence (responses, aggregates, status overrides, student identity).
- [app/group-formation/page.jsx](app/group-formation/page.jsx) — the survey form.
- [app/api/generate-groups/route.js](app/api/generate-groups/route.js) — Claude prompt for AI group suggestions.

## Adelaide University brand colours

| Colour | Hex |
|---|---|
| Dark Blue | `#140F50` |
| North Terrace Purple | `#856BFF` |
| Bright Blue | `#1449FF` |
| South East Limestone | `#F8EFE0` |
| White | `#FFFFFF` |
