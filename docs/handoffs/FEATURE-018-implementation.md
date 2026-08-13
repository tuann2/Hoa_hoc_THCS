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

- Verifier / execution identifier / independence method: **CI on the exact
  candidate commit.** `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md:116` makes
  this the primary limb for NORMAL — "CI validates the exact candidate commit
  when available; **otherwise** one fresh read-only reviewer…". CI became
  available again on 2026-08-13 when WORKFLOW-013 unblocked `dependency-audit`;
  it had been failing on `main` since 2026-08-08, which is why FEATURE-017 had
  to fall back to the reviewer limb. tuann2 chose the CI limb for this feature
  on 2026-08-13. **This is not a deviation** — it is the tier's first-listed
  option, now genuinely available.
- Exact candidate CI status: see below.
- Findings and disposition: no separate reviewer execution was dispatched, so
  no reviewer findings exist. Coordinator checks are recorded below and are
  **not** a substitute for independent review — CI is.
- Batch-content exception authorization: n/a

### Coordinator verification (not independent review)

- Scope: 7 files, all inside `allowed_paths`. **`src/lib/progressSync.ts`
  untouched**, no migration, no new stored field, no `PROGRESS_VERSION` change
  — these are the facts the plan's NORMAL classification rests on, so they were
  checked explicitly rather than assumed.
- Trigger correctness: `markReviewStudyDay` is a dedicated store action called
  from `ReviewRoute.handleSubmit`, guarded by a ref so it fires once per
  session. It is **not** hooked into `recordWrongAnswer` / `clearWrongAnswer`,
  which the plan singles out as the easy mistake — those are also called from
  the lesson and exam flows, so hooking them would double-count and would mark
  a study day for activity that is not a review session.
- Date boundaries: the coordinator ran an independent 14-case probe against
  `deriveStreak` — same day, 1 day, 2 days, three weeks, never studied, month
  boundary either side, year boundary, 29 Feb in a leap year and the
  non-leap equivalent, both sides of UTC midnight, and a future
  `lastStudyDate` from a skewed clock. **14/14 correct.**
- Gates: `npm run gates -- --changed-from=43d5fd2` → profile `full`,
  **`result: pass`, 15/15**. Evidence bound to candidate
  `3eef879a56fa77c4aaa734ed42286a2ae2f08c1f`, snapshot
  `dafb7eecac5feef4fdd11040d67a6e22d635641a`, `result: pass`.
- Plan/reality divergence: the plan predicted the **web** classifier profile;
  the classifier resolved **full**. The divergence is in the safe direction —
  more gates ran, not fewer — but the plan's prediction was wrong and is
  recorded here rather than quietly matched.

## Release Assessment

- Assessment and evidence basis: PENDING
