# WORKFLOW-004B Implementation Handoff

## Status

- Remediation state: VALIDATED (review PENDING)
- Risk tier: CRITICAL — workflow/governance architecture, role/authority
  contracts, and context policy.
- Base SHA / candidate SHA: `4c3396af4b89eac734f48e9c9add4cf78e7e3deb` / `UNCOMMITTED`.
- Worktree state: dirty; all changed paths are recorded in the diff stat below.
- CI reference: PENDING — no candidate commit exists.

## Requested scope and outcome

Implemented plan §10 steps 2–5 only: neutral project context, role contracts,
context rules, provider runbooks, v2.4 DRAFT architecture, neutral discovery
shims, consolidated workflow/docs/skill guidance, README tooling note, and
trimmed templates. No application, content, test, CI YAML, or provider config
was changed. `CLAUDE.md` is only the runtime discovery adapter; no
session-authorization phrase pointer remains because authorization is governed
by the envelope and Planner contract, so duplicating phrases would create a
second policy anchor.

## Files changed

- New: `docs/PROJECT_CONTEXT.md`, `docs/CONTEXT_RULES.md`,
  `docs/roles/{planner,implementer,independent-reviewer,release-assessor}.md`,
  and `docs/runbooks/providers/{claude-code,codex,antigravity}.md`.
- Updated: workflow architecture, shims, pipeline/docs/skill guidance, README,
  and plan/handoff templates.

```text
 .claude/skills/feature-delivery/SKILL.md      | 197 +------
 AGENTS.md                                     | 118 +---
 AI_WORKFLOW.md                                | 257 ++-------
 CLAUDE.md                                     | 204 +------
 README.md                                     |  91 +--
 docs/DOCUMENTATION_RULES.md                   | 138 ++---
 docs/architecture/AI_WORKFLOW_ARCHITECTURE.md | 787 ++++++++------------------
 docs/handoffs/_TEMPLATE.md                    | 111 +---
 docs/plans/_TEMPLATE.md                       | 107 +---
 9 files changed, 444 insertions(+), 1566 deletions(-)
 (`git diff --stat` excludes currently untracked files; the nine new
 governance/runbook files and this handoff are listed above.)
```

## Plan §15 acceptance mapping

| Criterion                                  | Evidence / status                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Neutral governance policy                  | PASS: required policy files are provider/model-name clean; roles replace provider assignments.                                         |
| Discovery adapter only                     | PASS: `CLAUDE.md` contains only title plus `@AGENTS.md`.                                                                               |
| Normative envelope / no envelope read-only | PASS in v2.4 DRAFT and canonical shim.                                                                                                 |
| Provider-change mock                       | DESIGN PASS: policy names roles; adapter mechanics live only in provider runbooks. Formal mock conformance is pending plan §10 step 6. |
| FEATURE-014 scope                          | PASS: restrictions are limited to `codex-claude-subagent` in the Codex runbook.                                                        |
| One gate-command table                     | PASS: grep found none in active policy prose; manifest remains canonical.                                                              |
| Context measurement                        | PASS: see "Conformance and context measurement" — all scenario budgets met (read-only ≈ 306 tok ≤ 1.5k; NORMAL ≤ 1.9k ≤ 5k).           |
| Ground-rule reconciliation                 | PASS: checklist below.                                                                                                                 |
| Docs check and tests                       | PASS: standalone docs check and `npm test` passed.                                                                                     |
| CRITICAL review / human approval           | PENDING: mandatory fresh reviews and human v2.4 approval occur after this handoff.                                                     |

## Validation evidence

Stage 0 recorded: `git rev-parse HEAD` =
`4c3396af4b89eac734f48e9c9add4cf78e7e3deb`; `git status --short` was
empty. Package scripts included `gates`, `evidence`, and `check:docs`;
workflows were `ci.yml` and `deploy.yml`.

- `npm run gates -- --changed-from=ce5a9d4`: ran the full classifier union;
  all gates through the unit-test stage passed. The later full evidence run
  records the complete result.
- `npm run check:docs -- --all` (0): checked 75 Markdown files; three
  historical external-URL warnings only.
- `npm test` (0): 25 files, 165 tests passed; existing React Router future
  warnings were informational.
- `npx prettier --check` on every changed file (0): passed.
- `npm audit --audit-level=moderate` (1): blocked by restricted sandbox DNS:
  `getaddrinfo ENOTFOUND registry.npmjs.org`.
- `npm run evidence -- --profile=docs` (0): manifest snapshot
  `daccae50345ca2373a91589f698dbd8deb940ab1e04d809582f5ae2232951ead`,
  result `pass`, 2026-07-18T23:25:47.354Z–23:25:53.194Z.
- `npm run evidence -- --profile=full` (1): same manifest snapshot, result
  `fail`, 2026-07-18T23:28:17.306Z–23:28:58.464Z; gates through
  `bundle-check` passed, then `dependency-audit` failed from unavailable
  DNS, so license/browser/docs gates did not run in that full profile.

```json
{
  "base_sha": "4c3396af4b89eac734f48e9c9add4cf78e7e3deb",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "UNCOMMITTED",
  "finished_at": "2026-07-18T23:28:58.464Z",
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
      "durationMs": 5246,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 344,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 433,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 9141,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 5163,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 14556,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5127,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 401,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["npm", "audit", "--audit-level=moderate"],
      "durationMs": 523,
      "exitCode": 1
    }
  ],
  "lockfile_sha256": "d2aae2b5a72404c09cf97ffa92223d66d6567034edf0d9cf6faf60235da15ba5",
  "node_version": "v24.16.0",
  "npm_version": "",
  "result": "fail",
  "snapshot_fallback_reason": "Command failed: git add -A\\nerror: unable to create temporary file: Read-only file system\\nerror: .claude/skills/feature-delivery/SKILL.md: failed to insert into database\\nerror: unable to index file '.claude/skills/feature-delivery/SKILL.md\\nfatal: updating files failed\\n",
  "schema_version": 1,
  "started_at": "2026-07-18T23:28:17.306Z",
  "validated_snapshot": {
    "id": "daccae50345ca2373a91589f698dbd8deb940ab1e04d809582f5ae2232951ead",
    "kind": "manifest"
  }
}
```

