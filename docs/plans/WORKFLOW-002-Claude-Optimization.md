# WORKFLOW-002 — Migrate AI Workflow to Architecture v2

## Metadata

- Status: DRAFT
- Owner: Human Project Owner
- Reviewer: Codex
- Final approver: Human Project Owner
- Architecture source:
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`
- Supersedes:
  `docs/plans/WORKFLOW-001-Claude-Optimization.md`

---

## 1. Objective

Migrate the repository's current AI-assisted development workflow to comply
with `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`.

This plan does not redefine the architecture.

The architecture document is the source of truth. This plan only defines:

- files to update;
- migration sequence;
- implementation constraints;
- validation procedure;
- dry-run scenarios;
- measurable acceptance criteria.

---

## 2. Background

Current workflow usage indicates:

- approximately 52% Claude Agent usage;
- approximately 75% of usage from subagent-heavy sessions;
- approximately 75% of usage from sessions active longer than eight hours;
- approximately 64% of usage from contexts above 150k tokens;
- repeated implementation, verification, review, repair and documentation
  agent executions;
- duplicated validation between Codex, Claude and package scripts;
- successful command output being injected into Claude context;
- multiple workflow documents containing overlapping or conflicting rules.

Prompt caching is already effective and is not the primary optimization target.

---

## 3. Governance

### 3.1 Authority

The Human Project Owner owns:

- architecture approval;
- workflow approval;
- final release approval;
- production deployment approval.

Claude owns:

- planning;
- orchestration;
- risk classification;
- scope verification;
- release-readiness assessment.

Claude must not claim final release approval.

Allowed Claude outcomes are:

- `READY`
- `READY WITH RISKS`
- `NOT READY`

The human makes the final decision.

### 3.2 Source of truth

If any implementation file conflicts with:

```text
docs/architecture/AI_WORKFLOW_ARCHITECTURE.md
```

the architecture prevails once its `Status` is `APPROVED`. Until then, the
currently approved implementation documents (`CLAUDE.md`, `AI_WORKFLOW.md`,
`AGENTS.md`, skills, templates) remain authoritative, and any conflict found
during migration must be reported to the Human Project Owner rather than
resolved by an agent choosing its preferred rule.

---

## 4. Risk classification

- Risk tier: `NORMAL`
- Applicable categories: documentation / workflow-instruction change. No
  application source, production data, deployment, infrastructure,
  payment, credential or authentication/authorization surface is touched.
- Escalation rationale: none. This migration rewrites workflow documents
  (`CLAUDE.md`, `AI_WORKFLOW.md`, `AGENTS.md`, skills, templates, the
  architecture record itself) only; it does not change application code,
  schemas or learning content. Per the architecture's Risk Model rule 6,
  an uncertain-impact task escalates to the next plausible tier — here
  the ceiling is `NORMAL` because none of the `CRITICAL`/`ELEVATED`
  triggers (rules 2–5: production/infra/auth/security, migrations,
  public APIs, numeric or complex business logic) apply.

---

## 5. Migration sequence

### Phase 1 — Architecture approval

- Draft `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (v2.1).
- No implementation changes during this phase.
- Gate: Human approves the architecture (`Status: DRAFT → APPROVED`).

### Phase 2 — Update implementation documents

Update the following to comply with the approved architecture. No new
workflow rule activates until the Phase 1 gate passes.

| File                                       | Change                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                | Redefine Claude's role as Architect per the Responsibility Matrix; add risk-tier mapping, delegation patterns, "what Claude may edit directly", validation-rerun rule. |
| `AI_WORKFLOW.md`                           | Replace the fixed pipeline with the tier-based workflow, evidence-binding rule, independent-verification table, canonical gates.                                       |
| `AGENTS.md`                                | Redefine Codex as the engineering engine; canonical validation commands; expanded handoff contract; independent-reviewer duties.                                       |
| `.claude/skills/feature-delivery/SKILL.md` | Replace the fixed 9-step pipeline with the tier-based Claude gate, independent verification by tier, and the remediation loop.                                         |
| `docs/handoffs/_TEMPLATE.md`               | Expand to the full Documentation Contract (evidence binding, remediation state, review fields marked `PENDING`).                                                       |

Claude may edit these five files directly — they are workflow
instructions and templates, covered by `CLAUDE.md`'s "What Claude may
edit directly" list — so this phase does not require Codex delegation.

Gate: each file passes `git diff --check` and `npm run format:check`.

### Phase 3 — Dry run (not yet executed)

Run one task at each risk tier (`NORMAL`, `ELEVATED`, `CRITICAL`) under
the migrated workflow and collect: token usage, context size, session
duration, Codex executions, review quality. Compare against the Success
Metrics baseline in the architecture. This phase is follow-up work and
is out of scope for this plan's acceptance criteria.

---

## 6. Implementation constraints

- No application source, content schema, or test file may change under
  this plan — only workflow/process documents.
- Every updated document must state that the architecture is the source
  of truth "when its Status is APPROVED" and must not contradict the
  architecture's Responsibility Matrix, Risk Model or Validation Model.
- Existing project-specific mechanics (Codex/Gemini invocation commands,
  commit convention, canonical npm scripts) must be preserved, not
  reinvented.

---

## 7. Validation procedure

Baseline gates only, per the architecture's quality-gates table
(documentation-only change):

```bash
git diff --check
npm run format:check
```

Both commands run once, scoped to the changed files. Exit status is
recorded in the implementation handoff
(`docs/handoffs/WORKFLOW-002-implementation.md`) together with the
evidence-binding fields the architecture requires (base/candidate
commit, implementation-tree SHA, dirty paths, timestamps).

---

## 8. Acceptance criteria

- [x] `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` is
      `Status: APPROVED`.
- [x] `CLAUDE.md`, `AI_WORKFLOW.md`, `AGENTS.md`,
      `.claude/skills/feature-delivery/SKILL.md`, and
      `docs/handoffs/_TEMPLATE.md` conform to the architecture's
      Responsibility Matrix, Risk Model, Validation Model and
      Documentation Contract.
- [x] `git diff --check` and `npm run format:check` pass for every file
      changed by this plan.
- [x] The implementation handoff records evidence bound to the exact
      snapshot, per the architecture's Evidence Binding rules.
- [ ] Phase 3 dry-run at each risk tier is executed and success metrics
      are measured (tracked as follow-up work; not required to close
      this plan).

---

## 9. Rollback plan

Revert the five migrated files and the architecture document to their
pre-migration committed state (`git checkout <prior-commit> -- <paths>`
or `git revert`). This phase changes only documentation, so rollback
carries no data or runtime risk.
