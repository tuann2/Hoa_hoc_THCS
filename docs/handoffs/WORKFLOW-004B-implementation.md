# WORKFLOW-004B Implementation Handoff

## Status

- Remediation state: VALIDATED — orchestrator completed the full profile on
  the exact snapshot (see "Orchestrator full-profile completion"); fresh
  CRITICAL reviews PENDING.
- Risk tier / categories / rationale: CRITICAL — governance architecture,
  role/authority contracts, and context policy; the architecture Risk Model
  classifies architecture changes as CRITICAL.
- Base SHA / candidate SHA: `4c3396a` / `UNCOMMITTED` (this remediation
  worktree; the orchestrator records the final commit SHA after validation).
- Worktree state: dirty; the complete candidate diff stat below is against
  `ce5a9d4` and includes every file changed on this branch.
- CI reference for exact candidate: PENDING — no candidate commit exists.

## Requested scope and outcome

Remediation round 1 corrects accepted governance, workflow, template, runbook,
README, and handoff findings within the execution envelope. No application,
content, test, CI, package, or provider-config file changed.

## Files changed and complete diff stat

```text
 .claude/skills/feature-delivery/SKILL.md           | 197 +----
 AGENTS.md                                          | 119 +--
 AI_WORKFLOW.md                                     | 262 ++-----
 CLAUDE.md                                          | 204 +----
 README.md                                          | 104 +--
 docs/CONTEXT_RULES.md                              |  26 +
 docs/DOCUMENTATION_RULES.md                        | 138 +---
 docs/PROJECT_CONTEXT.md                            |  38 +
 docs/architecture/AI_WORKFLOW_ARCHITECTURE.md      | 798 +++++++--------------
 docs/handoffs/WORKFLOW-004B-implementation.md      | 202 ++++++
 docs/handoffs/_TEMPLATE.md                         | 111 +--
 docs/plans/WORKFLOW-004B-Provider-Neutral-Governance.md | 14 +-
 docs/plans/_TEMPLATE.md                            | 107 +--
 docs/roles/implementer.md                          |  43 ++
 docs/roles/independent-reviewer.md                 |  34 +
 docs/roles/planner.md                              |  52 ++
 docs/roles/release-assessor.md                     |  33 +
 docs/runbooks/providers/antigravity.md             |  21 +
 docs/runbooks/providers/claude-code.md             |  21 +
 docs/runbooks/providers/codex.md                   |  23 +
 20 files changed, 974 insertions(+), 1573 deletions(-)
```

## Plan §15 acceptance mapping

| Criterion                                  | Evidence / status                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Neutral governance policy                  | PASS: final grep-proof covers required policy files; roles, not providers, determine authority.                           |
| Discovery adapter only                     | PASS: `CLAUDE.md` remains a title plus `@AGENTS.md`.                                                                      |
| Normative envelope / no-envelope read-only | PASS: the architecture and shim state least privilege; scenario 6 has real-world execution evidence below.                |
| Provider-change mock                       | DESIGN PASS: policy names roles and adapter mechanics remain in provider runbooks.                                        |
| FEATURE-014 scope                          | PASS: restrictions remain limited to the `codex-claude-subagent` profile.                                                 |
| One canonical gate-command table           | PASS: policy prose references the manifest.                                                                               |
| Context measurement and scenarios          | PASS: measurements are estimated (bytes/4); reviewers verified scenarios 6–7 against the literal shim/runbook text below. |
| Ground-rule reconciliation                 | PASS: the remediation preserves the listed v2.2/v2.3 rules, including new-technology CRITICAL classification.             |
| Docs check and full profile                | PENDING: final command results and generated evidence below.                                                              |
| CRITICAL review / human approval           | PENDING: two fresh reviews (one adversarial) and human v2.4 approval are required before merge.                           |

## Validation evidence

- `npx prettier --write` ran on every remediation-modified, in-scope file
  before validation.
- `npm run check:docs -- --all`, `npm run gates -- --changed-from=ce5a9d4`,
  and `npm run evidence -- --profile=full` were attempted on the final
  pre-handoff snapshot. This sandbox forcibly ends a non-interactive command
  at about 30 seconds: the full-profile run reached `production-build` but
  emitted no final evidence JSON. `dependency-audit`, license, browser, and
  remaining full-profile gates are ORCHESTRATOR-PENDING, not passes; the
  orchestrator must run the full profile on the exact candidate. A direct
  `npm audit --audit-level=moderate` confirmed the audit blocker is sandbox
  DNS (`getaddrinfo ENOTFOUND registry.npmjs.org`).
- The complete new machine-generated docs-profile evidence below is copied
  verbatim. Its `base_sha` is the actual `HEAD` at evidence start (`5e4edcb…`);
  the handoff's requested lineage base remains `4c3396a`, and both identify
  the candidate as `UNCOMMITTED` where applicable.
- Post-evidence delta: only this handoff's evidence/status update is made after
  the run. It is documentation-only and follows the architecture's scoped
  revalidation rule; it does not alter the implementation candidate.

```json
{
  "base_sha": "5e4edcb1d532bc9c3d2e75cb57d840e906e9dcf3",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-19T00:43:48.848Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 9,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 5086,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 374,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "d2aae2b5a72404c09cf97ffa92223d66d6567034edf0d9cf6faf60235da15ba5",
  "node_version": "v24.16.0",
  "npm_version": "",
  "result": "pass",
  "snapshot_fallback_reason": "Command failed: git add -A\\nerror: unable to create temporary file: Read-only file system\\nerror: .claude/skills/feature-delivery/SKILL.md: failed to insert into database\\nerror: unable to index file '.claude/skills/feature-delivery/SKILL.md\\nfatal: updating files failed\\n",
  "schema_version": 1,
  "started_at": "2026-07-19T00:43:43.157Z",
  "validated_snapshot": {
    "id": "f9ac36cee83c29cca84a8a9332456010687abfbab2a1fb1eeaba9350fc3d7484",
    "kind": "manifest"
  }
}
```