The full evidence object emitted an empty `npm_version` field despite
`npm --version` being available to the shell; it is recorded verbatim rather
than inferred. No validation output was treated as passing after the snapshot.

## Rule-by-rule reconciliation

1. Requirements enter through Planner — still in force at
   `AI_WORKFLOW.md#Ground rules` and `docs/roles/planner.md`.
2. Human-approved plan before implementation — still in force at
   `AI_WORKFLOW.md#Ground rules` and Planner contract.
3. Approved scope only — still in force at Implementer contract and envelope.
4. Summaries are not evidence — still in force at v2.4 Trust Model.
5. Material changes need tests — still in force at `AI_WORKFLOW.md#Ground rules`.
6. Documentation follows validated code — still in force at
   `docs/DOCUMENTATION_RULES.md#Documentation revalidation`.
7. No delivery actions without authority — still in force at envelope,
   `AI_WORKFLOW.md#Ground rules`, and every role contract.
8. Session-specific human authorization — still in force, intentionally
   superseded in wording by the envelope plus Planner contract rather than
   provider-specific phrases.
9. Feature branches, never main — still in force at Planner contract and
   `AI_WORKFLOW.md#Ground rules`.
10. No secrets/credentials to agents — still in force at Planner/Implementer
    contracts and documentation rules.
11. Human final approval — still in force at Responsibility Matrix and Release
    Assessor contract.
12. New technology rationale/approval/record — still in force at Planner
    contract and `AI_WORKFLOW.md#Pipeline`.
13. Validation once per snapshot — still in force at v2.4 Validation Model.
14. Fresh findings-only independent review, bounded NORMAL exception only —
    still in force at v2.4 Independent Verification and Reviewer contract.

## Orchestrator-completed validation (same snapshot)

Per the architecture's evidence rule ("if the runtime cannot generate
evidence, its orchestrator or harness must do so"), the orchestrator reran
the blocked gates in a network-capable shell on the identical worktree:

- `npm audit --audit-level=moderate` (0): found 0 vulnerabilities — the
  sandbox DNS blocker above is environmental, not a dependency finding.
- `npm run evidence -- --profile=full` (0): result `pass`,
  `validated_snapshot` `{ "id": "b4e52c28636d13b8fa05886836055b2c1e1e1262",
"kind": "git-tree" }`, started 2026-07-18T23:35:07.400Z, node v24.16.0,
  npm 11.13.0, lockfile sha256 `d2aae2…15ba5` (matches the run above). All
  full-profile gates passed, including `dependency-audit`, license,
  browser E2E, `test:pwa`, `test:pwa:subpath` (15017 ms), and
  `docs-check --all` (365 ms). Stdout capture retained the final gates
  only; CI on the candidate commit is the authoritative full log.

## Conformance and context measurement (plan §10 step 6, §11)

Measured file sizes on this snapshot (tokens ≈ bytes/4): `CLAUDE.md` 35 B
(~8 tok); `AGENTS.md` 1192 B (~298 tok); `docs/CONTEXT_RULES.md` 2245 B
(~561 tok); `docs/PROJECT_CONTEXT.md` 2005 B (~501 tok); role contracts
324–647 tok; provider runbooks 297–372 tok; architecture full ~4355 tok.

| Scenario                     | Mandatory context (observed)                                                        | Budget    | Result |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------- | ------ |
| 1 read-only question         | shim ≈ 306 tok                                                                      | ≤ 1.5k    | PASS   |
| 2 docs typo (non-governance) | shim + CONTEXT_RULES ≈ 867 tok                                                      | ≤ 5k      | PASS   |
| 3 NORMAL content (1 unit)    | shim + implementer + CONTEXT_RULES + PROJECT_CONTEXT ≈ 1885 tok governance overhead | ≤ 5k      | PASS   |
| 4 NORMAL UI change           | shim + implementer + CONTEXT_RULES ≈ 1384 tok governance overhead                   | ≤ 5k      | PASS   |
| 5 CRITICAL governance        | + architecture full ≈ 4355 tok — escalation path exercised                          | escalates | PASS   |

Baseline before 004B was ~12–15k mandatory tokens per session. Scenario 6
(no envelope ⇒ read-only: `AGENTS.md` rule 1 states it verbatim) and
scenario 7 (restricted sandbox ⇒ degradation path: Codex runbook profile
table) are behavioral; the independent reviewers verify them against the
shim/runbooks as part of the CRITICAL review below.

## Deviations, blockers, and next actions

- Deviation: plan §10 steps 6–7 were not executed because this assignment
  explicitly limited implementation to steps 2–5; conformance scenarios,
  independent CRITICAL reviews, and human approval remain PENDING.
- Blocker (RESOLVED): full dogfood could not complete in the
  restricted-network implementation sandbox; the orchestrator reran the
  full profile on the same snapshot with network — result `pass` (see
  "Orchestrator-completed validation" above).
- Required next actions: obtain the two fresh CRITICAL reviews (one
  adversarial), remediate if needed, then obtain human approval of
  architecture v2.4. No commit/push was made by the implementer.
