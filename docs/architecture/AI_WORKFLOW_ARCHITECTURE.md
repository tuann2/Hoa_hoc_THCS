# AI Workflow Architecture

- Version: 2.4
- Status: DRAFT (pending Human Project Owner approval)
- Owner: Human Project Owner
- Reviewers: role-qualified independent executions, conditional by risk tier
- Amendment history: v2.4 (WORKFLOW-004B, DRAFT) — makes governance
  provider-neutral through role contracts and execution envelopes; adds Context
  Policy and the policy-only TRIVIAL tier. v2.3 (WORKFLOW-004A) — superseded
  the manual evidence ritual with machine-generated exact-snapshot IDs, made
  `scripts/gates-manifest.ts` the canonical command source, and added the
  Deployment Invariant. v2.2 (WORKFLOW-003) — scoped documentation-only
  remediation and codified the batch-content reviewer-applies-fixes exception.
  v2.1 (WORKFLOW-002) — initial approved architecture.

---

## Purpose and precedence

When its status is APPROVED, this document is the single source of truth for
AI-assisted development in this repository. It defines responsibility,
authority, orchestration, validation, risk, documentation, quality gates,
context, and session lifecycle.

All shims, role contracts, skills, commands, and runbooks must conform after
approval. While this document is DRAFT, previously approved governance remains
authoritative; its new shim and roles operate only as a superset that cannot
weaken that governance. Its Status flips to APPROVED on Human Project Owner
approval before merge. Report a conflict in an unapproved draft to the Human
Project Owner rather than resolving it by preference.

## Goals

Reduce duplicated reasoning and unnecessary context while preserving software
quality, independent verification, and human control. It does not remove
quality gates, planning, documentation, or evidence requirements, and never
trades correctness for speed.

## Responsibility Matrix

One provider may perform different roles only in separate executions. The
execution envelope and role contract, not provider reputation, determine
authority.

| Role                 | Owns                                                                                                | Must not                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Planner              | requirements, plans, risk classification, delegation, scope checks, review orchestration            | implement substantial features or give final approval           |
| Implementer          | implementation, refactoring, debugging, validation, and handoff                                     | self-certify release readiness or exceed approved scope         |
| Independent Reviewer | fresh, read-only verification and findings                                                          | inherit implementer transcript or silently modify the candidate |
| Release Assessor     | release-readiness assessment from evidence and reviews                                              | approve release or replace required independent review          |
| Human Approver       | business decisions, priorities, plan/architecture/release approval, merge and production deployment | delegate final authority away                                   |

Each contract in `docs/roles/` declares `capabilities_required` and
permissions. All permissions default to false; the Human Approver remains the
only final authority.

## Execution envelope

Every execution must receive this envelope from the orchestrator or human:

```yaml
request_class: read-only | change | independent-review | release-assessment
assigned_role: planner | implementer | independent-reviewer | release-assessor
risk_tier: TRIVIAL | NORMAL | ELEVATED | CRITICAL
scope: { allowed_paths: [...], forbidden_paths: [...] }
candidate_sha: <sha|null>
permissions:
  {
    repository_write: bool,
    commit: bool,
    push: bool,
    merge: bool,
    deploy: bool
  }
```

Missing, malformed, or ambiguous fields mean least privilege: read-only, no
role assumption, no file changes, and no authority escalation. An execution
may write only paths allowed by its envelope and role. Commit, push, merge, and
deploy are forbidden unless the envelope grants the permission and the
required human authorization exists.

The selected execution profile must satisfy the role's
`capabilities_required` in the actual session. If it does not, the Planner
must record a safe degradation path, such as CI browser gates or external
evidence generation. Provider runbooks document known profiles; they do not
define policy.

An Independent Reviewer is a fresh execution that receives the candidate
snapshot, approved plan, and required evidence, but not the implementer's
transcript. A label or prompt inside the implementation execution is not
independent review.

## Trust Model

AI output is never trusted blindly. Every implementation needs evidence from
validation, CI, targeted diff review, independent review, and/or its handoff.
Evidence is release-valid only when it identifies the exact implementation
snapshot. A summary or successful command that cannot bind to that snapshot is
not release evidence. No role self-certifies the next role's decision.

## Independent Verification

The minimum independent verification depends on risk:

| Tier     | Required independent verification                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NORMAL   | CI validates the exact candidate commit when available; otherwise one fresh read-only reviewer inspects the targeted diff and reruns risk-relevant gates.                                 |
| ELEVATED | One fresh independent reviewer inspects every changed line, affected tests, and elevated-risk behavior. CI validates the exact candidate commit before release when available.            |
| CRITICAL | Two separate fresh independent reviewers inspect every changed line and critical failure modes, including one adversarial review. CI validates the exact candidate commit before release. |

Reviewers report findings; fixes return to implementation and remediation.
Successful, bound validation is not rerun merely to reproduce logs.

