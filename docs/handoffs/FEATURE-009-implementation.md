# FEATURE-009 Implementation Handoff

## Status

COMPLETED

## 1. Summary

Implemented the approved FEATURE-009 plan to split lesson theory and practice
into explicit independent flows, added reusable exit-confirm navigation for
active sessions, updated routing, and expanded tests for the new behavior.

## 2. Files changed

| File                                      | Change                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/components/ExitButton.tsx`           | Added shared exit button with `window.confirm()` and home navigation.                               |
| `src/components/LessonMap.tsx`            | Added `mode` prop and mode-specific lesson links.                                                   |
| `src/components/LessonPlayer.tsx`         | Split theory/practice flows, added `theory-done`, adjusted progress totals, integrated exit button. |
| `src/routes/HomeRoute.tsx`                | Added mode toggle UI and passed mode into `LessonMap`.                                              |
| `src/routes/LessonRoute.tsx`              | Accepted `mode` prop and forwarded it to `LessonPlayer`.                                            |
| `src/routes/ExamRoute.tsx`                | Added exit button to the running-session header.                                                    |
| `src/routes/ReviewRoute.tsx`              | Added exit button to the active review-session header.                                              |
| `src/App.tsx`                             | Replaced the old combined lesson route with explicit theory/practice routes.                        |
| `package.json`                            | Switched `validate-content` to `node --import tsx` so the validator runs without `tsx` IPC errors.  |
| `tests/components/exit-button.test.tsx`   | Added confirm/cancel navigation tests.                                                              |
| `tests/components/lesson-map.test.tsx`    | Added mode-specific lesson-link coverage and locked lesson regression checks.                       |
| `tests/components/lesson-player.test.tsx` | Added theory/practice mode tests and regression coverage for practice completion behavior.          |
| `tests/routes/exam-route.test.tsx`        | Added assertion that the exit button is present during an active exam.                              |
| `tests/routes/lesson-route.test.tsx`      | Added route wiring and guard coverage for both new lesson paths.                                    |
| `tests/routes/review-route.test.tsx`      | Added assertion that the exit button is present during an active review queue.                      |

## 3. Design decisions

- Reused a single `ExitButton` component across lesson, exam, and review flows
  to keep confirm/navigation behavior identical.
- Kept quiz completion, XP, star, retry queue, and wrong-answer recording logic
  in `LessonPlayer` unchanged except for the mode-specific entry point and route
  targets required by the approved plan.
- Pointed the lesson result screen's next-lesson CTA to the explicit
  `/practice` route because the legacy combined route was removed.

## 4. Deviations from the approved plan

- Adjusted `package.json` so `npm run validate-content` uses `node --import tsx`
  instead of the `tsx` CLI wrapper. In this sandbox, the original command
  failed before running the validator because `tsx` could not create its IPC
  pipe under `/tmp`; the replacement is behaviorally equivalent for this script
  and was required to complete the mandated validation step.

## 5. Commands executed

```bash
npm run validate-content
npm test
npm run lint
npm run typecheck
npm run build
npm run format:check
```

## 6. Validation results

| Check              | Result                                                        |
| ------------------ | ------------------------------------------------------------- |
| Content validation | PASS                                                          |
| Unit tests         | PASS                                                          |
| Lint               | PASS                                                          |
| Typecheck          | PASS                                                          |
| Build              | PASS                                                          |
| Format check       | WARN: pre-existing style issue in `docs/plans/FEATURE-009.md` |

## 7. Known limitations

- The legacy `/learn/:unitId/:lessonId` route is intentionally removed, so old
  bookmarks no longer resolve to a lesson screen.
- `npm run format:check` still reports `docs/plans/FEATURE-009.md`, an approved
  plan file that was not rewritten as part of this implementation.

## 8. Remaining risks

- Future lesson content with zero theory cards or zero questions would still rely
  on the broader assumptions already present in the existing lesson player.

## 9. Follow-up work

- Consider adding a dedicated not-found route if the app later needs clearer UX
  for removed internal paths such as the legacy combined lesson route.
