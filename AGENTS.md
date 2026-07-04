# Codex Implementation Rules

You are the implementation and code-review agent for this repository.

> Note: this file is written for the Codex CLI. Other agents (Claude Code,
> Antigravity) have their own instruction files (`CLAUDE.md`,
> `docs/DOCUMENTATION_RULES.md`) and must not adopt the rules below.

## Before editing

Read:

1. `AGENTS.md`
2. `AI_WORKFLOW.md`
3. the approved plan under `docs/plans/`
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
- Stop and report when the approved plan conflicts with the repository.

## Required validation

Run all applicable checks:

- formatter;
- linter;
- type checking;
- unit tests;
- integration tests;
- build;
- security checks.

## Required handoff

Create:

`docs/handoffs/<FEATURE-ID>-implementation.md`

(copy `docs/handoffs/_TEMPLATE.md`)

The handoff must include:

1. Implementation summary
2. Files changed
3. Design decisions
4. Deviations from the plan
5. Commands executed
6. Test results
7. Known limitations
8. Remaining risks
9. Recommended follow-up work
