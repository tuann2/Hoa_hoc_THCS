# WORKFLOW-004C Implementation Handoff

## Status

- Remediation state: RELEASE_READY
- Risk tier / categories / escalation rationale: ELEVATED /
  governance-enforcement tooling (scripts), risk-tier classification logic /
  classifier errors could let risky changes bypass review (plan header,
  approved 2026-07-19 by tuann2).
- Base SHA / candidate SHA: `7d9a0fb` (origin/main, 004B merge) /
  `39c62b5` (snapshot `aaed3a784b86…`, git-tree); evidence regenerated after remediation round 2 — the b66b895 and 5a7b4c7 evidence runs are superseded (STALE).
- Worktree state and dirty paths: clean at evidence time (see JSON).
- CI reference for exact candidate: PENDING (push authorization not yet
  granted; local full-profile evidence below).

## Summary and scope

- Requested scope and outcome: enforce the TRIVIAL tier by machine
  (fail-closed classifier), add the snapshot-bound micro-trace, add the CI
  verdict-confirmation step, measure the WORKFLOW-004 token baseline, run
  the three-part pilot. Plan:
  `docs/plans/WORKFLOW-004C-Trivial-Tier-Token-Measurement.md`.
- Files changed: `scripts/trivial-policy.ts`, `scripts/classify-trivial.ts`,
  `scripts/trace-trivial.ts` (new); `scripts/gates.ts`,
  `scripts/gates-manifest.ts`, `scripts/check-docs.ts` (2 exports),
  `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`,
  `docs/CONTEXT_RULES.md` (modified); 3 new test files (classify-trivial, trace-trivial, trivial-policy) + 2 extended;
  `docs/trace/trivial/.gitkeep`;
  `docs/measurements/WORKFLOW-004-token-baseline.md`; this handoff.
- `git diff --stat`: 19 files changed, ~2,300 insertions, 11 deletions
  (vs `origin/main`).

## Acceptance, decisions, and risks

| Plan acceptance criterion                                             | Evidence / status                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Machine-decided TRIVIAL verdict; §11 cases pass                       | `tests/scripts/classify-trivial.test.ts` — 16 §11 cases + 3 status cases, all pass                                                                                       |
| Governance/CI/scripts/deps/src/tests/schema/content cannot be TRIVIAL | denylist table test (30 samples) in `tests/scripts/trivial-policy.test.ts`                                                                                               |
| Unknown path / add / delete / rename fail closed                      | classifier cases 3–6, 13–15                                                                                                                                              |
| False TRIVIAL claim blocked by CI                                     | `trivial-verify` job + `verifyTrace` fixtures (smuggled edit, doctored trace)                                                                                            |
| Snapshot-bound micro-trace per TRIVIAL run                            | `traceTrivial` writes schema-checked YAML bound to `computeSnapshot`; invalid traces rejected by `parseTraceYaml`                                                        |
| Pilot: 2 real TRIVIAL + 1 blocked violation                           | See "Pilot record" below                                                                                                                                                 |
| Token baseline, 8 scenarios, targets + deviations                     | `docs/measurements/WORKFLOW-004-token-baseline.md`                                                                                                                       |
| All tests pass on candidate                                           | 241 tests / 28 files pass at candidate `39c62b5` (evidence JSON below); earlier candidates recorded 237 (`b66b895`) and 240 (`5a7b4c7`); exact-candidate CI pending push |
| Independent ELEVATED review + human approval                          | PENDING (dispatched after this handoff)                                                                                                                                  |

- Design decisions: (1) trace generation is a separate
  `scripts/trace-trivial.ts`, not folded into `gates.ts` — keeps
  `gates --tier=trivial` side-effect-free and mirrors the
  `evidence.ts` orchestrator pattern; (2) the CI claim trigger is "PR adds
  exactly one `docs/trace/trivial/*.yaml`", not a GitHub label (labels are
  out of scope per plan §5); a PR adding more than one trace fails closed;
  (3) `verifyTrace` recomputes the verdict from the actual git diff and
  ignores only the single trace file under verification — a doctored or
  under-reporting trace cannot pass; (4) `check-docs.ts` now exports its two
  existing reference patterns so the hard triggers are defined once
  repo-wide (in-scope clarification: additive export, no logic change);
  (5) the empty changeset is ESCALATE, not vacuously TRIVIAL.
- Deviations: (1) observed input tokens unavailable in this runtime —
  bytes/4 estimates recorded, same convention accepted in the 004B handoff;
  (2) pilot traces live on local branches `pilot/trivial-a` /
  `pilot/trivial-b` (not in this PR) because a non-TRIVIAL PR that adds
  trace files would correctly be rejected by its own `trivial-verify` job;
  (3) `npm_version` empty-in-restricted-sandbox gap from 004B does not
  reproduce here (evidence JSON has a real value).
- Blockers: none.
- Remaining risks / follow-up: (1) `trivial-verify` must be marked a
  required status check in GitHub branch protection to be enforcing — repo
  settings action for the owner, outside `ci.yml`; (2) architecture line
  "deferred to WORKFLOW-004C" becomes stale on merge — architecture edits
  are CRITICAL and out of scope, follow-up amendment noted; (3) content
  units allowlist relaxation intentionally deferred ≥1 month per plan §5.

## Pilot record