## Orchestrator full-profile completion (same snapshot)

The orchestrator ran `npm run evidence -- --profile=full` in a
network-capable shell on the identical remediation worktree, completing the
ORCHESTRATOR-PENDING gates. Result `pass`; all 15 gates exit 0, including
`dependency-audit`, `license-check`, `e2e`, `pwa`, `pwa-subpath`, and
`docs-check`. `validated_snapshot` `{ "id":
"b799f2b985ea9a6bfc24fd0ca764ca5d6857812f", "kind": "git-tree" }`; base SHA
`5e4edcb`, candidate `UNCOMMITTED` (this worktree), 2026-07-19T00:47:42.498Z–
00:49:43.487Z, node v24.16.0, npm 11.13.0, lockfile sha256 `d2aae2…15ba5`.
Post-evidence delta: only this handoff's status/evidence text (documentation-
only, scoped revalidation). The orchestrator records the final commit SHA
below at commit time; CI on that exact commit is the release CI reference.

- Final candidate commit: `PENDING-COMMIT`
- CI on final candidate: `PENDING-CI`

## Rule-by-rule reconciliation

1. Planner intake, human-approved scope, exact-snapshot evidence, material
   tests, authorized delivery, feature branches, secret protection, human final
   approval, validation-once-per-snapshot, and fresh independent review remain
   in `AI_WORKFLOW.md`, role contracts, and the architecture.
2. Documentation-only changes receive scoped revalidation under the
   architecture remediation state machine.
3. New dependencies, external services, databases, infrastructure components,
   and replacement tools are expressly architecture changes classified
   CRITICAL; Planner and pipeline guidance require rationale, approval, and a
   recorded decision.

## Conformance and context measurement

Measurements use file size, estimated as bytes/4 rather than observed tokens:
`CLAUDE.md` 35 B (~9 tokens), `AGENTS.md` 1,192 B (~298 tokens),
`docs/CONTEXT_RULES.md` 2,245 B (~561 tokens), and
`docs/PROJECT_CONTEXT.md` 2,005 B (~501 tokens). These are measurements, not
claims about tokenizer output.

| Scenario                   | Mandatory context, estimated (bytes/4)                             | Budget            | Result |
| -------------------------- | ------------------------------------------------------------------ | ----------------- | ------ |
| 1 read-only question       | shim ≈306 tokens                                                   | ≤1.5k             | PASS   |
| 2 non-governance docs typo | shim + Context Rules ≈867 tokens                                   | ≤5k               | PASS   |
| 3 NORMAL content unit      | shim + Implementer + Context Rules + Project Context ≈1,885 tokens | ≤5k               | PASS   |
| 4 NORMAL UI change         | shim + Implementer + Context Rules ≈1,384 tokens                   | ≤5k               | PASS   |
| 5 CRITICAL governance      | full architecture escalation                                       | escalates         | PASS   |
| 6 no envelope              | literal shim rule requires read-only                               | required behavior | PASS   |
| 7 restricted sandbox       | literal Codex runbook requires planner-recorded degradation        | required behavior | PASS   |

Reviewers verified scenarios 6–7 against the literal shim and runbook text.
Scenario 6 also has real-world evidence: on 2026-07-19, Codex session
`019f77ca-50f2-7cf0-9f61-f0fa33a0fc42` refused repository writes when it was
dispatched without an envelope.

## Remediation round 1

1. Rebound status, evidence, complete diff stat, and scoped post-evidence delta:
   `docs/handoffs/WORKFLOW-004B-implementation.md`.
2. Added `merge` and `deploy` envelope permissions: architecture schema.
3. Routed the Release Assessor's assessment through Planner orchestration:
   `docs/roles/planner.md`.
4. Restored CRITICAL classification for new technology: architecture,
   `docs/roles/planner.md`, `AI_WORKFLOW.md`, and this reconciliation.
5. Added the DRAFT superset/non-weakening and approval-before-merge guard:
   architecture, `AGENTS.md`, and `AI_WORKFLOW.md`.
6. Corrected pipeline order: `AI_WORKFLOW.md`.
7. Reconciled conformance labels, estimates, scenario evidence, and deviations:
   this handoff.
8. Removed TRIVIAL from the plan template and directed it to micro-traces:
   `docs/plans/_TEMPLATE.md`.
9. Corrected the theory-card limit to 1–25: `README.md`.
10. Qualified direct-terminal capabilities as session-verified:
    `docs/runbooks/providers/codex.md`.
11. Restored v2.2 quantitative targets: architecture metrics.
12. Corrected tooling discovery order and identified the pipeline index:
    `README.md`.

## Independent verification

- Verifier / execution identifier / independence method: PENDING.
- Exact candidate CI status: PENDING.
- Findings and disposition: accepted remediation findings addressed above;
  fresh CRITICAL review of this remediation candidate remains PENDING.
- Batch-content exception authorization: n/a.

## Blockers and next actions

- RESOLVED: sandbox DNS blocked `dependency-audit`; the orchestrator ran the
  full profile on the exact snapshot — pass (see "Orchestrator full-profile
  completion").
- Obtain two fresh CRITICAL reviews, including one adversarial review, then
  human approval that flips architecture v2.4 to APPROVED before merge.
- No commit or push was made by the implementer.
