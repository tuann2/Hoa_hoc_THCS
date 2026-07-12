# AI Workflow Architecture

- Version: 2.1
- Status: APPROVED
- Owner: Human Project Owner
- Reviewers: Claude, Codex, Gemini (conditional by risk tier)

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

Human
↓

Claude
(Project Architect)

↓

Codex
(Engineering Engine)

↓

Risk-Tier Reviewers
(Independent Codex / Gemini)

↓

Claude
(Release Readiness Assessment)

↓

Human
(Final Approval)

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
   boundaries or security controls is `CRITICAL`.
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

### NORMAL

Examples

- documentation
- UI
- styling
- non-numeric learning content
- wording
- small refactoring

Workflow

Plan

↓

Codex Implementation

↓

Validation

↓

Implementation Handoff

↓

Claude Lightweight Gate

↓

Independent Verification

↓

Release Readiness

↓

Human Approval

---

### ELEVATED

Examples

- chemistry algorithms
- numeric calculations
- public APIs
- non-production or reversible migrations
- non-production destructive operations
- complex business logic

Workflow

Plan

↓

Codex

↓

Validation

↓

Implementation Handoff

↓

Claude Scope Gate

↓

Fresh Codex Independent Review

↓

Release Readiness

↓

Human Approval

---

### CRITICAL

Examples

- production migration
- authentication and authorization logic
- security controls and trust boundaries
- deployment
- infrastructure
- payment
- architecture changes
- production destructive operations

Workflow

Plan

↓

Codex

↓

Validation

↓

Implementation Handoff

↓

Claude Scope Gate

↓

Fresh Gemini Independent Review

↓

Fresh Codex Adversarial Review

↓

Release Readiness

↓

Human Approval

---

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
- validated implementation-tree SHA;
- dirty-worktree state and the exact paths that were dirty;
- UTC validation start and completion timestamps in ISO 8601 format;
- operating runtime and package-manager versions;
- the version of every validation tool, or the lockfile SHA when the lockfile
  deterministically pins those versions;
- every command executed, its exit status and the gate it satisfies.

The validated implementation tree covers every release-affecting source,
content, documentation, test, dependency, configuration, migration,
infrastructure and deploy path. Its SHA is a Git tree-object ID produced by the
repository's canonical evidence command. The handoff itself and generated
validation logs are excluded to avoid a self-referential tree hash. The handoff
MUST list the excluded paths. A reviewer MUST be able to recompute the
implementation-tree SHA from the recorded base, dirty paths and exclusions.

Once a candidate commit exists, CI evidence MUST name that exact commit SHA.
Evidence from another commit or tree is stale even when the diff appears
equivalent.

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
ANY POST-VALIDATION CANDIDATE CHANGE --> REMEDIATION_REQUIRED
REMEDIATION_REQUIRED -> IMPLEMENTING
ANY STATE -- unrecoverable blocker --> BLOCKED
```

Transition rules:

1. `VALIDATING` reaches `VALIDATED` only when every applicable gate passes and
   the evidence is bound to the implementation snapshot.
2. `VALIDATED` reaches `REVIEWING` only when the handoff is complete.
3. Any post-validation change to a release-affecting file, including source,
   content, documentation, tests, dependencies, configuration, migrations,
   infrastructure or deployment files, immediately invalidates all validation
   and review evidence for the prior snapshot.
4. A review finding that requires a candidate change enters
   `REMEDIATION_REQUIRED`. After the fix, the candidate MUST repeat all
   applicable gates, regenerate its evidence and repeat every review required
   by its risk tier.
5. Corrections limited to the handoff or generated evidence do not invalidate
   engineering validation, but the corrected evidence MUST still bind to the
   unchanged implementation-tree SHA.
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
- validated implementation-tree SHA
- implementation-tree exclusions
- dirty-worktree state and exact dirty paths
- `git diff --stat`
- validation commands
- command exit statuses and the quality gate satisfied by each command
- validation start and completion timestamps in UTC
- runtime, package-manager and validation-tool versions or lockfile SHA
- independent verifier identity, execution identifier and independence method
- review findings and their disposition
- CI commit SHA and status when CI is required or available
- blockers
- deviations
- remaining risks
- follow-up work

The handoff is a living artifact. Before independent review, review-specific
fields MUST be present with the value `PENDING`. Review outcomes update those
fields without invalidating an unchanged implementation tree.

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

Each feature should follow an independent lifecycle.

Session 1

Planning

↓

End Session

↓

Codex executes asynchronously

↓

Implementation Handoff

↓

Session 2

Independent Verification and Release Readiness Assessment

↓

If remediation is required, return asynchronously to Codex implementation,
validation and an updated handoff before reassessment.

↓

Human Decision

↓

End Session

Avoid multi-hour interactive Claude sessions.

---

## Success Metrics

Current Baseline

(Substitute with measured values)

- Claude Agent Usage: 52%
- Long Sessions (>8h): 75%
- Large Context (>150k): 64%

Target

- Agent usage <25%
- Average context <60k
- Normal feature = one Codex execution
- No routine Claude validation rerun
- Session duration <90 minutes
- PASS/BLOCK decision <5 minutes after handoff

---

## Migration Strategy

Phase 1

Architecture approval.

No implementation changes.

---

Phase 2

Update

- CLAUDE.md
- AI_WORKFLOW.md
- AGENTS.md
- skills
- runbooks
- templates
- canonical validation and evidence-binding commands

to comply with this architecture.

---

Phase 3

Dry-run

Normal

Elevated

Critical

Collect

- token usage
- context size
- session duration
- Codex executions
- review quality

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
