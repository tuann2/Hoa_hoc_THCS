## Inspiration

Lower-secondary Chemistry in Vietnam (grades 8–9, including the
gifted-student "HSG" track) is dense: reaction chains, equation balancing,
acid/base/salt relationships, organic vs. inorganic chains — and most
students only have a textbook and a notebook to drill it with. We wanted
the same kind of bite-sized, habit-forming practice loop that language
apps like Duolingo popularized, but built specifically around the
Vietnamese THCS Chemistry curriculum (Hoá 8, Hoá 9), in Vietnamese, with
real exam-style questions instead of generic flashcards.

## What it does

**Hoá học THCS nâng cao** is a mobile-first web app that turns the
Vietnamese THCS Chemistry curriculum into a structured learning path:

- A visual unit map across two tracks — **Vô cơ** (inorganic) and **Hữu cơ**
  (organic) — covering 17 units and 81 lessons, from foundational concepts
  through oxides, acids, bases, salts, metals, non-metals, hydrocarbons,
  fuels, and organic derivatives.
- Each lesson pairs short theory cards with a quiz mixing four question
  types: single-choice, multi-choice, fill-in-the-blank, and chemical
  **equation balancing** (students supply the actual stoichiometric
  coefficients, not just pick an answer).
- Every question is tagged by difficulty (`basic` / `applied` / `hsg`) and
  by kind (`theory` / `calculation`), so practice sessions and mock exams
  can be composed by scope and difficulty rather than randomly.
- Duolingo-style progression mechanics: XP, streaks, stars per lesson, and
  unit/lesson unlocking based on completion.
- A **Review** mode that resurfaces previously missed questions until
  they're answered correctly, and an **Exam** mode with a countdown timer
  and configurable scope for realistic mock-test practice.
- Optional email/password sign-in with Supabase sync, so progress follows
  a student across devices — while still working fully offline/local-only
  if no account is configured.

## How we built it

The app is a Vite + React 18 + TypeScript single-page app styled with
Tailwind CSS, using `react-router-dom` for the Home/Lesson/Review/Exam/
Profile routes and `zustand` (with persistence) for local progress state —
XP, streak, stars, unlocks, wrong-question queue, and exam history all
survive a page reload without any backend. `@supabase/supabase-js` handles
optional Auth and Postgres sync, with pull/merge/push logic that
reconciles local and remote progress and degrades gracefully to
local-only mode when Supabase isn't configured.

All learning content lives as validated JSON under `content/units/`, one
file per unit, checked against schema and chemistry-specific rules (every
question needs an explanation, balance questions need real stoichiometric
coefficients, every available lesson needs a minimum spread of
basic/applied/HSG questions) by a custom `validate-content` script that
runs in CI before every build.

We also run this project under a documented AI-assisted engineering
workflow: every non-trivial change starts as a written plan with an
explicit risk tier, gets implemented by an AI coding agent, passes a
canonical gate of format/lint/typecheck/test/build commands, and — for
higher-risk changes — goes through independent adversarial review from a
second AI reviewer before a human approves release. Recent work under
this process hardened the dependency chain (patching a critical Vitest
advisory and a high-severity React Router XSS advisory down to zero known
vulnerabilities) and added a license-allowlist gate to CI.

## Challenges we ran into

- **Balancing chemical equations is a real numeracy problem, not a
  string-match problem.** Grading `answer: [1, 2, 1, 1]` coefficients
  correctly (including reduced/equivalent forms) required more careful
  validation logic than a typical multiple-choice quiz.
- **Content correctness at scale.** With 81 lessons and hundreds of
  chemistry questions, a single wrong molar mass or unbalanced equation
  undermines trust in the whole app — every numeric problem has to be
  independently re-solved before being committed, and content schema
  validation has to run as a hard CI gate, not a manual step.
- **Auth redirect correctness on static hosting.** Running Supabase Auth
  on GitHub Pages under a repo subpath (`/Hoa_hoc_THCS/`) surfaced subtle
  Site URL / Redirect URL allowlist issues where confirmation emails
  silently redirected to the wrong place — solved with an explicit
  redirect allowlist and a generated `404.html` SPA fallback.
- **Keeping a security-sensitive dependency upgrade safe.** A routine
  "patch a few CVEs" task turned into a moving target when new advisories
  for `vite` were published _after_ the upgrade plan was already
  approved, forcing a scoped plan amendment mid-implementation rather
  than silently drifting outside the approved version range.

## Accomplishments that we're proud of

- A complete, working MVP: unit map, lesson player, four quiz types with
  real chemistry grading, XP/streak/star progression, a wrong-answer
  review loop, and a timed mock-exam mode — all in Vietnamese and aligned
  to the real THCS curriculum.
- 17 units / 81 lessons of curriculum content, each independently
  fact-checked, schema-validated, and tagged by difficulty and category.
- A dependency security posture that went from 7 known vulnerabilities
  (including one critical) down to **zero**, with automated `npm audit`
  and license-allowlist gates now enforced on every CI run so regressions
  can't sneak back in.
- Offline-friendly by default: the app keeps working with full local
  progress tracking even without a Supabase account configured.

## What we learned

- For an educational app, the content pipeline deserves as much rigor as
  the code pipeline — schema validation, fact-checking, and category
  tagging for chemistry questions caught real errors before they reached
  students.
- Progressive enhancement (local-first progress with optional cloud sync)
  is a better default for a student-facing tool than requiring an account
  up front — it removes a hard blocker for anyone who just wants to start
  practicing.
- Security and dependency hygiene are living targets, not a one-time
  checklist: a plan approved against today's advisory database can be
  outdated by the time implementation finishes, so the workflow needs a
  way to detect and re-approve scope changes safely rather than freezing
  at an initial audit snapshot.

## What's next for Hoc hoa THCS

- **Performance**: route-level code splitting and per-unit lazy content
  loading, so the initial bundle stops shipping all 17 units' worth of
  questions up front.
- **Offline-first PWA**: an installable app with a service worker that
  precaches the full curriculum, so students can keep studying with zero
  connectivity once content is cached — without ever caching auth or
  progress data.
- **End-to-end test coverage** for the full learning, review, exam, and
  auth-sync flows running against a production build in CI.
- Closing the last known CI gap (bringing the deploy workflow up to the
  same lint/test/audit bar as the main CI pipeline) and continuing to
  expand curriculum coverage.
