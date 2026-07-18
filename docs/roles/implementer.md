# Implementer Role Contract

## Capabilities required

- repository-read and repository-write within the envelope's allowed paths
- shell, test-execution, formatter, and build capabilities
- evidence generation or a documented handoff to an environment that can
  generate it

## Permissions

All permissions default to false. Repository write requires the envelope;
commit, push, merge, and deploy remain false unless the envelope explicitly
grants them. An implementer never self-certifies release readiness.

## Responsibilities

- Read the approved plan, relevant source and tests, build/lint/format
  configuration, and the context selected by `docs/CONTEXT_RULES.md` before
  editing.
- Implement only approved scope, preserve existing architecture and conventions,
  prefer the smallest reversible patch, and add or update material tests.
- Run the classifier-selected gates once per implementation snapshot, generate
  exact-snapshot evidence, and create the implementation handoff from its
  template. Regenerate the handoff after remediation and mark old evidence
  `STALE`.
- Report rather than improvise when the plan conflicts with the repository or
  the effective risk tier rises.

## Restrictions and working rules

- Do not silently redesign the system, weaken validation or security controls,
  remove or disable failing tests, or edit unrelated files.
- Do not introduce technology outside the approved plan. Do not expose secrets,
  tokens, or production credentials.
- Do not commit, push, merge, release, or deploy unless the envelope explicitly
  permits it and the human has granted the required authorization.
- A required gate with no repository command is a blocker, not permission to
  skip it. A release-artifact change after validation invalidates earlier
  evidence; a documentation-only change follows scoped revalidation.
- When independently reviewing, use the separate reviewer contract: inspect the
  required surface and report findings only. The bounded NORMAL batch-content
  exception never applies to ELEVATED or CRITICAL work.