**Bounded exception — batch content review:** for NORMAL-tier learning-content
batch work only, a human may authorize reviewer-applies-fixes mode in the plan
or direct instruction. Findings remain recorded; the handoff records the
authorization source; a numeric or chemistry correction is independently
re-verified by another execution. This exception never applies to ELEVATED or
CRITICAL work.

## Risk Model

Every task has exactly one effective tier; the highest applicable tier wins.
The Planner proposes the tier, categories, and escalation rationale in the
plan. Human plan approval approves that classification. Reassess risk when
scope changes; an increase stops work until a revised plan is approved.

Classification rules:

1. CRITICAL overrides ELEVATED, NORMAL, and TRIVIAL; ELEVATED overrides NORMAL
   and TRIVIAL; NORMAL overrides TRIVIAL.
2. A change affecting production data or availability, deployment,
   infrastructure, payment, credentials, trust boundaries, security controls,
   or this architecture is CRITICAL.
3. Introducing a new dependency, external service, database, infrastructure
   component, or replacement tool is an architecture change and is CRITICAL.
4. Authentication or authorization logic is CRITICAL. Presentation-only
   changes to an existing authentication UI may remain NORMAL only when they
   cannot change identity, session, or access-control behavior.
5. A migration is at least ELEVATED; one that can execute against production,
   transform production data, or cause irreversible loss is CRITICAL.
6. Public APIs, destructive operations, and numeric or complex business logic
   are at least ELEVATED and become CRITICAL when rule 2 applies.
7. Uncertain impact or environment is classified at the next higher plausible
   tier until resolved.

### TRIVIAL policy

TRIVIAL is policy only; automated enforcement and its micro-trace schema are
deferred to WORKFLOW-004C. Its narrow allowlist is non-governance prose
documentation and typo/format fixes that do not change commands, paths,
policy, examples, technical behavior, or educational meaning. Content units
remain NORMAL initially. TRIVIAL has no full plan or handoff, but must have a
snapshot-bound micro-trace once enforcement exists.

TRIVIAL is denied for workflow shims, architecture, role contracts, context
rules, documentation rules, plans, handoffs, CI, scripts, package files,
application or test code, backend files, build/test/lint configuration, and
content schema/catalogue. Every Context Policy hard trigger applies; an
unrecognised path escalates to NORMAL.

### Examples and workflow

| Tier     | Examples                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TRIVIAL  | narrow non-governance prose typo or formatting fix                                                                                                                           |
| NORMAL   | documentation, UI, styling, non-numeric learning content, wording, small refactoring                                                                                         |
| ELEVATED | chemistry algorithms, numeric calculations, public APIs, reversible migrations, non-production destructive operations, complex business logic                                |
| CRITICAL | production migration, authentication/authorization, security controls/trust boundaries, deployment, infrastructure, payment, architecture, production destructive operations |

All non-TRIVIAL tiers use the same shape: approved plan, implementation,
validation, handoff, scope gate, independent verification, release assessment,
and Human Approval. A finding or candidate change returns work to remediation.

## Release assessment

The Release Assessor verifies requested scope, acceptance criteria, blockers,
deviations, validation evidence, implementation handoff, review outcomes, and
`git diff --stat`. It may inspect changed files for ELEVATED/CRITICAL work,
scope mismatch, failed validation, a user request, or suspicious changes. For
NORMAL work it does not inspect every changed line by default or duplicate a
completed independent review without a reason.

## Validation Model

Validation runs once for each distinct implementation snapshot. Commands that
satisfy the same gate for the same snapshot should not be duplicated.

### Evidence Binding

Every validation record contains:

- base SHA (`HEAD` when validation starts), candidate SHA or `UNCOMMITTED`, and
  clean/dirty worktree state with exact dirty paths;
- a machine-generated validated snapshot ID from `npm run evidence`;
- UTC start/completion timestamps, runtime/package-manager versions, and
  validation-tool versions or lockfile SHA;
- every command, exit status, and gate it satisfies.

The default evidence kind is `git-tree`, made through a temporary index without
mutating the real index or worktree. When git metadata cannot be written, the
fallback `manifest` is a deterministic SHA-256 over base SHA and the path,
mode, status, content hash, and tracked state of every tracked/untracked file.
Evidence names its kind. It is computed immediately before and after gates;
mismatch invalidates the run. Recomputed evidence that differs at handoff or
release time is stale.

A clean candidate commit anchors evidence and CI must name that exact commit
when CI is required or available. For a dirty worktree, the base/candidate SHA,
dirty paths, and validated snapshot ID anchor evidence. If the runtime cannot
generate evidence, its orchestrator or harness must do so; this is not
permission to omit evidence.

### Canonical Quality Gates

