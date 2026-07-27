# WORKFLOW-011 Implementation Handoff

## Status

- Remediation state: VALIDATING
- Risk tier / categories / escalation rationale: ELEVATED — governance-enforcement tooling; path-to-gate classification controls required validation.
- Base SHA / candidate SHA: 2c8ad38e584fdb3b9c0d058772b57ac71c9597a2 / UNCOMMITTED
- Worktree state and dirty paths: DIRTY — tests/scripts/classify-change.test.ts, docs/handoffs/WORKFLOW-011-implementation.md
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: Classify all 24 previously unmatched tracked paths explicitly and prevent unclassified tracked paths from recurring.
- Files changed: scripts/gates-manifest.ts; tests/scripts/gates-manifest.test.ts; tests/scripts/classify-change.test.ts; docs/handoffs/WORKFLOW-011-implementation.md
- `git diff --stat`: current working tree changes only the two envelope-allowed files; the completed rule and coverage-test changes are already in the candidate branch history.

## Role execution log

| Role                 | Executing agent | Model / effort | Human confirmer + timestamp | Execution evidence        |
| -------------------- | --------------- | -------------- | --------------------------- | ------------------------- |
| Planner              | Claude Code     | high           | tuann2, 2026-07-26          | confirmed by tuann2       |
| Implementer          | Codex           | high           | tuann2, 2026-07-27          | relayed role confirmation |
| Independent Reviewer | not confirmed   | n/a            | not confirmed               | PENDING                   |
| Release Assessor     | not confirmed   | n/a            | not confirmed               | PENDING                   |

## Acceptance, decisions, and risks

| Plan acceptance criterion                        | Evidence / status                                                |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Explicitly classify all tracked paths            | Measured before: 24/235 unmatched; after: 0/237 unmatched        |
| Group A remains full                             | Unit tests added; targeted fixture test passes                   |
| Group B maps to web                              | Unit tests added; suite has sandbox spawn limitation below       |
| Group C maps only the two approved files to docs | Unit tests added; suite has sandbox spawn limitation below       |
| First matching rule wins                         | Unit test added for each new regex; suite has sandbox limitation |

- Design decisions: Kept every existing rule in its original order; appended three anchored rules for Groups A, B, and C.
- Deviations: Gate scope narrowed from full to docs only for CHANGELOG.md and PROJECT_STORY.md; approver tuann2, 2026-07-27.
- Scope history: The preceding Implementer execution stopped because `tests/scripts/classify-change.test.ts` was outside its envelope after it found the expired Supabase-migration fixture. Plan revision 2 expanded scope to that file; tuann2 approved the expansion separately on 2026-07-27. The fixture now uses `unclassified/example.bin`, a synthetic path that matches no `PATH_GATE_RULES` pattern and does not exist in the repository, preserving the fail-closed assertion.
- Blockers: No scope or implementation blocker remains. In this sandbox, full `npm test` reports 281 passed and 1 failed because `tests/scripts/gates-manifest.test.ts` cannot spawn `git` (`spawnSync git EPERM`); direct `git ls-files -z` measurement succeeds. This is an environment validation limitation, not a failing classification assertion.
- Orchestrator verification (2026-07-27): rerun `npm test` in the unrestricted
  environment — **35/35 test files, 282/282 tests pass**, including
  `tests/scripts/gates-manifest.test.ts`. This confirms the Implementer's single
  reported failure was the sandbox `spawnSync git EPERM` limitation, not a code
  defect. Orchestrator also re-measured independently with `git ls-files -z`
  against `PATH_GATE_RULES`: **0 unclassified paths out of 237 tracked files**.
- Remaining risks / follow-up: obtain the fresh ELEVATED independent review and a
  separate release assessment; both roles are still unconfirmed.

## Validation evidence

Do orchestrator chạy, theo degradation path đã ghi ở
`docs/runbooks/providers/codex.md`: profile `codex-claude-subagent` bị EPERM khi
tsx tạo IPC pipe và khi Vitest spawn `git`, nên Implementer không tự chạy được
gate/evidence đầy đủ.

`npm run gates -- --changed-from=0830c780` → **pass, 15/15 gate, profile `full`**
(đúng như plan dự đoán vì thay đổi nằm ở `scripts/**`).

`npm run evidence -- --changed-from=0830c780`, đo trên worktree sạch ngay sau
commit `148111e7c1ca226e017ba77b350ebe6d30eeb967`: `snapshot_fallback_reason:
null`, `candidate_sha: 148111e7...` (không phải `UNCOMMITTED` vì worktree sạch),
snapshot git-tree `1ff3e947dec10076554232e2f0a463ec9536879a` **bằng đúng tree của
commit đó**.

Độ lệch còn lại là chính khối JSON này, thêm ở commit kế tiếp — giới hạn cố hữu
của handoff nằm trong cây mã, đã ghi thành follow-up mở ở handoff WORKFLOW-008.

```json
{
  "base_sha": "148111e7c1ca226e017ba77b350ebe6d30eeb967",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "148111e7c1ca226e017ba77b350ebe6d30eeb967",
  "finished_at": "2026-07-27T01:23:41.222Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 6,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 7406,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 370,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 371,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 13773,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 6302,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 22739,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5511,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 352,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["node", "--import", "tsx", "scripts/check-audit.ts"],
      "durationMs": 1129,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 497,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 44160,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 24711,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 16432,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 460,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-27T01:21:16.861Z",
  "validated_snapshot": {
    "id": "1ff3e947dec10076554232e2f0a463ec9536879a",
    "kind": "git-tree"
  }
}
```

## Independent verification

- Verifier / execution identifier / independence method: PENDING
- Exact candidate CI status: PENDING
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a

## Release Assessment

- Assessment and evidence basis: Not performed; no Release Assessor has been confirmed. This handoff does not declare release readiness.
