# FEATURE-014 Implementation Handoff

<!-- All evidence prior to round 8 is STALE. Round 8 = final snapshot:
     Codex rounds 4-7 (review-finding fixes) + Claude direct test-spec fixes
     (round 8, test-only, as implementation execution) + full 14-gate
     validation by the networked orchestrator with real Chromium. -->

## Status

- Remediation state: AWAITING_INDEPENDENT_REVIEW
- Risk tier: CRITICAL
- Risk categories: production availability; runtime caching/offline behavior; deployment and CI configuration; new technology adoption
- Escalation rationale: service worker and deployment configuration affect production availability, while the approved PWA/Playwright dependencies add architecture and CI surface.

## 1. Summary

Round 7 fixes the internally inconsistent progress fixture, verifies lesson
XP through the rendered result and persisted profile value, installs the fake
clock before the exam app loads, uses an exact review answer locator, and
creates a real waiting-worker revision through a per-test static server. No
new production code was touched in round 7. The only production touch in the
remediation series remains the round-5
`data-testid="answer-option"` attribute on existing single-choice buttons; it
changes no behavior. No content JSON, migration, commit, push, or deployment
was changed.

Round 8 (final): Claude (orchestrator, acting as implementation execution for
these test-only fixes) resolved the last E2E defects by debugging against the
real browser: a strict-mode locator collision (auth-sync), Playwright
`clock.fastForward` firing intervals only once (exam — switched to
`clock.runFor`), the per-test revision server serving assets without
Content-Type (ES modules refused, blank page), asserting `resolvedAt` as
`undefined` where the store writes `null` (review), and the page not being
SW-controlled before update (waiting state never reachable — added one reload
before triggering update; the final poll also tolerates the by-design one-time
reload). No production code changed in round 8.

Final validation (networked orchestrator, 2026-07-17T03:22:03Z →
2026-07-17T03:23:53Z): ALL 14 gates PASS on this exact snapshot, including
unit 98/98, `test:e2e` 10/10 and `test:pwa` 6/6 with real Chromium on the
production preview — the safe-point update flow is verified end-to-end
(waiting worker defers during a lesson, activates + reloads once at a safe
point).

## 2. Files changed

| File                                                                                                                                                                        | Change                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                                                                                                                  | Catalog, bundle, audit/license and Chromium browser jobs.                                          |
| `package.json`, `package-lock.json`                                                                                                                                         | Approved `vite-plugin-pwa@1.3.0` and `@playwright/test@1.61.1` declarations/lockfile.              |
| `vite.config.ts`, `index.html`, `public/icons/*`                                                                                                                            | Base-aware PWA build, precache and install assets; Vitest E2E exclusion.                           |
| `scripts/generate-content-catalog.ts`, `scripts/check-bundle-budget.ts`                                                                                                     | Catalog generator/check and bundle budget gate.                                                    |
| `content/catalog.json`                                                                                                                                                      | Generated catalog for 17 units and 81 lessons.                                                     |
| `src/App.tsx`, `src/routes/*.tsx`, `src/components/*`                                                                                                                       | Lazy route/content loading, loading/error states, PWA status UI.                                   |
| `src/components/QuestionRenderer.tsx`                                                                                                                                       | Test-only semantic marker on existing single-choice answer buttons.                                |
| `src/lib/content.ts`, `src/lib/contentCatalog.ts`, `src/lib/contentLoader.ts`, `src/lib/progressSync.ts`, `src/lib/pwa.ts`, `src/store/progress.ts`, `src/types/content.ts` | Catalog API, defensive async loader/cache, account-scoped progress sync and safe PWA registration. |
| `playwright.config.ts`, `tests/e2e/*`                                                                                                                                       | Production-preview desktop/mobile behavioral E2E, stateful Supabase mock, and PWA tests.           |
| `tests/lib/*`, `tests/routes/*`                                                                                                                                             | Loader/security and PWA update-guard regression coverage.                                          |
| `eslint.config.js`, `tsconfig.json`, `src/vite-env.d.ts`                                                                                                                    | Scoped E2E hooks override and typing/configuration updates.                                        |
| `README.md`, `docs/architecture.md`, `docs/adr/0002-pwa-cache-and-update-strategy.md`                                                                                       | Feature usage and approved PWA/cache decisions.                                                    |
| `docs/handoffs/FEATURE-014-implementation.md`                                                                                                                               | This regenerated snapshot-bound handoff.                                                           |

