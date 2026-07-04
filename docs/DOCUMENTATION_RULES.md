# Documentation Rules

Rules for the documentation agent (Antigravity/Gemini). Load this file via
an explicit prompt — do not rely on auto-loading `AGENTS.md`, which is
written for Codex.

## Preconditions

Documentation work starts only after:

- code passed review;
- build and tests pass;
- the implementation handoff exists under `docs/handoffs/`;
- Claude Code confirmed the implementation matches the approved plan.

## Allowed files

- `README.md`
- `CHANGELOG.md`
- `docs/**`
- API specification files

## Forbidden files

- `src/**`
- `tests/**`
- dependency files
- runtime configuration
- database migrations

## General principles

- Document actual implemented behavior.
- Do not document planned but unimplemented behavior.
- Verify commands and paths against the repository.
- Use complete, runnable examples.
- State prerequisites explicitly.
- Explain failure modes and rollback steps.
- Never include real secrets, tokens or credentials.

## Required documentation

When applicable, update:

- README
- API reference
- configuration reference
- operational runbook
- troubleshooting guide
- ADR
- changelog
- migration notes

## Style

- Use concise headings.
- Prefer examples over abstract descriptions.
- Use consistent terminology.
- Mark destructive commands clearly.
- Distinguish required configuration from optional configuration.
- Include expected output where useful.
