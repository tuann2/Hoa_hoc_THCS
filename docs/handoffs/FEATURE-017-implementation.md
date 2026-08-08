# FEATURE-017 Implementation Handoff

## Status

- Remediation state: VALIDATING (remediation round 1)
- Risk tier / categories / escalation rationale: NORMAL; educational numeric data, UI/React, and PWA route allowlist.
- Base SHA / candidate SHA: fd0758700abc2d91878c62a5fe390215a559f9a9 / UNCOMMITTED
- Worktree state and dirty paths: implementation paths listed below, plus the pre-existing approved plan.
- CI reference for exact candidate (when required/available): PENDING

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

| Plan acceptance criterion                       | Evidence / status                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Lazy offline reference route                    | Production and subpath builds emit reference chunks; browser PWA run delegated after sandbox listener EPERM. |
| Dataset metadata and validator invariants       | Remediation 1 validates non-object values for every one of six keys; final gates pending.                    |
| Required elements and explicit out-of-set state | Remediation 1 distinguishes structural gaps from uncovered real positions.                                   |

- Design decisions: JSON is dynamically imported, never fetched, so Vite emits it into JS chunks for precache. Searchable element list remains the primary UI; periodic grid is desktop-only and horizontally scrollable. Lanthanide and actinide series remain outside this THCS reference scope; their period-6/7 positions are explicitly labelled “Ngoài tập tra cứu”, not presented as structural gaps.
- Remediation 1: fixed all non-record short-circuit paths in `validateElements`, `validateSolubility`, and `validateSimpleDataset`; each now calls metadata validation before returning. Unit coverage exercises `undefined`, `null`, and a primitive for elements, solubility, valences, activity-series, constants, and precipitates. The periodic grid leaves only structural gaps inert, labels uncovered valid positions “Ngoài tập tra cứu”, and the subpath PWA test now pairs each path with its own expected heading.
- Divergences from `content/units/**`: none found. The rounded atomic masses used by existing solutions (for example Fe 56, Cu 64, Zn 65, Cl 35.5) match the GDPT classroom-rounded reference data. The standard source therefore required no override.
- Deviations: none.
- Blockers: browser PWA validation is delegated to orchestrator. `npm run test:pwa` and `npm run test:pwa:subpath` build successfully, then Playwright cannot start preview because `127.0.0.1:4173` returns `listen EPERM: operation not permitted`.
- Remaining risks / follow-up: independent fact-checker must verify every data value against cited sources.

## Validation evidence

STALE (superseded by remediation round 1): the prior validation entry claimed `npm test` PASS, but the authoritative gate run reported unit-tests exit code 1. Remediation 1 gate result is `fail`: git-diff-check 0, format-check 0, content-catalog 0, content-validation 0, lint 0, typecheck 0, unit-tests 1. The unit failure is the existing `tests/scripts/gates-manifest.test.ts` call to `spawnSync git`, rejected by this sandbox with EPERM; 294 tests passed and 1 failed. Later full-profile gates did not run after this failure.

## Independent verification

- Verifier / execution identifier / independence method: PENDING
- Exact candidate CI status: PENDING
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a

## Release Assessment

- Assessment and evidence basis: PENDING