| Pilot | Branch                      | Change                                        | Verdict                                                | Gates                  | Trace                                                  | Verify |
| ----- | --------------------------- | --------------------------------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------ | ------ |
| A     | `pilot/trivial-a`           | `PROJECT_STORY.md` wording fix                | TRIVIAL                                                | pass (6.00 s / 6.15 s) | `20260719-0348d9c8635d.yaml`, snapshot `3a49384d3ddc…` | exit 0 |
| B     | `pilot/trivial-b`           | `docs/content/CONTENT_OUTLINE.md` wording fix | TRIVIAL                                                | pass (6.06 s / 6.37 s) | `20260719-d14c5dae52db.yaml`                           | exit 0 |
| C     | `pilot/trivial-c-violation` | README `npm run dev` line edited              | ESCALATE (`code-fence`, `command-reference`) in 0.03 s | not run (fail-closed)  | refused (exit 1, no file)                              | n/a    |

## Validation evidence

```json
{
  "base_sha": "39c62b5e4bab991e73fa544565fd5a250c80e423",
  "build_inputs": [
    {
      "path": ".env.example",
      "sha256": "6fda9c2a4670086a9b4784c5f146ae59df4ecb2f00410b89973483837bd16198"
    }
  ],
  "candidate_sha": "39c62b5e4bab991e73fa544565fd5a250c80e423",
  "finished_at": "2026-07-19T11:33:46.481Z",
  "gate_results": [
    {
      "id": "git-diff-check",
      "command": ["git", "diff", "--check"],
      "durationMs": 5,
      "exitCode": 0
    },
    {
      "id": "format-check",
      "command": ["npm", "run", "format:check"],
      "durationMs": 5694,
      "exitCode": 0
    },
    {
      "id": "content-catalog",
      "command": ["npm", "run", "check:content-catalog"],
      "durationMs": 361,
      "exitCode": 0
    },
    {
      "id": "content-validation",
      "command": ["npm", "run", "validate-content"],
      "durationMs": 351,
      "exitCode": 0
    },
    {
      "id": "lint",
      "command": ["npm", "run", "lint"],
      "durationMs": 11504,
      "exitCode": 0
    },
    {
      "id": "typecheck",
      "command": ["npm", "run", "typecheck"],
      "durationMs": 5918,
      "exitCode": 0
    },
    {
      "id": "unit-tests",
      "command": ["npm", "test"],
      "durationMs": 18097,
      "exitCode": 0
    },
    {
      "id": "production-build",
      "command": ["npm", "run", "build:app"],
      "durationMs": 5410,
      "exitCode": 0
    },
    {
      "id": "bundle-check",
      "command": ["npm", "run", "check:bundle"],
      "durationMs": 351,
      "exitCode": 0
    },
    {
      "id": "dependency-audit",
      "command": ["npm", "audit", "--audit-level=moderate"],
      "durationMs": 755,
      "exitCode": 0
    },
    {
      "id": "license-check",
      "command": ["npm", "run", "check:licenses"],
      "durationMs": 536,
      "exitCode": 0
    },
    {
      "id": "e2e",
      "command": ["npm", "run", "test:e2e"],
      "durationMs": 53870,
      "exitCode": 0
    },
    {
      "id": "pwa",
      "command": ["npm", "run", "test:pwa"],
      "durationMs": 23160,
      "exitCode": 0
    },
    {
      "id": "pwa-subpath",
      "command": ["npm", "run", "test:pwa:subpath"],
      "durationMs": 15480,
      "exitCode": 0
    },
    {
      "id": "docs-check",
      "command": ["npm", "run", "check:docs", "--", "--all"],
      "durationMs": 395,
      "exitCode": 0
    }
  ],
  "lockfile_sha256": "d2aae2b5a72404c09cf97ffa92223d66d6567034edf0d9cf6faf60235da15ba5",
  "node_version": "v24.16.0",
  "npm_version": "11.13.0",
  "result": "pass",
  "snapshot_fallback_reason": null,
  "schema_version": 1,
  "started_at": "2026-07-19T11:31:24.460Z",
  "validated_snapshot": {
    "id": "aaed3a784b86286e9dbaac64f16c52e1c34db2f7",
    "kind": "git-tree"
  }
}
```

## Independent verification

- Verifier / execution identifier / independence method: fresh Claude
  execution `a36765b4e46eba965`, independent-review envelope (read-only,
  no implementer transcript), 2026-07-19.
- Exact candidate CI status: PENDING (awaiting push authorization).
- Findings and disposition (round 1 verdict REMEDIATE, all closed in
  remediation round 1):
  1. BLOCKER — wrapped-line command/path reference bypassed per-diff-line
     triggers → closed: full-content reference-set comparison on logical
     (whitespace-collapsed) text; regression test case 17.
  2. HIGH — CI ignored modified (non-added) trace files → closed: ci.yml
     rejects any PR touching an existing trace (append-only, filter MDRTC).
  3. HIGH — repointed symlink under docs/\*\*.md read through by content
     scans → closed: classifier escalates `symlink-path` (lstat + old git
     mode 120000); regression test case 18. check-docs.ts symlink
     read-through recorded as follow-up (gate hardening beyond 004C scope).
  4. MEDIUM — SSOT test pinned one direction only → closed: reverse test
     pins every backticked architecture path to a code literal.
  5. MEDIUM — handoff aggregate counts wrong → closed: corrected in this
     revision (237 tests / 28 files at `b66b895`; 3 new test files).
     Reviewer also confirmed 12 attempted bypass classes correctly blocked
     (traversal, NFD, case tricks, delete+add rename, rename-into-trace-dir,
     multi-trace smuggling, doctored/under-reporting trace, escalate-exit-0,
     command injection, TOCTOU, mixed changeset, empty changeset).
- Batch-content exception authorization: n/a
