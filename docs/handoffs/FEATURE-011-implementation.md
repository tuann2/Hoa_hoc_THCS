# FEATURE-011 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Implemented Phase 2 of `FEATURE-011` for progress v4, lesson mode splitting,
sync normalization/merge, and UI updates.

- `lessonProgress` now tracks `theory` and `practice` parts separately.
- Theory mode runs cards then theory-only questions; practice mode runs
  calculation-only questions.
- A lesson unlocks the next lesson only after both parts are completed.
- Lessons with zero calculation questions auto-complete the practice part when
  theory is completed.

## 2. Files changed

| File                                          | Change                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/store/progress.ts`                       | Progress v4 shape, migration, per-part completion logic, empty-part auto-complete |
| `src/lib/progressSync.ts`                     | v4 normalize/merge, server v3 upgrade path, new mutation source                   |
| `src/lib/content.ts`                          | Added `getQuestionsByCategory(lesson, category)`                                  |
| `src/components/LessonPlayer.tsx`             | Theory/practice filtering, theory quiz flow, zero-calculation practice screen     |
| `src/components/ResultScreen.tsx`             | Secondary CTA support and next-lesson gating                                      |
| `src/components/LessonMap.tsx`                | Per-part LT/BT chips and zero-practice note/link behavior                         |
| `src/routes/HomeRoute.tsx`                    | Passed lesson progress through to `LessonMap`                                     |
| `src/routes/ProfileRoute.tsx`                 | Updated lesson progress typing for v4                                             |
| `tests/store/progress.test.ts`                | Migration and per-part progress coverage                                          |
| `tests/lib/progress-sync.test.ts`             | Sync normalize/merge coverage for v4                                              |
| `tests/components/lesson-player.test.tsx`     | Per-mode filtering and zero-practice screen coverage                              |
| `tests/components/lesson-map.test.tsx`        | LT/BT chips and zero-practice note coverage                                       |
| `tests/routes/lesson-route.test.tsx`          | Route expectations updated for filtered modes                                     |
| `docs/handoffs/FEATURE-011-implementation.md` | This handoff                                                                      |

## 3. Design decisions

- Kept overall `bestAccuracy`, `bestXp`, and `completedAt` on each lesson entry
  for compatibility with existing readers and sync aggregation.
- Added optional per-part `bestXp` so new v4 progress can preserve anti-farming
  XP behavior without double-counting legacy v3 lessons.
- Legacy v3 entries migrate both parts to the old completion/accuracy state,
  while leaving per-part XP implicit so no existing XP is duplicated.
- Sync merge recomputes lesson completion/stars from merged parts using lesson
  content when the lesson exists locally.

## 4. Deviations from the approved plan

- Validation commands were run with `node --import tsx scripts/validate-content.ts`
  instead of `npm run validate-content` because `tsx` IPC pipe creation failed in
  the sandbox (`EPERM` on `/tmp/tsx-1000/*.pipe`). This matches the approved
  fallback in the task instructions.

## 5. Commands executed

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' AI_WORKFLOW.md
sed -n '1,320p' docs/plans/FEATURE-011.md
node --import tsx scripts/validate-content.ts
npm test
npm run lint
npm run typecheck
npm run format:check
./node_modules/.bin/prettier --write src/components/LessonMap.tsx src/components/LessonPlayer.tsx src/store/progress.ts tests/components/lesson-player.test.tsx tests/lib/progress-sync.test.ts tests/store/progress.test.ts
./node_modules/.bin/vite build
```

## 6. Validation results

| Check                             | Result          |
| --------------------------------- | --------------- |
| Content validation                | PASS            |
| Unit/integration tests (`vitest`) | PASS (87 tests) |
| Lint                              | PASS            |
| Typecheck                         | PASS            |
| Format check                      | PASS            |
| Build                             | PASS            |

## 7. Known limitations

- In practice mode on the lesson map, lessons without calculation questions link
  to the lesson's theory mode instead of opening a disabled row.
- Legacy v3 lessons do not get inferred per-part XP history; only overall
  lesson XP is preserved exactly.

## 8. Remaining risks

- If an external server snapshot contains an unknown lesson id not present in
  local content, sync falls back to a conservative entry merge path because it
  cannot recompute weighted stars from question counts.
- Legacy users who replay previously migrated lessons may only gain additional
  XP after enough per-part progress is re-established to exceed their preserved
  legacy lesson XP total.

## 9. Follow-up work

- Consider surfacing separate theory/practice completion stats in the profile
  page if FEATURE-011 later expands beyond overall lesson completion.
- Consider extracting a shared lesson lookup/cache helper if more sync logic
  starts depending on lesson metadata during normalization or merge.
