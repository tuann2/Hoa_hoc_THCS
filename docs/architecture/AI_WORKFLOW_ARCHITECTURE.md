# AI Workflow Architecture

- Version: 2.2
- Status: APPROVED
- Owner: Human Project Owner
- Reviewers: Claude, Codex, Gemini (conditional by risk tier)
- Amendment history: v2.2 (WORKFLOW-003) — removed the unimplementable
  tree-SHA evidence requirement, scoped documentation-only remediation to
  match `docs/DOCUMENTATION_RULES.md`, condensed duplicated sections,
  replaced unmeasurable success metrics with countable ones, and codified
  the batch-content reviewer-applies-fixes exception. v2.1 (WORKFLOW-002)
  — initial approved architecture.

---

## Purpose

When its `Status` is `APPROVED`, this document is the single source of truth
for AI-assisted development within this repository.

It defines:

- responsibilities
- authority
- orchestration
- validation
- risk management
- documentation contracts
- quality gates
- session lifecycle

Every implementation document (`CLAUDE.md`, `AI_WORKFLOW.md`, `AGENTS.md`,
skills, commands and runbooks) MUST conform to this specification after this
document is approved.

Precedence is conditional:

- When `Status: APPROVED`, this architecture prevails over conflicting
  implementation documents.
- When `Status` is not `APPROVED`, the currently approved implementation
  documents remain authoritative. This draft MUST NOT activate new workflow
  rules.
- A conflict found while this document is not approved MUST be reported to the
  Human Project Owner and MUST NOT be resolved by an agent choosing its
  preferred rule.

---

## Goals

Primary goals

- Reduce Claude token consumption.
- Reduce duplicated reasoning.
- Preserve software quality.
- Preserve independent verification.
- Keep human in control.

Non-goals

- Remove quality gates.
- Remove planning.
- Remove documentation.
- Blindly trust AI-generated summaries.
- Maximize speed at the expense of correctness.

---

## Architecture Overview

Human → Claude (Project Architect) → Codex (Engineering Engine) →
Risk-Tier Reviewers (Independent Codex / Gemini) → Claude (Release
Readiness Assessment) → Human (Final Approval).

Claude is never the final approver.

---

## Responsibility Matrix

### Human

Owns

- business decisions
- priorities
- architecture approval
- release approval
- production deployment

Human is the only final authority.

---

### Claude

Claude is the Architect.

Responsibilities

- requirement analysis
- implementation planning
- orchestration
- task decomposition
- risk classification
- scope verification
- release-readiness assessment

Claude SHOULD NOT

- implement features
- rewrite large code
- rerun successful engineering validation
- perform full repository review
- duplicate Codex engineering work

---

### Codex

Codex is the primary engineer.

Responsibilities

- implementation
- refactoring
- debugging
- lint
- build
- tests
- implementation handoff

Codex owns engineering execution.

---

### Gemini

Gemini is an independent reviewer.

Gemini is not required for `NORMAL` or `ELEVATED` work unless explicitly
requested. Gemini is required for `CRITICAL` work by the Risk Matrix. If Gemini
is unavailable, the critical review gate is blocked until the human approves an
equally independent replacement reviewer; it MUST NOT be silently skipped.

---

## Trust Model

AI output is never trusted blindly.

Every implementation must be supported by evidence.

Evidence may include

- validation results
- CI status
- implementation handoff
- targeted diff review
- independent review

Claude does not blindly trust Codex.

Codex does not self-certify release readiness.

Human does not blindly trust Claude.

Evidence is valid only when it identifies the exact implementation snapshot
that produced it. A summary, successful command result or review that cannot be
bound to that snapshot is not release evidence.

---

## Independent Verification

An independent verifier MUST NOT be the implementation execution that authored
the candidate. Independence may be provided by CI running against the exact
candidate commit or by a fresh, read-only agent execution with no inherited
implementation context. A new label or prompt inside the implementation
execution is not independent verification.

The minimum requirement depends on risk:

| Tier     | Required independent verification                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NORMAL   | CI MUST validate the exact candidate commit when available. If CI is unavailable before approval, use one fresh read-only reviewer to inspect the targeted diff and rerun the risk-relevant gate or gates. |
| ELEVATED | A fresh Codex review execution MUST inspect every changed line, affected tests and the elevated-risk behavior. CI MUST validate the exact candidate commit before release when CI is available.            |
| CRITICAL | A fresh Gemini review and a separate fresh Codex adversarial review MUST inspect every changed line and critical failure modes. CI MUST validate the exact candidate commit before release.                |

Reviewers MUST report findings rather than silently modify the candidate. Fixes
return to the implementation and remediation flow. Successful validation MUST
NOT be rerun by Claude merely to reproduce logs when valid, bound evidence or CI
already satisfies the required gate.