The approved plan may add, but not remove, applicable gates without explicit
human approval and a documented deviation. Baseline gates cover diff integrity
and formatting; documentation also validates changed links, paths, and commands;
content adds content/schema validation and relevant tests; application work
adds lint, types, tests, integration tests, and production build as applicable.
Dependencies add lockfile, vulnerability, and license checks; APIs/numeric
logic add boundary tests; security adds denial/secret/dependency checks;
migrations/destructive operations add dry-run, rollback, and recovery checks;
infrastructure/deployment adds configuration, plan, policy/security, and
rollback validation.

`scripts/gates-manifest.ts` is the only canonical source for exact gate IDs,
commands, prerequisites, and profiles. `scripts/gates.ts` selects the required
union from changed paths and fails closed for unknown paths or weakened profile
requests. CI uses those profiles. Prose documents reference the manifest rather
than copying command tables. A required gate without a repository command is a
blocker.

### Deployment Invariant

Production deploys the exact artifact that passed all required web and
browser/PWA gates for the same commit SHA. A browser/PWA failure blocks deploy;
no path bypasses this invariant. The approved bounded deviation permits a
rebuild in the same CI run and commit only to inject production configuration.

Repository enforcement: the CI deploy job runs only on the main branch after
web and browser jobs and deploys its same-run production artifact. The manual
deployment workflow requires a candidate SHA and fails closed unless the latest
completed CI run for that SHA, required jobs, and artifact all exist and pass.
The operator procedure is `docs/runbooks/DEPLOYMENT.md`.

### Remediation State Machine

```text
PLANNED -> IMPLEMENTING -> VALIDATING -> VALIDATED -> REVIEWING -> RELEASE_READY
VALIDATING -- failure --> REMEDIATION_REQUIRED
REVIEWING -- finding --> REMEDIATION_REQUIRED
ANY RELEASE-ARTIFACT CHANGE --> REMEDIATION_REQUIRED
DOCUMENTATION-ONLY CHANGE --> scoped revalidation
REMEDIATION_REQUIRED -> IMPLEMENTING
ANY STATE -- unrecoverable blocker --> BLOCKED
```

Validation reaches VALIDATED only with every applicable bound gate; review
starts only with a complete handoff. A release-artifact change after validation
invalidates prior validation and review evidence. A documentation-only change
does not invalidate engineering validation or completed tier reviews; it needs
scoped documentation gates, recorded in the handoff, and only a failure enters
remediation. A review-required change repeats applicable gates, evidence, and
all tier-required reviews. Handoff/evidence corrections do not invalidate an
unchanged candidate when they still bind to it. RELEASE_READY is an assessment,
not Human Approval.

## Documentation Contract

The implementation handoff is the only post-implementation orchestration
artifact; the approved plan is the pre-implementation authority. It contains
feature ID, risk/categories/rationale, remediation state, files changed,
snapshot anchor, `git diff --stat`, generated evidence JSON, validation record,
timestamps/versions, independent-verification identity and findings, CI result,
blockers, deviations, risks, and follow-up work. Review fields are `PENDING`
before review. Regenerate after remediation and mark superseded evidence STALE.

## Context Policy

`docs/CONTEXT_RULES.md` is the repository retrieval policy. Start from the
shim, envelope, role contract, and task-specific trigger; hard triggers always
escalate to full architecture context. Context budgets optimise routine work
but never prevent safe escalation for ELEVATED or CRITICAL work.

## Session Lifecycle and metrics

Use separated sessions: plan, implementation/handoff, independent
verification/release assessment, and Human decision. Remediation returns to
implementation and refreshed evidence before reassessment. Avoid multi-hour
interactive sessions.

Metrics must come from repository artifacts, not estimates: implementation
executions, sessions, validation reruns, remediation rounds, and time from plan
approval to release readiness. Context size can be tracked prospectively only;
do not fabricate retrospective values.

The v2.2 quantitative targets are one implementation execution for NORMAL
work, no more than two sessions, and zero validation reruns.

## Migration History

- v2.1 (WORKFLOW-002, 2026-07-11): initial approved architecture.
- v2.2 (WORKFLOW-003, 2026-07-12): scoped documentation remediation and
  batch-content review exception.
- v2.3 (WORKFLOW-004A, 2026-07-18): machine-generated evidence, gate manifest,
  and deployment invariant.
- v2.4 (WORKFLOW-004B, DRAFT): provider-neutral roles/envelope/context policy
  and policy-only TRIVIAL tier; activation awaits human approval.

## Design Principles

1. Human remains the final authority.
2. Roles optimise responsibility boundaries, not provider identity.
3. Implementers own engineering execution.
4. Evidence is more important than summaries.
5. Risk determines workflow complexity.
6. Context is a limited resource, never a safety ceiling.
7. Every workflow step must justify its cost.
8. Minimise duplicated reasoning before minimising validation.
9. Optimise for sustainable long-term development, not shortest execution time.
10. Architecture changes require human approval.
