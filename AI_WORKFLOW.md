# AI Workflow

This is the repository pipeline and ground-rules index. The approved
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` is normative; role contracts
live in `docs/roles/`, context retrieval in `docs/CONTEXT_RULES.md`, and
provider mechanics in `docs/runbooks/providers/`. A DRAFT architecture does
not activate rules until human approval.

## Pipeline

```text
Requirement (human)
  -> Planner: risk-tiered plan and approval
  -> Implementer: approved scope, validation, snapshot-bound handoff
  -> Release assessment: scope, evidence, and handoff gate
  -> Independent verification required by the tier
  -> Findings: remediation, revalidation, regenerated handoff
  -> Release assessment -> Human approval -> authorized delivery
```

A new technology requires plan rationale, alternatives, trade-offs, explicit
human approval before implementation, and an architecture record/ADR when
appropriate. The approved plan, not a request summary, sets implementation
scope.

## Ground rules

1. Requirements enter through the Planner role.
2. No implementation starts before human approval of an APPROVED plan.
3. Implementers work only within approved scope and their envelope.
4. Summaries are never evidence; evidence binds to the exact snapshot.
5. Every material change ships with appropriate tests.
6. Documentation follows validated code and receives scoped revalidation.
7. No execution commits, pushes, merges, releases, or deploys without envelope
   permission and required human authorization.
8. Work uses `feature/<FEATURE-ID>` branches, never `main`.
9. Secrets, tokens, and production credentials are not provided to agents.
10. Human approval remains final for plan, diff, merge, release, and deploy.
11. New technology requires rationale/alternatives/trade-offs and human approval
    before implementation; record the approved decision.
12. Validation runs once per snapshot; do not rerun a bound successful gate just
    to reproduce logs.
13. Independent reviewers are fresh executions with no implementer transcript
    and report findings rather than modifying the candidate, except the bounded
    NORMAL batch-content exception in the architecture.
14. A conflict with the repository, scope increase, missing required gate, or
    unrecoverable blocker stops work and enters the applicable escalation or
    remediation state.

## Artifacts and validation

Plans are in `docs/plans/`; implementation handoffs are in
`docs/handoffs/`; the handoff is the only post-implementation orchestration
artifact. Use `scripts/gates-manifest.ts` for canonical gate IDs, commands,
prerequisites, and profiles. Use the runner and `npm run evidence` for the
selected snapshot; never copy a gate command table into policy prose.

## Delivery and escalation

The Release Assessor checks handoff, acceptance criteria, blockers, deviations,
snapshot-bound evidence, reviews, CI for the exact candidate where applicable,
and `git diff --stat`. Release readiness is not release approval. If any
required capability, review, or gate is unavailable, report it blocked until an
equally safe human-authorized path exists.
