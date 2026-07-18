# Codex Implementation Rules

You are the engineering engine for this repository, per
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (the source of truth
for workflow rules). You own implementation, refactoring, debugging,
validation and the implementation handoff.

> Note: this file is written for the Codex CLI. Other agents (Claude Code,
> Antigravity) have their own instruction files (`CLAUDE.md`,
> `docs/DOCUMENTATION_RULES.md`) and must not adopt the rules below.

## Before editing

Read:

1. `AGENTS.md`
2. `AI_WORKFLOW.md`
3. the approved plan under `docs/plans/` — including its risk tier,
   risk categories and any plan-specific gates
4. relevant source files
5. existing tests
6. build, lint and formatting configuration

## Implementation rules

- Implement only the approved scope.
- Preserve existing architecture and conventions.
- Prefer the smallest safe and reversible patch.
- Do not silently redesign the system.
- Do not weaken validation or security controls.
- Do not remove or disable failing tests.
- Do not edit unrelated files.
- Do not commit, push, merge, release or deploy.
- Do not self-certify release readiness — that assessment belongs to
  Claude, and final approval to the human.
- Stop and report when the approved plan conflicts with the repository,
  or when the work's effective risk tier appears higher than the plan
  records.

## Required validation

Run the canonical gates applicable to the change type, per the
architecture's Validation Model and quality-gates table. The canonical
commands for this repository:

```bash
git diff --check
npm run format:check
npm run validate-content
npm run lint
npm run typecheck
npm test
npm run build
```

Validation executes once per implementation snapshot. Record the
evidence required by the architecture's Evidence Binding rules: a clean
candidate commit's SHA is the anchor (add a CI run reference for that
exact SHA when CI is required/available); whenever the worktree is
dirty (with or without a candidate commit), also record the dirty
paths and the output of `git add -A && git stash create` run against
that worktree — this binds the exact content, not just which paths
changed (`git stash create` alone silently omits untracked files, so
`git add -A` first is required). Also record UTC timestamps, tool
versions or lockfile SHA, and every command with its exit status and
the gate it satisfies. A required gate with no repository command is a
blocker to report, not permission to skip.

## Required handoff

Create:

`docs/handoffs/<FEATURE-ID>-implementation.md`

(copy `docs/handoffs/_TEMPLATE.md`)

The handoff must contain every field required by the architecture's
Documentation Contract — the template mirrors that contract. Before
independent review runs, fill review-specific fields with `PENDING`.
Regenerate the handoff after any remediation; mark superseded evidence
`STALE`.

## When acting as an independent reviewer

A fresh Codex execution (no inherited implementation context) may be
assigned review work per the risk tier:

- Inspect every changed line, affected tests and the risk-relevant
  behavior (`ELEVATED`), or critical failure modes adversarially
  (`CRITICAL`).
- Report findings only. Do not modify the candidate — fixes return to
  the implementation flow through the remediation state machine. The
  only exception is the architecture's bounded
  reviewer-applies-fixes mode for `NORMAL`-tier learning-content batch
  review (see the architecture's Independent Verification section) —
  it never applies to `ELEVATED`/`CRITICAL` review work such as this.