**Bounded exception — batch content review:** for `NORMAL`-tier learning
content batch review only, the human may authorize a
**reviewer-applies-fixes** mode (in the plan, or by direct mid-feature
instruction) in which the reviewing execution also applies the fixes
instead of only reporting them. This exception does not relax the
"reviewers report findings only" rule for `CLAUDE.md` or `AGENTS.md`
outside this specific case. Conditions: findings are still recorded (a
consolidated findings file or per-commit messages); the handoff MUST
record the authorization source (the plan section, or a quoted excerpt of
the direct instruction) whenever this mode is used; any numeric/chemistry
correction still requires independent re-verification of the corrected
value **by an execution other than the one that applied the fix**; this
mode MUST NOT be used for `ELEVATED` or `CRITICAL` work. Precedent:
FEATURE-012 Phase B (`docs/plans/FEATURE-012.md`, "Workflow revision
2026-07-12").

---

## Risk Model

Every task is assigned exactly one effective risk tier.

If multiple categories apply, the highest tier wins.

Claude proposes the tier during planning. The approved plan MUST record the
tier, the applicable categories and the reason for any escalation. Human plan
approval also approves that classification. Risk MUST be reassessed when scope
changes; if the effective tier increases, work stops until the revised plan is
approved.

Classification rules:

1. `CRITICAL` always overrides `ELEVATED` and `NORMAL`; `ELEVATED` always
   overrides `NORMAL`.
2. Any change that can affect production data, production availability,
   deployment, infrastructure, payment processing, credentials, trust
   boundaries, security controls, or this architecture itself is
   `CRITICAL`.
3. Authentication or authorization logic is `CRITICAL`. Presentation-only
   changes to an existing authentication UI may remain `NORMAL` only when they
   cannot change identity, session or access-control behavior.
4. A migration is at least `ELEVATED`. A migration that can execute against
   production, transform production data or cause irreversible data loss is
   `CRITICAL`.
5. Public APIs, destructive operations and numeric or complex business logic
   are at least `ELEVATED`; they become `CRITICAL` when rule 2 applies.
6. A task whose impact or environment is uncertain is classified at the next
   higher plausible tier until the uncertainty is resolved.

---

### Examples by tier

| Tier       | Examples                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NORMAL`   | documentation, UI, styling, non-numeric learning content, wording, small refactoring                                                                                                               |
| `ELEVATED` | chemistry algorithms, numeric calculations, public APIs, non-production or reversible migrations, non-production destructive operations, complex business logic                                    |
| `CRITICAL` | production migration, authentication and authorization logic, security controls and trust boundaries, deployment, infrastructure, payment, architecture changes, production destructive operations |

### Workflow by tier

All tiers share the same 8-step shape; only the gate and review steps scale
with risk. Each cell is the tier-specific variant of that step; the
Independent Verification table above is the normative detail for step 6 —
it is not repeated here.

| Step                        | NORMAL                                 | ELEVATED                             | CRITICAL                                                 |
| --------------------------- | -------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| 1. Plan                     | Plan                                   | Plan                                 | Plan                                                     |
| 2. Implementation           | Codex                                  | Codex                                | Codex                                                    |
| 3. Validation               | Validation                             | Validation                           | Validation                                               |
| 4. Handoff                  | Implementation Handoff                 | Implementation Handoff               | Implementation Handoff                                   |
| 5. Claude gate              | Lightweight Gate                       | Scope Gate                           | Scope Gate                                               |
| 6. Independent verification | see table above (CI or fresh reviewer) | see table above (fresh Codex review) | see table above (fresh Gemini + fresh Codex adversarial) |
| 7. Release readiness        | Release Readiness                      | Release Readiness                    | Release Readiness                                        |
| 8. Approval                 | Human Approval                         | Human Approval                       | Human Approval                                           |

All tiers follow the remediation state machine. A finding or candidate change
returns the work to implementation and validation rather than continuing to
release readiness.

---

## Claude Gates

Claude performs lightweight governance.

Claude verifies

- requested scope
- acceptance criteria
- blockers
- deviations
- validation evidence
- implementation handoff
- git diff --stat

Claude MAY inspect changed files when

- risk tier is `ELEVATED` or `CRITICAL`
- scope mismatch
- failed validation
- user request
- suspicious changes

For `NORMAL` work, Claude SHOULD NOT inspect every changed line by default.
Independent reviewers perform the line-level review required by the effective
risk tier. Claude targets investigation and does not duplicate a completed
independent review without a specific reason.

---

## Validation Model

Validation executes once for each distinct implementation snapshot. Commands
that provide the same gate for the same snapshot SHOULD NOT be duplicated.

### Evidence Binding

Every validation record MUST contain:

- base commit SHA (`HEAD` when validation started);
- candidate commit SHA, or `UNCOMMITTED` before a candidate commit exists;
- worktree state: `clean` (matches the named commit exactly), or, whenever
  any tracked file differs from the named commit, `dirty` plus the exact
  dirty paths **and** the output of `git stash create` run against that
  worktree state (a commit SHA that captures the exact dirty content without
  altering the working tree or index — this is the content-binding anchor
  for uncommitted or partially-committed changes; re-running it after
  further edits MUST produce a different SHA, which is how a stale
  re-presentation of old evidence is caught);
- UTC validation start and completion timestamps in ISO 8601 format;
- operating runtime and package-manager versions;
- the version of every validation tool, or the lockfile SHA when the lockfile
  deterministically pins those versions;
- every command executed, its exit status and the gate it satisfies.

Once a candidate commit exists and the worktree is clean, that commit SHA is
the evidence anchor; a CI run reference for that exact SHA MUST be added
when CI is required or available for the effective risk tier (see
Independent Verification) — CI evidence MUST name that exact commit SHA, and
evidence from another commit is stale even when the diff appears equivalent.
Whenever the worktree is dirty — whether or not a candidate commit exists
yet — the base or candidate commit SHA plus the dirty paths plus the
`git stash create` SHA is the evidence anchor. There is no separate
tree-object requirement beyond this: `git stash create` is an ordinary,
already-available git command, so no undefined "canonical evidence command"
is needed.

### Canonical Quality Gates

The following are minimum gates. The approved plan MAY add gates but MUST NOT
remove an applicable gate without explicit human approval and a documented
deviation.

“Baseline gates” means the gates in the `All changes` row.

| Change type                          | Required gates                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| All changes                          | `git diff --check`; formatting check for every changed supported file                                                          |
| Documentation only                   | Baseline gates; validate changed links, paths and documented commands when applicable                                          |
| Learning content or content schema   | Baseline gates; content/schema validation; relevant unit tests; build when content is bundled or parsed during build           |
| Application source or runtime config | Baseline gates; lint; type checking; unit tests; applicable integration tests; production build                                |
| Tests only                           | Baseline gates; lint/type checking when applicable; execute the changed tests and the affected test suite                      |
| Dependencies or lockfiles            | Application gates; lockfile consistency; dependency vulnerability and license-policy checks                                    |
| Public API or complex/numeric logic  | Application gates; contract or numeric tests covering boundaries and failure cases                                             |
| Auth, security or permissions        | Application gates; security-specific tests; authorization-denial cases; secret scanning; dependency vulnerability checks       |
| Migration or destructive operation   | Application gates where applicable; migration dry run; forward/rollback verification; backup and recovery procedure validation |
| Infrastructure or deployment         | Baseline gates; configuration validation; dry run or plan; policy/security scan; rollback procedure validation                 |

For this repository, the canonical commands are:

```bash
git diff --check
npm run format:check
npm run validate-content
npm run lint
npm run typecheck
npm test
npm run build
```

Only the commands applicable under the table need to run. A composite command
may satisfy a listed sub-gate when its output proves that the sub-gate ran
successfully for the same snapshot. Integration, security, migration and
infrastructure commands MUST be named in the approved plan when applicable.

A required gate that has no repository command is a blocker, not permission to
skip it. The plan must add the gate or record an explicitly human-approved
alternative before release readiness.

### Remediation State Machine

Each candidate has exactly one state:

```text
PLANNED
  -> IMPLEMENTING
  -> VALIDATING
  -> VALIDATED
  -> REVIEWING
  -> RELEASE_READY

VALIDATING -- failure --> REMEDIATION_REQUIRED
REVIEWING -- finding --> REMEDIATION_REQUIRED
ANY RELEASE-ARTIFACT CHANGE --> REMEDIATION_REQUIRED
DOCUMENTATION-ONLY CHANGE --> scoped revalidation (see rule 3)
REMEDIATION_REQUIRED -> IMPLEMENTING
ANY STATE -- unrecoverable blocker --> BLOCKED
```

Transition rules:

1. `VALIDATING` reaches `VALIDATED` only when every applicable gate passes and
   the evidence is bound to the implementation snapshot.
2. `VALIDATED` reaches `REVIEWING` only when the handoff is complete.
3. A post-validation change to a **release-artifact-affecting file**
   (application source, tests, learning content, runtime and toolchain
   configuration, dependencies, migrations, infrastructure or deployment
   files) immediately invalidates all validation and review evidence for
   the prior snapshot. A post-validation change to **documentation only**
   does not invalidate engineering validation or completed tier reviews;
   it requires only the "Documentation only" gates on the changed files,
   per `docs/DOCUMENTATION_RULES.md` → "Documentation → Revalidate".
   Record the scoped revalidation result in the handoff without changing
   the candidate's `Status`; only a failed scoped gate moves the
   candidate to `REMEDIATION_REQUIRED`, and only for that documentation
   fix.
4. A review finding that requires a candidate change enters
   `REMEDIATION_REQUIRED`. After the fix, the candidate MUST repeat all
   applicable gates, regenerate its evidence and repeat every review required
   by its risk tier.
5. Corrections limited to the handoff or generated evidence do not invalidate
   engineering validation; the corrected evidence MUST still bind to the
   unchanged candidate commit, or the unchanged base commit + dirty paths +
   `git stash create` SHA.
6. `RELEASE_READY` is an assessment, not final approval. Only the human may
   approve release.

---

## Documentation Contract

The implementation handoff is the only post-implementation orchestration
artifact. The approved plan remains the pre-implementation authority. No
duplicate `Result.md` should exist.

It must contain

- feature id
- risk tier
- applicable risk categories and escalation rationale
- current remediation state
- files changed
- base commit SHA
- candidate commit SHA or `UNCOMMITTED`
- worktree state: clean, or dirty with exact paths plus the `git stash
create` SHA
- `git diff --stat`
- validation commands
- command exit statuses and the quality gate satisfied by each command
- validation start and completion timestamps in UTC
- runtime, package-manager and validation-tool versions or lockfile SHA
- independent verifier identity, execution identifier and independence method
- review findings and their disposition
- authorization source for the batch-content-review exception, when used
  (see Independent Verification)
- CI commit SHA and status when CI is required or available
- blockers
- deviations
- remaining risks
- follow-up work

The handoff is a living artifact. Before independent review, review-specific
fields MUST be present with the value `PENDING`. Review outcomes update those
fields without invalidating an unchanged candidate commit.

The handoff MUST be regenerated after remediation. Historical evidence may be
retained for audit, but it MUST be marked `STALE` and MUST NOT be presented as
release evidence.

---

## Context Budget

Claude should consume

- implementation handoff
- git diff --stat
- concise validation summary

Avoid

- successful full logs
- complete test output
- full git diff
- build artifacts

Target investigation only.

---

## Session Lifecycle

Each feature should follow an independent lifecycle:

1. **Session 1** — planning, then end session.
2. Codex executes asynchronously and produces the implementation handoff.
3. **Session 2** — independent verification and release-readiness
   assessment, then human decision, then end session.
4. If remediation is required, return asynchronously to Codex
   implementation, validation and an updated handoff before reassessment
   (repeat from step 2).

Avoid multi-hour interactive Claude sessions.

---

## Success Metrics

Metrics MUST be derived from repository artifacts (git history, handoffs),
not estimated. Two metrics — Claude session count and context size — have
no recorded instrument in this repository and cannot be measured
retroactively; they can only be tracked prospectively starting with the
next feature. Fabricating a value for them would violate the Trust Model.

Tracked per feature

- Codex implementation executions (target: 1 for `NORMAL`)
- Claude sessions (target: ≤2 for `NORMAL`; not yet instrumented — track
  going forward)
- validation reruns by Claude of already-passed gates (target: 0)
- review/remediation rounds
- wall-clock from plan approval to `RELEASE_READY`

Retrospective baseline (measured 2026-07-12 from git history; WORKFLOW-002
Phase 3 closed by this measurement)

| Feature     | Commits | Plan-approval → merge span          | Remediation rounds                                                  |
| ----------- | ------- | ----------------------------------- | ------------------------------------------------------------------- |
| FEATURE-011 | 5       | 2026-07-10, same day                | 1 (Gemini review caught a streak-merge regression)                  |
| FEATURE-012 | 51      | 2026-07-10 → 2026-07-12 (multi-day) | recorded per-unit in commit messages (e.g. "sửa 9 điểm sau review") |

FEATURE-012 used the batch-content workflow (A5), not the standard
single-Codex-delegation flow, so its commit count is not representative of
a "normal feature" baseline — it is included for the remediation-round
evidence in its commit messages, not as a session-count proxy.

---

## Migration History

- **v2.1 (WORKFLOW-002, 2026-07-11):** architecture approved; `CLAUDE.md`,
  `AI_WORKFLOW.md`, `AGENTS.md`, skills and templates migrated to comply.
  Phase 3 (dry-run measurement) deferred.
- **v2.2 (WORKFLOW-003, 2026-07-12):** amendments A1–A5 (see header);
  Phase 3 closed by the retrospective baseline above.

---

## Design Principles

1. Human remains the final authority.
2. Claude optimizes reasoning, not engineering.
3. Codex owns engineering execution.
4. Evidence is more important than summaries.
5. Risk determines workflow complexity.
6. Context is a limited resource.
7. Every workflow step must justify its cost.
8. Minimize duplicated reasoning before minimizing validation.
9. Optimize for sustainable long-term development, not shortest execution time.
10. Architecture changes require human approval.
