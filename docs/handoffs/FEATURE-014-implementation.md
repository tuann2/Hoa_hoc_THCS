# FEATURE-014 Implementation Handoff

<!-- Previous pre-remediation, round-1, round-2 and round-3-sandbox evidence
     is STALE. This handoff records the final snapshot validated by the
     networked orchestrator (Claude) on 2026-07-17, including the full E2E/PWA
     run with real Chromium. -->

## Status

- Remediation state: AWAITING_INDEPENDENT_REVIEW
- Risk tier: CRITICAL
- Risk categories: production availability; runtime caching/offline behavior; deployment and CI configuration; new technology adoption
- Escalation rationale: service worker and deployment configuration affect production availability, while the approved PWA/Playwright dependencies add architecture and CI surface.

## 1. Summary

Implemented the approved FEATURE-014 scope and the requested remediation:
catalog generation/checking, route and content code splitting, safe prompt-mode
PWA updates with offline assets, bundle budget enforcement, Playwright
production-preview coverage, and CI browser execution. The remediation also
fixes the reported lint/typecheck issues and resolves the Exam fake-timer
timeouts by flushing the async loader microtask before asserting the started
exam. No content JSON, auth/RLS logic, migration, commit, push, or deployment
was changed.

Round 3 fixes only the two reported E2E defects: auth E2E now asserts the
configured-but-unauthenticated state (`Chưa đăng nhập`) produced by the
Supabase E2E env, and the PWA offline test waits for the app's
`Đã sẵn sàng học offline.` readiness signal before going offline. The round-2
Chromium mobile and navigation-locator fixes remain in the snapshot.

Final validation (networked orchestrator, 2026-07-17T01:06:13Z →
2026-07-17T01:07:41Z): ALL 14 gates PASS on this exact snapshot, including
`test:e2e` 16/16 and `test:pwa` 6/6 with real Chromium on the production
preview. One post-round-3 config fix by the orchestrator (Claude): Playwright
output dirs `test-results/` and `playwright-report/` added to `.gitignore`
(they leaked E2E artifacts into `prettier --check`); all gates were rerun
after that change.

All earlier evidence (pre-remediation, rounds 1–3, and the Codex-sandbox
blocked runs) is STALE and superseded by the evidence below. No content JSON,
auth/RLS logic, migration, push, or deployment was changed.

## 2. Files changed

| File                                                                                                                                                                        | Change                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                                                                                                                  | Catalog, bundle, audit/license and Chromium browser jobs.                                |
| `package.json`, `package-lock.json`                                                                                                                                         | Approved `vite-plugin-pwa@1.3.0` and `@playwright/test@1.61.1` declarations/lockfile.    |
| `vite.config.ts`, `index.html`, `public/icons/*`                                                                                                                            | Base-aware PWA build, precache and install assets; Vitest E2E exclusion.                 |
| `scripts/generate-content-catalog.ts`, `scripts/check-bundle-budget.ts`                                                                                                     | Catalog generator/check and bundle budget gate.                                          |
| `content/catalog.json`                                                                                                                                                      | Generated catalog for 17 units and 81 lessons.                                           |
| `src/App.tsx`, `src/routes/*.tsx`, `src/components/*`                                                                                                                       | Lazy route/content loading, loading/error states, PWA status UI.                         |
| `src/lib/content.ts`, `src/lib/contentCatalog.ts`, `src/lib/contentLoader.ts`, `src/lib/progressSync.ts`, `src/lib/pwa.ts`, `src/store/progress.ts`, `src/types/content.ts` | Catalog API, validated async loaders/cache, progress normalization and PWA registration. |
| `playwright.config.ts`, `tests/e2e/*`                                                                                                                                       | Production-preview desktop/mobile E2E and PWA tests.                                     |
| `playwright.config.ts`, `tests/e2e/auth-sync.spec.ts`                                                                                                                       | Round-2 fix: Chromium mobile project and actual auth navigation locator.                 |
| `tests/e2e/auth-sync.spec.ts`, `tests/e2e/pwa-offline.spec.ts`                                                                                                              | Round-3 fixes: assert configured auth state and wait for PWA cache readiness.            |
| `tests/lib/*`, `tests/routes/*`                                                                                                                                             | Catalog/loader coverage and remediation of async loader/fake-timer tests.                |
| `eslint.config.js`, `tsconfig.json`, `src/vite-env.d.ts`                                                                                                                    | Scoped E2E hooks override and typing/configuration updates.                              |
| `README.md`, `docs/architecture.md`, `docs/adr/0002-pwa-cache-and-update-strategy.md`                                                                                       | Feature usage and approved PWA/cache decisions.                                          |
| `docs/handoffs/FEATURE-014-implementation.md`                                                                                                                               | This regenerated snapshot-bound handoff.                                                 |