```text
Round-4 diff stat is regenerated by the final worktree inspection below.
```

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): `7dd410a6de285f51dc024a5f462b6bd9efc7198e`
- Candidate commit SHA: recorded after commit below (round-8 candidate;
  tree = validated dirty snapshot plus this handoff's own evidence update)
- Worktree state at validation: `dirty`
- CI run reference for the candidate commit: `PENDING` — branch not yet pushed
  (no GitHub credentials in this environment; human will push)
- Dirty paths: `.github/workflows/ci.yml`, `docs/handoffs/FEATURE-014-implementation.md`, `package.json`, `src/components/LessonPlayer.tsx`, `src/components/PwaStatus.tsx`, `src/components/QuestionRenderer.tsx`, `src/lib/contentLoader.ts`, `src/lib/progressSync.ts`, `src/lib/pwa.ts`, `src/routes/ExamRoute.tsx`, `tests/e2e/auth-sync.spec.ts`, `tests/e2e/exam.spec.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/learning.spec.ts`, `tests/e2e/pwa-offline.spec.ts`, `tests/e2e/review.spec.ts`, `tests/lib/content-loader.test.ts`, `tests/lib/pwa.test.ts`, `vite.config.ts`
- Dirty snapshot command: `git add -A && git stash create` (run by the
  orchestrator, whose git metadata is writable)
- Dirty snapshot SHA: `e1837f71aa3e2f74158a774ce6432cc4b3719248`
- Validation start (UTC, ISO 8601): `2026-07-17T03:22:03Z`
- Validation completion (UTC, ISO 8601): `2026-07-17T03:23:53Z`
- Runtime / package-manager versions: Node `v24.16.0`; npm `11.13.0` (plan/CI target remains Node 22)
- Validation-tool versions or lockfile SHA: `package-lock.json sha256 d2aae2b5a72404c09cf97ffa92223d66d6567034edf0d9cf6faf60235da15ba5`

## 4. Validation commands and gates

All commands executed once by the networked orchestrator on the exact final
snapshot (dirty snapshot SHA above), 2026-07-17T03:22:03Z → 03:23:53Z:

| Command                            | Exit status | Quality gate satisfied                                     |
| ---------------------------------- | ----------: | ---------------------------------------------------------- |
| `git diff --check`                 |           0 | Diff hygiene                                               |
| `npm run format:check`             |           0 | Formatting                                                 |
| `npm run validate-content`         |           0 | Content/schema (17 units clean)                            |
| `npm run check:content-catalog`    |           0 | Catalog not stale                                          |
| `npm run lint`                     |           0 | Lint                                                       |
| `npm run typecheck`                |           0 | Type safety                                                |
| `npm test`                         |           0 | 98/98 unit/component tests                                 |
| `npm run build`                    |           0 | Production build (dist manifest, SW, content chunks)       |
| `npm run check:bundle`             |           0 | Bundle budget                                              |
| `npm run check:licenses`           |           0 | License allowlist                                          |
| `npm audit --audit-level=moderate` |           0 | Dependency security audit (0 vulnerabilities)              |
| `npx playwright install chromium`  |           0 | Chromium available                                         |
| `npm run test:e2e`                 |           0 | Behavioral E2E 10/10 (desktop + mobile Chromium)           |
| `npm run test:pwa`                 |           0 | PWA offline/update 6/6 incl. safe-point waiting-worker E2E |

## 5. Design decisions

- The catalog contains only route/map/progress metadata. Full cards and
  questions remain in the 17 JSON units and load through an explicit async
  import map with Promise caching.
- Route chunks use `React.lazy` with shared loading/error UI. Content loader
  validation is retained at the JSON boundary and now narrows the imported
  JSON shape to `UnitContent` only after checking the runtime fields.
- Workbox precaches only built JS/CSS/HTML/icons/manifest assets and uses an
  explicit base-aware app-route allowlist for navigation fallback.
- PWA readiness comes only from `onOfflineReady`; update activation is guarded
  by explicit lesson/exam session state and account sync fences local data by
  user.
- PWA registration uses prompt mode, does not skip waiting, and does not
  reload an active lesson or exam automatically.
- Exam tests flush the loader Promise microtask inside `act` before using
  fake timers; the timeout behavior is therefore tested without raising the
  test timeout.

## 6. Deviations from the approved plan

- No implementation-scope deviation. The Vitest `test.exclude` entry for
  `tests/e2e/**` preserves unit-test scope and prevents Playwright specs from
  being collected by `npm test`; the React hooks rule remains enabled for
  `src/` and is disabled only for the Playwright fixture override.
- Validation was executed by the networked orchestrator (Claude) instead of
  the Codex implementation sandbox, because that sandbox cannot reach the npm
  registry, bind localhost, or write git metadata. The `.gitignore` fix for
  Playwright artifacts is the only orchestrator-authored change; all other
  changes are Codex-authored.

## Round-5 remediation record

- Round-5 root cause 1 — storage seeding: `auth-sync.spec.ts` and
  `review.spec.ts` use `page.addInitScript` before their first `page.goto`, so
  the fixture's storage-clear script and the test seed run on the app origin
  before React initializes. This avoids the original `about:blank`
  `SecurityError` and avoids erasing the seed on the subsequent app navigation.
- Root cause 2 — exam answer control: `QuestionRenderer.tsx` renders
  single-choice answers as buttons (lines 97–117), multi-choice answers as
  checkbox inputs (lines 119–153), and fill/balance answers as text inputs
  (lines 155–218). The exam and learning helpers now use the existing control
  types, visible selectors, and the exact submit labels rendered by the route;
  the single-choice buttons carry `data-testid="answer-option"` so the helper
  does not infer options from container text.
- Root cause 3 — completion assertion: `ResultScreen.tsx` renders the exact
  completion label `Hoàn thành bài học`, heading `Em đã xong lượt luyện này`,
  and XP as `+{earnedXp}` (lines 31–49). Learning E2E now asserts those real
  nodes before checking persisted XP and stars after reload.
- Production code touched: only `src/components/QuestionRenderer.tsx`, adding
  `data-testid="answer-option"` to existing single-choice answer buttons. No
  event handler, state transition, markup behavior, or user-facing text was
  changed.
- Real E2E browser execution: NOT RUN in this implementation sandbox; the
  orchestrator must rerun `test:e2e`/`test:pwa` with the production preview and
  real Chromium.

## Round-6 remediation record

- Auth-sync later assertion: `progressSync.ts` merges `totalXp` with the
  maximum of local and remote values, so local `5` plus Alice's remote `10`
  correctly produces `10`. The supplied accessibility snapshot showed `0`
  because round-5 seeded with `page.evaluate` and then navigated, allowing the
  fixture to clear storage; this was a test setup defect, not an application
  mismatch. The assertion remains scoped to the `Tổng XP` article and exact
  value `10`.
- Exam later assertion: `ExamRoute.tsx` renders the result heading
  `Kết quả thi thử`; its result card renders the label `Số câu đúng` and a
  separate value such as `11/20`, as shown by the supplied accessibility
  snapshot. The test now scopes an anchored `article` by `Số câu đúng` and
  asserts the sibling-style value with `/\d+\/\d+$/`, instead of requiring the
  nonexistent combined string `11/20 câu đúng`. The existing answer helper
  remains grounded in `QuestionRenderer.tsx`: `data-testid="answer-option"`
  for single choice, visible checkbox inputs for multi-choice, and visible
  non-checkbox inputs for fill/balance controls.
- Learning later assertion: `TheoryCard.tsx` renders `Thẻ tiếp theo` for
  non-final theory cards and `Hoàn thành lý thuyết` for the final card. The
  previous helper searched for `Tiếp theo`, so it never reached the actual
  question phase. The test now advances through those exact buttons. Its
  completion assertions match `ResultScreen.tsx` exactly: `Hoàn thành bài
học`, `Em đã xong lượt luyện này`, and the `XP nhận được` card containing
  `+{earnedXp}`; persisted XP and stars are checked after navigation to the
  profile and route home.
- Review later assertion: the fixture clears storage at every document start,
  so the test now seeds via `page.addInitScript` before `/review` rather than
  evaluating on one page and navigating to another. The real question prompts
  and `Kiểm tra`/`Câu tiếp theo` controls are retained, while the final
  assertion reads the persisted `wrongQuestions` map: the correct question has
  a `resolvedAt` timestamp and the wrong question remains unresolved. The
  reload assertion was removed because this fixture intentionally clears
  storage on reload; retaining it would re-seed the queue and test the fixture,
  not persistence.
- PWA waiting-worker test: the round-6 orchestrator log showed the prior
  page-level route never produced `registration.waiting` (the failure was at
  that poll on both projects). The test now intercepts the matching `/sw.js`
  update at browser-context scope, which covers the service-worker fetch, and
  changes its script bytes to create a real waiting worker. It verifies the
  active lesson defers the update action, removes the interception before the
  safe-point navigation, and after clicking `Cập nhật khi sẵn sàng` polls the
  actual registration until `waiting` is false. This checks activation rather
  than depending on a particular `framenavigated` event from `updateSW()`.
- Production code touched in round 6: none. The round-5 test-support marker
  in `QuestionRenderer.tsx` is unchanged and is the only production-code test
  support change in this remediation series.
- Round-6 validation: `git diff --check`, `npm run format:check`,
  `npm run lint`, and `npm run typecheck` all exited 0. `PLAYWRIGHT_SKIP_BUILD=1
npx playwright test --list` exited 0 and listed 16 desktop/mobile tests.
  The real Playwright browser suite was NOT RUN here; it remains explicitly
  delegated to the orchestrator.

## Round-7 remediation record

- Auth-sync fixture consistency: `progressSync.ts` recomputes merged `totalXp`
  from `lessonProgress[*].bestXp`; it does not trust the top-level fixture
  field. `progressSnapshot(totalXp)` now includes the real catalog lesson
  `a1-l1` with the complete `LessonProgress` shape: theory `bestXp` equals
  `totalXp`, practice `bestXp` is `0`, and the aggregate `bestXp` matches the
  sum. This preserves the app's correct merged values of Alice `10` and Bob
  `1`; no production mismatch was found.
- Learning persistence: the test now reads the actual `+{earnedXp}` value from
  `ResultScreen`, requires it to be positive, verifies the persisted snapshot's
  `totalXp` matches it before reload, then asserts the exact same value in the
  profile `Tổng XP` article after reload. The shared fixture clears storage
  only on the first document of a test page, so reload checks real persisted
  state rather than erasing it during setup.
- Exam timeout: `page.clock.install()` now runs before the first `/exam`
  navigation, before any application code or exam timer starts. The test then
  starts the configured default 20-question flow and advances the fake clock
  past its minimum duration; the existing assertion remains the actual
  `ExamRoute` auto-submit heading gated by `result.autoSubmitted`.
- Review locator: the supplied accessibility tree showed two matching button
  names (`electron` and `cả electron và nơtron`). The test now uses
  `getByRole('button', { name: 'electron', exact: true })`, preserving the
  intended wrong-answer transition and persisted queue assertions.
- PWA waiting-worker mechanism: the prior page/context routes did not affect
  the browser's service-worker script fetch, leaving `registration.waiting`
  false before the active-session note could appear. The test now starts an
  isolated same-origin static server for the PWA case. It serves the original
  `dist/sw.js` until the lesson is active, then serves the same script with a
  revision marker for `registration.update()`. This creates a real waiting
  worker, verifies the service worker is activated before the revision, the
  active-session deferral note and hidden button, then navigates to the safe
  point and verifies activation by polling `waiting` to false. No production
  source or build-tracked asset is changed.
- Production code touched in round 7: none. All changes are in E2E specs or
  the shared E2E fixture. The round-5 `QuestionRenderer` test-support marker
  remains unchanged.
- Round-7 validation: `git diff --check`, `npm run format:check`,
  `npm run lint`, and `npm run typecheck` all exited 0.
  `PLAYWRIGHT_SKIP_BUILD=1 npx playwright test --list` exited 0 and listed 16
  desktop/mobile tests. The real Playwright browser suite was NOT RUN here;
  it remains explicitly delegated to the orchestrator.

## 7. Independent verification

- Verifier identity: `PENDING`
- Execution identifier: `PENDING`
- Independence method: `PENDING` — CRITICAL tier requires fresh Gemini review and fresh Codex adversarial review
- CI commit SHA and status: `PENDING` — no candidate commit exists
- Review findings and disposition: Round-4 consolidated findings and the
  superseded round-6/round-7 behavioral evidence are marked STALE; the
  round-7 fixes are recorded above and independent verification remains
  pending.
- DISPOSITIONED (not fixed): `@v4` action tags follow the repository convention; SHA pinning is a follow-up.
- DISPOSITIONED (not fixed): `vite-plugin-pwa` Babel transitives are informational; packages are from the official registry and have no install scripts.
- DISPOSITIONED (not fixed): progress mode-naming consistency is deferred.
- DISPOSITIONED (not fixed): asset-404-after-deploy E2E is a known limitation; `RouteErrorBoundary` is a partial mitigation and a two-deploy harness is follow-up work.
- Authorization source for the batch-content-review exception: `n/a`

## 8. Blockers

- None for validation. Pending: CRITICAL independent reviews (section 7) and
  CI on the candidate commit (requires the human to push the branch — this
  environment has no GitHub credentials).

## 9. Known limitations

- E2E runs on Chromium only (desktop + mobile emulation), per the approved
  plan; no WebKit/Firefox coverage.
- Local validation ran on Node v24; CI remains the Node 22 reference
  environment and must be green on the candidate commit before release.

## 10. Remaining risks

- CI must verify generated Workbox output, GitHub Pages base-path behavior
  (`/Hoa_hoc_THCS/` subpath), offline navigation and update safety on the
  exact candidate commit.
- Fresh independent reviewers must inspect the complete diff and critical
  cache/update failure modes before release readiness is assessed.

## 11. Follow-up work

- Human pushes `feature/FEATURE-014`; verify CI green on the candidate commit.
- Run the required fresh independent review and fresh Codex adversarial
  review; route findings through remediation if any.
