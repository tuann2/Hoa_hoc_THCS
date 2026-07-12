---
name: feature-delivery
description: Run the full plan → approve → Codex implement → verify → review → document workflow for a feature. Use when the user asks to deliver, build, or implement a feature end-to-end following the repository AI workflow.
---

# Feature Delivery Workflow

Run the repository's standard delivery pipeline for the feature the user
describes. This skill is a thin orchestration layer over
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` — the normative source
for tier workflows, review requirements, remediation and validation. It
does not redefine that policy; it only adds this repository's concrete
invocation mechanics. For further project mechanics see `CLAUDE.md` and
`AI_WORKFLOW.md`.

This repository has CI: `.github/workflows/ci.yml` runs lint, typecheck,
test and build on push to `feature/**` and on pull requests.

## Steps 1–4 (all tiers)

1. **Assign a feature ID** (`FEATURE-NNN`, next unused number in
   `docs/plans/`).
2. **Plan**: inspect the repository, copy `docs/plans/_TEMPLATE.md` to
   `docs/plans/<FEATURE-ID>.md`, fill it in completely — including risk
   tier, risk categories, escalation rationale, change type and quality
   gates per the architecture's Risk Model and Validation Model. Do not
   touch application code.
3. **Approval gate**: present the plan (including the proposed risk
   tier) and stop. Only continue after the user explicitly approves;
   then set the plan status to `APPROVED`. Approval covers the risk
   classification.
4. **Delegate to Codex** — exactly one default implementation +
   validation execution per snapshot; do not launch a second one unless
   remediation requires it:
   `/codex:rescue --fresh --background implement <FEATURE-ID> according to docs/plans/<FEATURE-ID>.md. Read AGENTS.md and AI_WORKFLOW.md first. Implement only the approved scope, add or update tests, run the applicable canonical gates, do not commit or push, and create docs/handoffs/<FEATURE-ID>-implementation.md per the template with snapshot-bound evidence.`
   Prefer ending the session here and reassessing in a fresh session
   once the handoff exists (architecture Session Lifecycle).

From here the path depends on the plan's risk tier.

## NORMAL

Follow the `NORMAL` workflow defined in the architecture:

```
Plan → Human approval → Codex implementation → Validation
  → Implementation handoff → Independent verification
  → Claude Release Readiness Gate → Human decision
```

Independent verification and the Claude gate are distinct, sequential
steps — the gate reads the verification result, it does not perform it.
This skill adds:

- **Independent verification**: check GitHub Actions CI for the exact
  candidate commit SHA first (PR checks, or
  `gh api repos/:owner/:repo/commits/<sha>/check-runs`); use that result
  as the evidence when it exists. If CI has not run for that commit,
  apply the architecture's `NORMAL` fallback — one fresh read-only
  reviewer inspects the targeted diff and reruns only the risk-relevant
  gate(s).
- **Claude Release Readiness Gate**: handoff + `git diff --stat` + the
  independent-verification result from the prior step. Do not rerun
  validation, do not inspect every changed line by default, and do not
  run a fresh Codex or Gemini review — those belong to
  `ELEVATED`/`CRITICAL` only.
- Do not execute the documentation agent as a required gate — only when
  the feature's scope needs a doc update (see "Documentation", below).

## ELEVATED

Follow the `ELEVATED` workflow defined in the architecture:

```
Plan → Codex implementation → Validation → Implementation handoff
  → Claude scope gate (targeted inspection) → Fresh Codex independent
  review → CI validation of the candidate commit → Release-readiness
  assessment → Human approval
```

This skill adds:

- **Independent review invocation**: `/codex:review --base main --background`
  — shorthand for a fresh `codex:codex-rescue` execution with no inherited
  implementation context (see "Invoking Codex from Claude" in
  `AI_WORKFLOW.md` for the underlying `Agent(...)` call).
- **CI validation**: confirm GitHub Actions CI succeeded for the exact
  candidate commit when CI is available for that commit (architecture
  Independent Verification table, `ELEVATED` row). Do not restate CI's
  gate list here — it runs the canonical commands defined in
  `.github/workflows/ci.yml` and the architecture's Validation Model.

## CRITICAL

Follow the `CRITICAL` workflow defined in the architecture:

```
Plan → Codex implementation → Validation → Implementation handoff
  → Claude scope gate (targeted inspection) → Fresh Gemini independent
  review + Fresh Codex adversarial review → CI validation of the
  candidate commit → Release-readiness assessment → Human approval
```

This skill adds:

- **Independent review invocations**, both required, run in parallel:
  - Gemini — `agy --model "Gemini 3.5 Flash (High)" --add-dir <repo> -p "..."`, synchronous, per `AI_WORKFLOW.md`. Not skippable: if
    Gemini is unavailable, this gate is blocked until the human approves
    an equally independent replacement reviewer.
  - Codex adversarial — `/codex:adversarial-review` — shorthand for a
    fresh `codex:codex-rescue` execution with an adversarial-review
    prompt, no inherited implementation context.
- **CI validation**: GitHub Actions CI must have succeeded for the exact
  candidate commit before release (architecture Independent
  Verification table, `CRITICAL` row).

## Remediation (all tiers)

Follow the architecture's remediation state machine: a confirmed review
finding, or any modification to a **release-artifact-affecting** file
(source, content, tests, dependencies, configuration, migrations,
infrastructure, deployment) made after validation or review already ran
invalidates that snapshot's evidence and moves the candidate to
`REMEDIATION_REQUIRED`, regardless of tier. A **documentation-only**
change after validation does not invalidate engineering/review
evidence — see "Documentation" below. Send Codex a numbered list of
specific issues via `/codex:rescue --resume` — never "fix everything".

## Documentation (when applicable)

Coordinate documentation per `docs/DOCUMENTATION_RULES.md` — not a
mandatory gate for every feature, only when the feature's scope actually
requires a doc update.

Per the architecture's Remediation State Machine rule 3, a
documentation-only change made after validation or review already ran
does **not** invalidate the engineering validation or completed tier
reviews — it only requires the scoped "Documentation only" gates on the
changed files:

```
Documentation change
  ↓
Run baseline + link/path/command checks on the changed doc files only
  ↓
Record the scoped revalidation result in the handoff
  ↓
Claude Release Readiness Gate
  ↓
Human
```

A change to a release-artifact-affecting file (not documentation) still
follows the full "Remediation" path above.

**Ownership**: the execution that made the documentation change (Codex,
Antigravity, or whichever execution touched the files) owns the scoped
documentation validation and its record in the handoff — per
`docs/DOCUMENTATION_RULES.md` → "Documentation → Revalidate". Claude
does not become the validator merely because documentation changed;
Claude's role stays the Release Readiness Gate.

## Deliver

Human approves, commits and merges — or authorizes Claude to
commit/push per `CLAUDE.md`. Claude is never the final approver.

## Hard rules

- Never start step 4 before explicit plan approval.
- Never commit, push, merge or deploy without human authorization.
- Never skip or silently substitute a required review gate; if a
  required reviewer is unavailable, the gate is blocked until the human
  approves a replacement.
- Never run a heavier review than the tier requires as a substitute for
  a lighter one, and never treat a lighter check as satisfying a
  heavier tier's required review.
- Stop and report if the plan conflicts with the repository, or if
  scope changes raise the effective risk tier — work stops until the
  revised plan is approved.
