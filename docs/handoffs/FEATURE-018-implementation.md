# FEATURE-018 Implementation Handoff

## Status

- Remediation state: VALIDATING
- Risk tier / categories / escalation rationale: NORMAL; React UI and local progress-state logic. No migration, new stored field, version change, or sync merge edit.
- Base SHA / candidate SHA: 43d5fd2 / UNCOMMITTED (HEAD 7e209c4b0bfb5a6171cd655586f4dd958c36b56a)
- Worktree state and dirty paths: implementation changes in `src/lib/adminReports.ts`, `src/routes/{HomeRoute,ProfileRoute,ReviewRoute}.tsx`, `src/store/progress.ts`, and `tests/{store/progress.test.ts,routes/review-route.test.tsx,routes/streak-consumers.test.tsx}`; pre-existing `docs/plans/FEATURE-018.md` remains untouched.
- CI reference for exact candidate (when required/available): PENDING

## Summary and scope

- Requested scope and outcome: derive displayed/admin streaks at read time; count lesson, exam, and the first submitted review answer; add Home reminder and render-time milestones.
- Files changed: store derivation/marking; Home, Profile, Review, and admin consumers; focused store, route, and shared-consumer tests.
- `git diff --stat`: 8 tracked files changed plus one untracked route test at handoff creation.

## Role execution log

| Role                 | Executing agent  | Model / effort       | Human confirmer + timestamp | Execution evidence                     |
| -------------------- | ---------------- | -------------------- | --------------------------- | -------------------------------------- |
| Planner              | Claude Code      | Sonnet 5 / medium    | tuann2, 2026-08-07          | FEATURE-018 plan                       |
| Implementer          | Codex (subagent) | gpt-5.6-terra / high | tuann2, 2026-08-13          | Dispatch relayed original confirmation |
| Independent Reviewer | PENDING          | PENDING              | PENDING                     | PENDING                                |
| Release Assessor     | PENDING          | PENDING              | PENDING                     | PENDING                                |

## Acceptance, decisions, and risks

| Plan acceptance criterion                                         | Evidence / status                                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Expired streak reads as zero in Home/Profile/admin                | Shared-fixture route/admin test passes                                                                         |
| Lesson, exam, and review activity count once                      | Focused store/review-route tests pass                                                                          |
| Review does not mark on opening or through wrong-answer mutations | Review action is called only from first `handleSubmit`; store test verifies wrong-answer mutations do not mark |
| Home reminder and milestones render without persistence           | Route test passes                                                                                              |

- Design decisions: retained UTC `toDateKey`; `deriveStreak` is a pure export and `markStudyDay` remains internal. No `PROGRESS_VERSION`, stored shape, migration, or `progressSync.ts` change.
- Deviations: none.
- Blockers: full `npm test` fails at `tests/scripts/gates-manifest.test.ts` with `spawnSync git EPERM` in this sandbox; the full gate/evidence runner was terminated by the environment after reaching lint, before a result for lint or later gates.
- Remaining risks / follow-up: UTC limitation retained—activity from 00:00–07:00 Vietnam time is attributed to the preceding UTC day. FEATURE-019 owns timezone conversion, existing-data conversion, calendar, and multi-device merge.

## Validation evidence

Focused tests passed: 26 tests across `tests/store/progress.test.ts`, `tests/routes/review-route.test.tsx`, `tests/routes/streak-consumers.test.tsx`, and `tests/lib/admin-reports.test.ts`. `npm run lint` and `npm run typecheck` passed. Full test execution failed only as stated above. Gate runner observed pass: `git-diff-check`, `format-check`, `content-catalog`, `content-validation`; it emitted `lint` start but no completion before environment termination. Therefore no complete `npm run evidence` JSON was generated for this uncommitted candidate.

```json
{ "status": "INCOMPLETE_SANDBOX_EVIDENCE", "candidate": "UNCOMMITTED" }
```

## Independent verification

- Verifier / execution identifier / independence method: PENDING
- Exact candidate CI status: PENDING
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a

## Release Assessment

- Assessment and evidence basis: PENDING
