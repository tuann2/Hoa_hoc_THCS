---
name: feature-delivery
description: Deliver a repository feature through the governed plan, validation, review, and handoff workflow.
---

# Feature Delivery Workflow

Use the approved `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` as the
normative workflow. Begin from `AGENTS.md`, require an execution envelope,
then read the assigned role contract in `docs/roles/` and retrieve context
through `docs/CONTEXT_RULES.md`. This skill adds no private policy.

1. A Planner assigns the feature ID, analyses scope/risk, writes the plan from
   `docs/plans/_TEMPLATE.md`, and obtains human approval before implementation.
2. An Implementer receives a change envelope with allowed paths, implements
   only approved scope, runs classifier-selected gates from
   `scripts/gates-manifest.ts`, generates exact-snapshot evidence, and writes
   the handoff from `docs/handoffs/_TEMPLATE.md`.
3. The scope/handoff gate checks the handoff, evidence, scope, acceptance
   criteria, deviations, blockers, and exact-candidate CI where required.
4. Assign fresh Independent Reviewer executions required by the effective tier.
   They receive the candidate snapshot, plan, and evidence but no implementer
   transcript; they report findings and remediation returns to implementation.
5. Resolve findings through the remediation loop, including required
   revalidation, refreshed evidence, handoff, and tier-required review.
6. A Release Assessor then performs the release assessment.
7. The Human Approver alone grants final approval. Commit, push, merge, and
   deploy require both envelope permission and the necessary human authority.

Read the matching provider runbook only for adapter mechanics. If a role's
actual execution profile lacks a required capability, use the Planner's
documented safe degradation path or report the gate blocked.
