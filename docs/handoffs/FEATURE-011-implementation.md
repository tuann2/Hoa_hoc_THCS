# FEATURE-011 Implementation Handoff

## Status

PARTIAL

## 1. Summary

Implemented FEATURE-011 phase 1 only (plan section 4A + step 10.1):

- added required `category: 'theory' | 'calculation'` to question types;
- extended content validation to fail on missing/invalid `category` and on
  `balance` questions tagged as `calculation`;
- added a reusable tagging script and ran it across all 17 unit files to
  classify all 1053 questions;
- updated tests and fixtures for the new required field, including validator
  negatives and script idempotence coverage.

## 2. Files changed

| File                                          | Change                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/types/content.ts`                        | Added `QuestionCategory` and required `category` on `BaseQuestion`                                      |
| `src/lib/contentValidation.ts`                | Added runtime validation for required/valid categories and `balance => theory` enforcement              |
| `scripts/tag-question-category.ts`            | Added reusable category tagging script with `--force`, reporting, and line-preserving JSON writes       |
| `package.json`                                | Switched `validate-content` script to `node --import tsx/esm ...` so validation can run in this sandbox |
| `content/units/*.json` (17 files)             | Added `category` to every question without changing other question fields                               |
| `tests/scripts/validate-content.test.ts`      | Added validator coverage for missing/invalid category and invalid `balance` category                    |
| `tests/scripts/tag-question-category.test.ts` | Added script heuristic/idempotence coverage                                                             |
| `tests/lib/chemistry.test.tsx`                | Updated fixture for required `category`                                                                 |
| `tests/lib/exam.test.ts`                      | Updated fixture for required `category`                                                                 |
| `tests/components/question-renderer.test.tsx` | Updated fixtures for required `category`                                                                |
| `tests/components/lesson-player.test.tsx`     | Updated fixtures for required `category`                                                                |
| `tests/routes/exam-route.test.tsx`            | Updated fixtures for required `category`                                                                |
| `tests/routes/review-route.test.tsx`          | Updated fixtures for required `category`                                                                |
| `tests/routes/lesson-route.test.tsx`          | Updated fixtures for required `category`                                                                |

## 3. Design decisions

- Kept `category` required at the shared `BaseQuestion` level so all question
  variants inherit the constraint.
- Enforced the `balance => theory` convention as a validator error, not a
  warning, to keep content quality failures blocking.
- Wrote the tagging script to preserve existing JSON formatting by inserting or
  replacing only `category` lines instead of re-serializing the full file.
- Made the tagging heuristic conservative and documented; borderline content is
  left for manual review in the next approved plan steps.

## 4. Deviations from the approved plan

- `package.json` was adjusted so `npm run validate-content` uses
  `node --import tsx/esm scripts/validate-content.ts` instead of the `tsx`
  CLI. In this sandbox, `tsx` CLI fails with `listen EPERM` on its IPC pipe.
  This changes the invocation path only, not validation behavior.

## 5. Commands executed

```bash
node --import tsx/esm scripts/tag-question-category.ts
npx prettier --write scripts/tag-question-category.ts src/lib/contentValidation.ts
npm run validate-content
npm test
npm run lint
npm run typecheck
npm run format:check
```

## 6. Validation results

| Check                      | Result |
| -------------------------- | ------ |
| `npm run validate-content` | PASS   |
| `npm test`                 | PASS   |
| `npm run lint`             | PASS   |
| `npm run typecheck`        | PASS   |
| `npm run format:check`     | PASS   |

## 7. Known limitations

- The category tagging heuristic is intentionally conservative and may leave
  some quantitative prompts tagged as `theory` until manual review.
- This handoff covers phase 1 only; progress-store, sync, and UI work remain
  out of scope for this implementation.

## 8. Remaining risks

- Borderline questions with numeric reasoning but no strong unit/keyword signal
  may need manual retagging.
- Future content authors could still make semantic misclassifications even
  though schema validation now guarantees the field exists.

## 9. Follow-up work

- Complete plan steps 10.2 and 10.3: manual tag review and independent sample
  review on the content diff.
- Implement phase 2 store/sync/UI changes from FEATURE-011 after phase-1
  content tags are accepted.
