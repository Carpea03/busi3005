# AI for Business Transformation — S1 2027 Handoff: Planned Changes


---

## Change 1 — Run the S1 2026 trial review

Weeks 9 and 10 of S1 2026 trialled the longitudinal quiz/trajectory system as a proof-of-concept ahead of full deployment. Before anything is built for S1 2027, that trial needs an honest review. Work through Alex's seven-point checklist:

1. Did Weeks 9–10 produce useful cohort distributions, or just bandwagon conformity?
2. Did the trajectory data show genuine movement, or noise?
3. Did the spine question wording survive contact with students?
4. Was the keyword-only identity model usable in practice?
5. Which weekly spine additions are worth keeping?
6. Did the developer ship Phase 1 and Phase 2 in time? *(Sits with Alex and the developer — context for you, not your task.)*
7. Did the Week 10 prompt-test produce material students actually used in their Assignment 3 submissions?

Points 1–5 and 7 are yours to assess; they decide the shape of Changes 2–4. The outcome gates the rest: if the instrument produced conformity rather than signal, or the trajectory data was noise, the Assignment 3 rebuild needs rethinking before it is built.

---

## Change 2 — Rebuild Assignment 3 around the quiz/trajectory data

Assignment 3 (Critical Reflective Analysis — individual, 30%, due end of Week 10) is being rebuilt for S1 2027 so that it is anchored in each student's actual quiz/trajectory data rather than reconstructed memory.

**Why.** The established principle is that assessment alignment drives engagement — Module 3 engagement dropped in an earlier running when Assignment 3 didn't require Module 3 content. The S1 2026 version fixed that by anchoring the assignment in Module 3 content. The S1 2027 rebuild keeps that Module 3 anchoring and adds a longitudinal evidence base: the student's own answers, tracked across the semester.

**Target structure (three parts):**

- **Part 1 — "My AI Journey":** the student reflects against their actual answer trajectory from the quiz system, not a reconstructed account. The evidence is their real week-by-week movement on the spine questions.
- **Part 2 — "Business Comparison":** the student applies the trust audit method (taught in Week 9) to a chosen business case.
- **Part 3:** empirical claims are anchored in the cohort distribution data rather than asserted.

Continue to connect the assignment to the student's own Assignment 2 business concept, as the current version does.

**Lock only after Change 1.** Hold the redesign as a draft until the trial review confirms the trajectory data is sound enough to assess against.

**Downstream.** Once Assignment 3 is rebuilt, the Module 3 scaffolding (Weeks 8–10 async and workshop content) that points students toward it will need re-checking for alignment.

---

## Change 3 — Build the quiz content for full deployment

In S1 2026 the quiz ran only in Weeks 9–10. For S1 2027 it runs from **Week 1**, with the five-question spine repeating every week and week-specific questions layered on top.

**The five-question spine** (repeats every week so trajectory is visible):

- View placement (the three AI futures)
- Career confidence
- AI dependency
- Primary risk
- Policy position

**Content task — spine from Week 1.** The spine was designed for Module 3. Running it from Week 1 means checking that each question works without assuming content students haven't covered yet. Alex's position: the spine questions can be asked early, *provided they don't require prior knowledge of material not yet taught*. "View placement" in particular draws on a Module 3 framework — decide whether it needs light framing in the early weeks, a reworded early-weeks version, or can stay as-is. This is a judgement call for you.

**Content task — weekly additions.** Each week carries two or three week-specific questions on top of the spine, within a polling budget of roughly 10 minutes per workshop. The trial built these for Weeks 9–10 only. You need to design weekly additions for Weeks 1–8, and review the Weeks 9–10 additions against checklist point 5 — keep what worked, cut what didn't.

**Design constraints — explicitly rejected.** Alex has ruled these out; do not reintroduce them: leaderboards, prizes, gamification, AI-generated insights on the projector, email notifications. The quiz is a reflective and pedagogical instrument, not an engagement game.

---

## Change 4 — Integrate the quiz into the workshop decks

The S1 2026 trial bolted the quiz onto the Weeks 9–10 HTML decks. For S1 2027, with the quiz running from Week 1, it needs to be built into every workshop deck.

Per week, that means an opening baseline poll and a closing re-poll/reveal; from Week 2 onward, a trajectory element showing the cohort's movement since the previous week. Use the Weeks 9–10 trial decks as your reference pattern — Week 10 in particular was built around the data rather than having it bolted on, which is the model to follow. Keep within the ~10-minute polling budget noted in Change 3.

All decks remain self-contained HTML in the Adelaide University brand system — no change to the existing build approach.

---

## Change 5 — Update Week 5 and Week 6 async content for the revised Assignment 2

This one is **independent of the trial review** and can be started at any time.

Assignment 2 has been rewritten — it is now built around a real artefact, a founder narrative, an AI process log, and structured peer review, replacing the old polished-pitch format. The Week 5 and Week 6 asynchronous content still scaffolds students toward the *old* pitch format and needs updating to align with the revised brief. Check the Week 5 and Week 6 pre-workshop modules for the same drift while you're there.

The guiding principle for Assignment 2 throughout is "founder honesty over polished theatre" — a real but unsuccessful attempt is pedagogically preferable to a fictional polished pitch, and the async content should reflect that.

---

## Suggested sequence

1. **Change 1 (trial review)** — first; it gates Changes 2–4.
2. **Change 5 (Week 5/6 async)** — can run in parallel with Change 1; no dependency.
3. **Change 3 (quiz content)** — after the review; checklist point 5 feeds it.
4. **Change 2 (Assignment 3 rebuild)** — after the review; lock once the trajectory data is confirmed sound.
5. **Change 4 (deck integration)** — last; needs the quiz content from Change 3 settled first.

All materials use Australian English. Check in with Alex before locking anything that depends on the trial review outcome.