```text
Tracked diff stat: 22 files changed, 6960 insertions(+), 2387 deletions(-)
Additional untracked implementation/docs/test files are listed above.
```

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): `7dd410a6de285f51dc024a5f462b6bd9efc7198e`
- Candidate commit SHA: `89f9e9a` (tree content identical to the validated
  dirty snapshot `283f1bc...` plus this handoff's own evidence update)
- Worktree state at validation: `dirty` (all paths below committed as `89f9e9a`
  immediately after validation, under session-level human authorization)
- CI run reference for the candidate commit: `PENDING` — branch not yet pushed
  (no GitHub credentials in this environment; human will push)
- Dirty paths: `.github/workflows/ci.yml`, `README.md`, `docs/architecture.md`, `docs/adr/0002-pwa-cache-and-update-strategy.md`, `docs/handoffs/FEATURE-014-implementation.md`, `eslint.config.js`, `index.html`, `package-lock.json`, `package.json`, `playwright.config.ts`, `content/catalog.json`, `public/icons/pwa-192.png`, `public/icons/pwa-512.png`, `public/icons/pwa-maskable-512.png`, `scripts/check-bundle-budget.ts`, `scripts/generate-content-catalog.ts`, `src/App.tsx`, `src/components/ContentLoadError.tsx`, `src/components/ContentLoading.tsx`, `src/components/LessonMap.tsx`, `src/components/LessonPlayer.tsx`, `src/components/PwaStatus.tsx`, `src/lib/content.ts`, `src/lib/contentCatalog.ts`, `src/lib/contentLoader.ts`, `src/lib/progressSync.ts`, `src/lib/pwa.ts`, `src/routes/ExamRoute.tsx`, `src/routes/LessonRoute.tsx`, `src/routes/ReviewRoute.tsx`, `src/store/progress.ts`, `src/types/content.ts`, `src/vite-env.d.ts`, `tests/e2e/auth-sync.spec.ts`, `tests/e2e/exam.spec.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/learning.spec.ts`, `tests/e2e/pwa-offline.spec.ts`, `tests/e2e/review.spec.ts`, `tests/lib/content-catalog.test.ts`, `tests/lib/content-loader.test.ts`, `tests/routes/exam-route.test.tsx`, `tests/routes/lesson-route.test.tsx`, `tests/routes/review-route.test.tsx`, `test-results/.last-run.json`, `tsconfig.json`, `vite.config.ts`
- Dirty snapshot command: `git add -A && git stash create` (run by the
  orchestrator, whose git metadata is writable)
- Dirty snapshot SHA: `283f1bc640393c3bc451db3fc11061d6f23d89f4`
- Validation start (UTC, ISO 8601): `2026-07-17T01:06:13Z`
- Validation completion (UTC, ISO 8601): `2026-07-17T01:07:41Z`
- Runtime / package-manager versions: Node `v24.16.0`; npm `11.13.0` (plan/CI target remains Node 22)
- Validation-tool versions or lockfile SHA: `package-lock.json sha256 d2aae2b5a72404c09cf97ffa92223d66d6567034edf0d9cf6faf60235da15ba5`

## 4. Validation commands and gates

All commands executed once by the networked orchestrator on the exact final
snapshot (dirty snapshot SHA above), 2026-07-17T01:06:13Z → 01:07:41Z:

| Command                            | Exit status | Quality gate satisfied                                    |
| ---------------------------------- | ----------: | --------------------------------------------------------- |
| `git diff --check`                 |           0 | Diff hygiene                                              |
| `npm run format:check`             |           0 | Formatting                                                |
| `npm run validate-content`         |           0 | Content/schema (17 units clean)                           |
| `npm run check:content-catalog`    |           0 | Catalog not stale                                         |
| `npm run lint`                     |           0 | Lint                                                      |
| `npm run typecheck`                |           0 | Type safety                                               |
| `npm test`                         |           0 | 97/97 unit/component tests                                |
| `npm run build`                    |           0 | Production build (dist manifest, SW, 17 content chunks)   |
| `npm run check:bundle`             |           0 | Bundle budget (no chunk >500 kB min; home ≤250 kB gzip)   |
| `npm run check:licenses`           |           0 | License allowlist (673 packages)                          |
| `npm audit --audit-level=moderate` |           0 | Dependency security audit (0 vulnerabilities)             |
| `npx playwright install chromium`  |           0 | Chromium available                                        |
| `npm run test:e2e`                 |           0 | E2E 16/16 (desktop + mobile Chromium, production preview) |
| `npm run test:pwa`                 |           0 | PWA offline/update 6/6                                    |

## 5. Design decisions

- The catalog contains only route/map/progress metadata. Full cards and
  questions remain in the 17 JSON units and load through an explicit async
  import map with Promise caching.
- Route chunks use `React.lazy` with shared loading/error UI. Content loader
  validation is retained at the JSON boundary and now narrows the imported
  JSON shape to `UnitContent` only after checking the runtime fields.
- Workbox precaches same-origin hashed static assets, while no Supabase,
  Auth, token, profile or progress requests are configured for caching.
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

## 7. Independent verification

- Verifier identity: `PENDING`
- Execution identifier: `PENDING`
- Independence method: `PENDING` — CRITICAL tier requires fresh Gemini review and fresh Codex adversarial review
- CI commit SHA and status: `PENDING` — no candidate commit exists
- Review findings and disposition: `PENDING`
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
