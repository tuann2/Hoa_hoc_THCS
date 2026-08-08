# FEATURE-017 Implementation Handoff

## Status

- Remediation state: IMPLEMENTED (remediation round 2; pending independent review)
- Risk tier / categories / escalation rationale: NORMAL; educational numeric data, UI/React, and PWA route allowlist.
- Base SHA / candidate SHA: d79ba1fe8fc99375554e918e16ece7231ff0d1b8 / UNCOMMITTED
- Worktree state and dirty paths: uncommitted remediation at base `d79ba1f` on
  branch `feature/017-reference-tables`; changed paths are
  `src/lib/referenceValidation.ts`, `tests/lib/reference-validation.test.ts`,
  and this handoff. Not pushed; no commit was made because this envelope
  forbids commit, push, merge, and deploy.
- CI reference for exact candidate (when required/available): not available —
  branch is intentionally unpushed, so gates were run locally by the
  orchestrator against the exact candidate.

## Summary and scope

- Requested scope and outcome: Offline lazy-loaded `/tra-cuu` reference tables, validator, datasets, and coverage.
- Files changed: content/reference/\*, reference types/loader/validator, route/app/PWA allowlist, content validator script, tests.
- `git diff --stat`: implementation snapshot is uncommitted; coordinator should capture the exact final stat with its evidence snapshot.

## Role execution log

| Role                 | Executing agent  | Model / effort    | Human confirmer + timestamp | Execution evidence                                                                                                                      |
| -------------------- | ---------------- | ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude Code      | Sonnet 5 / medium | tuann2, 2026-08-07          | FEATURE-017 plan                                                                                                                        |
| Implementer          | Codex (subagent) | inherited         | tuann2, 2026-08-08          | Relayed confirmation: original dispatch “hãy triển khai tính năng 17”; explicit selection of Codex via codex:rescue with full envelope. |
| Independent Reviewer | PENDING          | PENDING           | PENDING                     | PENDING                                                                                                                                 |
| Release Assessor     | PENDING          | PENDING           | PENDING                     | PENDING                                                                                                                                 |

## Acceptance, decisions, and risks

| Plan acceptance criterion                       | Evidence / status                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lazy offline reference route                    | Production and subpath builds emit reference chunks; browser PWA run delegated after sandbox listener EPERM.            |
| Dataset metadata and validator invariants       | Remediation 2 validates every declared dataset entry field plus bounds, populated arrays, and duplicate atomic numbers. |
| Required elements and explicit out-of-set state | Remediation 1 distinguishes structural gaps from uncovered real positions.                                              |

- Design decisions: JSON is dynamically imported, never fetched, so Vite emits it into JS chunks for precache. Searchable element list remains the primary UI; periodic grid is desktop-only and horizontally scrollable. Lanthanide and actinide series remain outside this THCS reference scope; their period-6/7 positions are explicitly labelled “Ngoài tập tra cứu”, not presented as structural gaps.
- Remediation 1: fixed all non-record short-circuit paths in `validateElements`, `validateSolubility`, and `validateSimpleDataset`; each now calls metadata validation before returning. Unit coverage exercises `undefined`, `null`, and a primitive for elements, solubility, valences, activity-series, constants, and precipitates. The periodic grid leaves only structural gaps inert, labels uncovered valid positions “Ngoài tập tra cứu”, and the subpath PWA test now pairs each path with its own expected heading.
- Remediation 2 code-path inventory (all six datasets):
  - `elements.elements[]`: non-empty `symbol`, `name`, and `category`; finite
    `atomicMass` in 1–300; integer `atomicNumber` in 1–118, `period` in 1–7,
    and `group` in 1–18; non-empty table; duplicate `symbol` and
    `atomicNumber` rejection.
  - `solubility.legend`: all `T | K | I | B | -` keys map to non-empty strings;
    `cations[]` and `anions[]` are non-empty, non-empty-string arrays with no
    duplicates; every selected matrix row/cell remains required and is checked
    against the closed enum.
  - `valences.entries[]`: a non-empty table of objects with non-empty
    `formula`, `name`, and non-empty-string `valences[]`.
  - `activitySeries`: non-empty-string `series[]` and non-empty `note`.
  - `constants.constants[]`: a non-empty table of objects with non-empty `id`,
    `name`, and `unit`, plus finite numeric `value`.
  - `precipitates.entries[]`: a non-empty table of objects with non-empty
    `formula`, `name`, `color`, and `note`.
  - Shared metadata on all six datasets remains required: non-empty `source`,
    `version`, and `conditions`.
- Remediation 2 test coverage: corrected the complete-minimal fixture to add
  `category` and populated each required table; added determinate rejection
  cases for new element bounds/duplicate/empty-table rules, malformed and
  incomplete entry objects, constants values, activity-series values/note,
  solubility legend and axes, and all required empty tables.
- Divergences from `content/units/**`: none found. The rounded atomic masses used by existing solutions (for example Fe 56, Cu 64, Zn 65, Cl 35.5) match the GDPT classroom-rounded reference data. The standard source therefore required no override.
- Deviations: none.
- Blockers: browser PWA validation is delegated to orchestrator. `npm run test:pwa` and `npm run test:pwa:subpath` build successfully, then Playwright cannot start preview because `127.0.0.1:4173` returns `listen EPERM: operation not permitted`.
- Remaining risks / follow-up: independent fact-checker must verify every data value against cited sources.

## Validation evidence

STALE (superseded by remediation round 1): the prior validation entry claimed `npm test` PASS, but the authoritative gate run reported unit-tests exit code 1. Remediation 1 gate result is `fail`: git-diff-check 0, format-check 0, content-catalog 0, content-validation 0, lint 0, typecheck 0, unit-tests 1. The unit failure is the existing `tests/scripts/gates-manifest.test.ts` call to `spawnSync git`, rejected by this sandbox with EPERM; 294 tests passed and 1 failed. Later full-profile gates did not run after this failure.

STALE (superseded by remediation round 2): all earlier remediation evidence
predates strengthened entry validation and cannot support this candidate.

Remediation round 2 direct validation, executed against the real six reference
datasets: `npm run lint` PASS (exit 0); `npm run typecheck` PASS (exit 0);
`npm test` FAIL (exit 1: 36 test files/315 tests passed, and the existing
`tests/scripts/gates-manifest.test.ts` `spawnSync git EPERM` test failed);
`npm run validate-content` PASS (exit 0: “Đã kiểm tra 11 unit và 6 bảng tra
cứu, không phát hiện lỗi schema/nội dung.”). The targeted
`tests/lib/reference-validation.test.ts` suite passed 33/33. No real-data
field conflicted with the strengthened rules. Browser/PWA gates were not run
in this remediation round.

## Independent verification

- Verifier / execution identifier / independence method: PENDING
- Exact candidate CI status: PENDING
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a

## Release Assessment

- Assessment and evidence basis: PENDING
