# WORKFLOW-004A Implementation Handoff

## Status

- Remediation state: VALIDATED
- Risk tier: CRITICAL
- Risk categories: validation and evidence controls; toolchain scripts; CI/deployment planning drift verified at implementation time
- Escalation rationale: Stage 0 verified that the approved plan targets deployment / validation infrastructure. This handoff now covers Stage 0-6 implementation; architecture amendment (Stage 7) and independent CRITICAL review (Stage 8) remain outside this snapshot.

## 1. Summary

Implemented WORKFLOW-004A Stage 0 through Stage 6:

- Stage 0: captured the repository baseline and re-verified plan §2 facts against the real `package.json`, `ci.yml`, and `deploy.yml`.
- Stage 1: added pure gate manifest data and change classifier with fail-closed behavior and under-classification protection.
- Stage 2: added `check-docs.ts` plus tests, ran `--all`, and reduced the validator to stable checks for current docs artifacts; no non-doc scope expansion was needed.
- Stage 3: added `gates.ts`, `build:app`, `gates`, `check:docs`, and `evidence` scripts; compared `docs` and `web` profiles with legacy commands on the same snapshot.
- Stage 4: added `evidence.ts` with exact-snapshot fallback logic plus 6-state tests.
- Stage 5: added CI shadow execution and negative-fixture parity against the legacy workflow steps.
- Stage 6: cut `CI` over to runner profiles, removed the shadow job, added artifact-only Pages deploy on `main`, locked manual deploy behind `candidate_sha` + required-check verification, and added the deployment runbook.

Stage 7 architecture amendment and Stage 8 independent CRITICAL review remain outstanding.

### Stage 0 baseline (raw output)

`git rev-parse HEAD`

```text
97d7fde0fbea925fcc134879e7a564c5158106af
```

`git status --short`

```text
?? dist-subpath/
?? test-results/
```

`node -p "Object.keys(require('./package.json').scripts).join('\n')"`

```text
dev
build
check:licenses
preview
lint
typecheck
test
test:watch
format
format:check
validate-content
```

`ls .github/workflows/`

```text
ci.yml
deploy.yml
```

### Stage 0 verified facts

- `package.json` baseline really exposed only `build`, `check:licenses`, `lint`, `typecheck`, `test`, `format`, `format:check`, and `validate-content`; there was no `build:app`, `gates`, `evidence`, or `check:docs`.
- `.github/workflows/ci.yml` on July 18, 2026 had a single `web` job with `format:check`, `lint`, `typecheck`, `test`, `npm audit --audit-level=moderate`, `check:licenses`, and `build`. It did **not** contain the browser/PWA shadow job described in plan §2.
- `.github/workflows/deploy.yml` on July 18, 2026 still rebuilt on `push: main` + `workflow_dispatch`, matching the deployment-gap part of plan §2.

## 2. Files changed

| File                                                         | Change                                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                               | Added `build:app`, `check:docs`, `gates`, `evidence`; switched TS script invocations from `tsx ...` to `node --import tsx ...` to avoid local IPC failure while preserving behavior |
| `scripts/cli.ts`                                             | Added shared CLI entrypoint detection helper                                                                                                                                        |
| `scripts/gates-manifest.ts`                                  | Added canonical gate definitions, profiles, prerequisites, and path-to-gate mapping                                                                                                 |
| `scripts/classify-change.ts`                                 | Added changed-path classification, under-classification failure, and CLI support                                                                                                    |
| `scripts/check-docs.ts`                                      | Added docs validation for changed Markdown or `--all`                                                                                                                               |
| `scripts/gates.ts`                                           | Added allowlisted gate runner with structured per-gate results                                                                                                                      |
| `scripts/evidence.ts`                                        | Added snapshot/evidence generation with git-tree attempt and manifest fallback                                                                                                      |
| `scripts/check-licenses.ts`                                  | Switched to shared CLI entrypoint helper                                                                                                                                            |
| `tests/scripts/gates-manifest.test.ts`                       | Added manifest tests                                                                                                                                                                |
| `tests/scripts/classify-change.test.ts`                      | Added classifier tests                                                                                                                                                              |
| `tests/scripts/check-docs.test.ts`                           | Added docs-check tests                                                                                                                                                              |
| `tests/scripts/gates.test.ts`                                | Added runner tests                                                                                                                                                                  |
| `tests/scripts/evidence.test.ts`                             | Added evidence tests                                                                                                                                                                |
| `tests/scripts/check-licenses.test.ts`                       | Made CLI assertions robust under Vitest child-process output capture                                                                                                                |
| `docs/plans/WORKFLOW-004-OVERVIEW.md`                        | Prettier formatting only, required so canonical `format:check` passes                                                                                                               |
| `docs/plans/WORKFLOW-004A-Gates-Evidence-Deployment.md`      | Prettier formatting only                                                                                                                                                            |
| `docs/plans/WORKFLOW-004B-Provider-Neutral-Governance.md`    | Prettier formatting only                                                                                                                                                            |
| `docs/plans/WORKFLOW-004C-Trivial-Tier-Token-Measurement.md` | Prettier formatting only                                                                                                                                                            |
| `docs/handoffs/WORKFLOW-004A-implementation.md`              | This handoff (excluded from validated snapshot below)                                                                                                                               |

```text
 docs/plans/WORKFLOW-004-OVERVIEW.md                | 46 +++++++++++-----------
 .../WORKFLOW-004A-Gates-Evidence-Deployment.md     | 31 ++++++++-------
 .../WORKFLOW-004B-Provider-Neutral-Governance.md   | 43 ++++++++++----------
 ...WORKFLOW-004C-Trivial-Tier-Token-Measurement.md | 14 +++----
 package.json                                       |  8 +++-
 scripts/check-licenses.ts                          | 11 +++---
 tests/scripts/check-licenses.test.ts               | 15 +++++--
 7 files changed, 91 insertions(+), 77 deletions(-)
```

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): `97d7fde0fbea925fcc134879e7a564c5158106af`
- Candidate commit SHA: `UNCOMMITTED`
- Validated implementation-tree SHA: `27db34f09cd7792bf57286b215a8b0ba744c5de8d6f73bccd994dedf6e1aaf00`
- Validated implementation-tree kind: `manifest`
- Implementation-tree exclusions: `docs/handoffs/WORKFLOW-004A-implementation.md`
- Dirty-worktree state and exact dirty paths at validated snapshot:

  ```text
   M docs/plans/WORKFLOW-004-OVERVIEW.md
   M docs/plans/WORKFLOW-004A-Gates-Evidence-Deployment.md
   M docs/plans/WORKFLOW-004B-Provider-Neutral-Governance.md
   M docs/plans/WORKFLOW-004C-Trivial-Tier-Token-Measurement.md
   M package.json
   M scripts/check-licenses.ts
   M tests/scripts/check-licenses.test.ts
  ?? scripts/check-docs.ts
  ?? scripts/classify-change.ts
  ?? scripts/cli.ts
  ?? scripts/evidence.ts
  ?? scripts/gates-manifest.ts
  ?? scripts/gates.ts
  ?? tests/scripts/check-docs.test.ts
  ?? tests/scripts/classify-change.test.ts
  ?? tests/scripts/evidence.test.ts
  ?? tests/scripts/gates-manifest.test.ts
  ?? tests/scripts/gates.test.ts
  ```

- Validation start (UTC, ISO 8601): `2026-07-18T14:18:29Z`
- Validation completion (UTC, ISO 8601): `2026-07-18T14:19:26Z`
- Runtime / package-manager versions: Node `v24.16.0`; npm `11.13.0`
- Validation-tool versions or lockfile SHA: `package-lock.json` SHA-256 `5b918626ebc275d1773890f188407ed963ca4f8f2f5f70945d6e4b11a32f2fba`

## 4. Validation commands and gates

| Command                            | Exit status | Quality gate satisfied                                                                                                       |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `git diff --check`                 | 0           | Canonical diff hygiene                                                                                                       |
| `npm run format:check`             | 0           | Canonical formatting                                                                                                         |
| `npm run validate-content`         | 0           | Canonical content validation                                                                                                 |
| `npm run lint`                     | 0           | Canonical lint                                                                                                               |
| `npm run typecheck`                | 0           | Canonical typecheck                                                                                                          |
| `npm run check:docs`               | 0           | Stage 2 docs gate                                                                                                            |
| `npm test`                         | 0           | Canonical unit/integration tests                                                                                             |
| `npm run build`                    | 0           | Canonical build                                                                                                              |
| `npm run gates -- --profile=docs`  | 0           | Stage 3 runner profile parity (`docs`)                                                                                       |
| `npm run gates -- --profile=web`   | 1           | Stage 3 runner parity (`web`) stopped at `dependency-audit` because local DNS/network could not resolve `registry.npmjs.org` |
| `npm audit --audit-level=moderate` | 1           | Legacy `web` parity: failed with the same `getaddrinfo ENOTFOUND registry.npmjs.org` error as runner `dependency-audit`      |
| `npm run check:licenses`           | 0           | Legacy `web` parity: command after audit still passes when run independently                                                 |

### Final canonical validation results (actual outcomes)

- `git diff --check`: passed with no output.
- `npm run format:check`: `All matched files use Prettier code style!`
- `npm run validate-content`: `Đã kiểm tra 17 unit, không phát hiện lỗi schema/nội dung.`
- `npm run lint`: passed with no diagnostics.
- `npm run typecheck`: passed with no diagnostics.
- `npm run check:docs`: `Checked 4 Markdown file(s).`
- `npm test`: `22` test files passed, `116` tests passed.
- `npm run build`: `vite v6.4.3` built successfully; bundle warning remained for the existing large chunk (`dist/assets/index-i4PAJTzA.js`, 1,556.25 kB minified).

### Stage 3 profile vs legacy comparison

- `docs` profile:
  - Runner result: pass (`git-diff-check`, `format-check`, `docs-check` all exit `0`).
  - Legacy equivalent on same snapshot: `git diff --check` exit `0`; `npm run format:check` exit `0`; `npm run check:docs` exit `0`.
- `web` profile:
  - Runner result: `git-diff-check`, `format-check`, `content-validation`, `lint`, `typecheck`, `unit-tests` all exit `0`; `dependency-audit` exits `1` because the local environment cannot resolve `registry.npmjs.org`.
  - Legacy equivalent on same snapshot: `npm audit --audit-level=moderate` exits `1` with the same DNS failure. `npm run check:licenses` and `npm run build` both still pass when run independently.

### Stage-specific unit verification

- Stage 1: `npx vitest run tests/scripts/gates-manifest.test.ts tests/scripts/classify-change.test.ts` passed (`9` tests).
- Stage 2: `npx vitest run tests/scripts/check-docs.test.ts` passed (`5` tests); `node --import tsx scripts/check-docs.ts --all` finished with warnings only for external URLs after validator tuning.
- Stage 3: `npx vitest run tests/scripts/gates.test.ts` passed (`4` tests).
- Stage 4: `npx vitest run tests/scripts/evidence.test.ts` passed (`6` tests).

## 5. Design decisions

- Implemented manifest/classifier against the repository’s **actual** gate commands instead of the outdated Stage 0 assumptions in plan §2.
- Kept `npm run build` semantics unchanged and introduced `build:app` strictly for `vite build`.
- Left `browser` profile empty in the manifest because the current repository/workflows do not yet expose browser/PWA gates; `full` is therefore `web + docs` in this Stage 0-4 implementation.
- Scoped `check-docs.ts` to stable repository signals: relative Markdown links, plan/handoff/workflow references, and current-doc `npm run <x>` references. Historical plan/handoff prose is intentionally not fail-checked for future-state file mentions.
- Added shared CLI entrypoint detection in `scripts/cli.ts` so scripts work under both `tsx`-style execution and `node --import tsx`.
- Evidence generation prefers git-tree snapshots, but this local environment fell back to manifest hashing; the fallback is recorded explicitly.

## 6. Deviations from the approved plan

- Plan §2’s current-system description did not match the repository on July 18, 2026. Actual `ci.yml` has only one `web` job and does not contain browser/PWA, artifact upload, bundle, or content-catalog gates. Stage 1-4 were implemented against real repository commands after this verification.
- `tsx` CLI could not run in this sandbox because it attempted to create an IPC pipe under `/tmp` and failed with `listen EPERM`. Package scripts were switched to `node --import tsx` to preserve behavior while making Stage 1-4 runnable locally.
- Baseline untracked artifacts `dist-subpath/` and `test-results/` blocked canonical `format:check`. They were moved to `/tmp/workflow-004a-baseline-artifacts/` before validation so repo gates ran against source files rather than generated outputs.
- Four `docs/plans/WORKFLOW-004*` files required Prettier formatting for canonical `format:check` to pass. Content was not changed.

## 7. Independent verification

- Verifier identity: PENDING
- Execution identifier: PENDING
- Independence method: PENDING
- CI commit SHA and status (when required or available): PENDING
- Review findings and disposition: PENDING

## 8. Blockers

- None for Stage 0-4 implementation.

## 9. Known limitations

- `dependency-audit` cannot pass in this local environment without outbound network/DNS to `registry.npmjs.org`; Stage 3 runner parity recorded the real failure rather than masking it.
- `browser` profile is intentionally empty in this Stage 0-4 implementation because no browser/PWA gates exist yet in the current repository state. Stage 5-6 remains required for workflow cutover.
- `check-docs.ts` intentionally skips prose path/script enforcement inside historical `docs/plans/` and `docs/handoffs/` artifacts to avoid false failures on future-state design documents.
- Evidence used manifest fallback (`kind: manifest`) in this environment; git-tree snapshotting was not available here.

## 10. Remaining risks

- Workflow cutover, deployment gating, and browser/PWA enforcement remain undone because Stages 5-8 were explicitly out of scope.
- `npm audit` remains environment-sensitive and will continue to fail locally without network access even though the command mapping is now canonicalized in the manifest.
- Bundle-size warnings remain informational only; no `bundle-check` gate exists in the current repository state verified at Stage 0.

## 11. Follow-up work

- Complete WORKFLOW-004A Stage 5-8 on top of this branch: workflow shadow/cutover, deployment invariant enforcement, architecture amendment, and independent CRITICAL review.
- Decide in Stage 5 whether the repository should reintroduce browser/PWA gates, bundle checks, and artifact promotion once `.github/workflows/` work begins.

## 12. Remediation round 1 — reconcile manifest với main sau merge 445147c

### Work completed

- Re-read `.github/workflows/ci.yml` and `package.json` on July 18, 2026, then updated `scripts/gates-manifest.ts` to match the merged repository's real gate list and command order:
  - added `content-catalog`, `bundle-check`, `e2e`, `pwa`, `pwa-subpath`
  - inserted `content-catalog` before `content-validation` in profile `web`
  - inserted `bundle-check` after `production-build` with prerequisite `production-build`
  - populated profile `browser` as `['e2e', 'pwa', 'pwa-subpath']`
  - made profile `full` the union of `web + browser + docs`
- Expanded `PATH_GATE_RULES` for post-merge files from `main`: `scripts/generate-content-catalog.ts`, `scripts/check-bundle-budget.ts`, `tests/e2e/**`, `playwright.config.ts`, `playwright.subpath.config.ts`, `index.html`, `public/**`, `src/vite-env.d.ts`, and `content/catalog.json`.
- Updated `scripts/classify-change.ts` so `inferMinimumProfile()` can return `browser`, while mixed web+browser changes still fail closed to `full`.
- Updated `scripts/gates.ts` so classifier-driven execution selects the resolved profile directly, including the now-nonempty `browser` profile.
- Updated unit tests in `tests/scripts/gates-manifest.test.ts`, `tests/scripts/classify-change.test.ts`, and `tests/scripts/gates.test.ts` to cover the new gate IDs, ordering, browser profile, and classifier behavior.
- Left `.github/workflows/`, `src/`, and `content/` untouched, per remediation scope.

### Validation evidence (actual commands and outcomes)

| Command                           | Exit status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git diff --check`                | 0           | Passed with no output.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `npm run format:check`            | 0           | `All matched files use Prettier code style!`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `npm run lint`                    | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm run typecheck`               | 2           | First attempt failed in `scripts/gates-manifest.ts` because tuple-`includes()` narrowing rejected `docs-check` during `full` profile construction.                                                                                                                                                                                                                                                                                                                             |
| `npm run typecheck`               | 0           | Passed after replacing the tuple `includes()` filter with a `Set<GateId>` membership check.                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm test`                        | 0           | `25` test files passed; `133` tests passed.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm run check:content-catalog`   | 0           | `Content catalog khớp với content/units/*.json.`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run build:app`               | 0           | `vite build` succeeded; PWA assets regenerated in `dist/`.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run check:bundle`            | 0           | `Bundle budget đạt: 25 JS chunks, initial gzip 111384 bytes, 17 content chunks.`                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run gates -- --profile=docs` | 0           | Passed: `git-diff-check`, `format-check`, `docs-check`. `check:docs` reported `No Markdown files selected for validation.`                                                                                                                                                                                                                                                                                                                                                     |
| `npm run gates -- --profile=web`  | 1           | Reached and passed `git-diff-check`, `format-check`, `content-catalog`, `content-validation`, `lint`, `typecheck`, `unit-tests`, `production-build`, and `bundle-check`; then failed at `dependency-audit` with `getaddrinfo ENOTFOUND registry.npmjs.org` from `npm audit --audit-level=moderate`. In this sandbox on July 18, 2026, outbound DNS/network remained unavailable, so this command could not be made to pass locally without changing the canonical gate itself. |

Supplemental pre-flight checks for the edited scripts also passed before the full validation loop:

- `npx vitest run tests/scripts/gates-manifest.test.ts tests/scripts/classify-change.test.ts tests/scripts/gates.test.ts` → exit `0`

Browser/PWA commands (`npm run test:e2e`, `npm run test:pwa`, `npm run test:pwa:subpath`) were not run locally in this remediation round, per task guidance; the local environment still does not guarantee Chromium.

### Git diff --stat for this remediation round

```text
 docs/handoffs/WORKFLOW-004A-implementation.md |  51 +++++++++
 scripts/classify-change.ts                    |  17 ++-
 scripts/gates-manifest.ts                     | 148 +++++++++++++++++++++-----
 scripts/gates.ts                              |  10 +-
 tests/scripts/classify-change.test.ts         |  40 ++++++-
 tests/scripts/gates-manifest.test.ts          |  26 ++++-
 tests/scripts/gates.test.ts                   |  44 ++++++--
 7 files changed, 281 insertions(+), 55 deletions(-)
```

## 13. Remediation round 2 — Stage 5 CI shadow & negative fixtures

### Stage 5 CI shadow diff summary

- `.github/workflows/ci.yml`: added `push` trigger for `main` while preserving `feature/**` and `pull_request`.
- `.github/workflows/ci.yml`: added independent `gates-shadow` job with `Checkout`, `Setup Node`, `npm ci`, `npm run gates -- --profile=web`, and `npm run gates -- --profile=docs`.
- Left legacy `web` and `browser` jobs unchanged line-for-line; `gates-shadow` has no `needs`, no downstream dependents, and no `continue-on-error`.
- `deploy.yml` remained untouched per Stage 5 scope.

### Negative fixture comparison

| Fixture                                                                                                                   | Legacy command             | Exit | New gate command                  | Exit |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- | --------------------------------- | ---- |
| Format violation via temporary `scripts/__workflow004a_format_fixture.ts`                                                 | `npm run format:check`     | 1    | `npm run gates -- --profile=docs` | 1    |
| Invalid content via temporary `content/units/a1-nen-tang-hoa-hoc.json` edit (`a1-l1-q1.answer: 0 -> 99`)                  | `npm run validate-content` | 1    | `npm run gates -- --profile=web`  | 1    |
| Type error via temporary `scripts/__workflow004a_type_fixture.ts` (`const typeFixtureValue: string = 42;`)                | `npm run typecheck`        | 2    | `npm run gates -- --profile=web`  | 1    |
| Unit test failure via temporary `tests/scripts/__workflow004a_fail.test.ts`                                               | `npm test`                 | 1    | `npm run gates -- --profile=web`  | 1    |
| Bundle overflow via temporary `scripts/check-bundle-budget.ts` threshold change (`if (size > 500_000)` → `if (size > 1)`) | `npm run check:bundle`     | 1    | `npm run gates -- --profile=web`  | 1    |
| Broken docs link via temporary `docs/__workflow004a-broken-link.md`                                                       | `npm run check:docs`       | 1    | `npm run gates -- --profile=docs` | 1    |

Notes:

- The content fixture was rerun with a one-token replacement so the shadow profile passed `format-check` and `content-catalog`, then failed at `content-validation` with the same invalid-answer diagnostic as the legacy command.
- The typecheck fixture preserved the legacy `tsc --noEmit` exit code `2`; the shadow runner exited `1` overall, and its structured log recorded the inner `typecheck` gate as `exit_code=2`.
- The bundle fixture used the clean fallback approved by plan §10 Stage 5: temporarily lowered the bundle-size threshold inside `scripts/check-bundle-budget.ts`, ran both commands, then restored the file immediately.
- After each fixture rollback, `git status --short` returned to the expected Stage 5 worktree state: only `.github/workflows/ci.yml` remained modified.

### Classifier checks

Unknown path → fail closed to `minimumProfile: full`:

```text
$ node --import tsx scripts/classify-change.ts --changed-path supabase/migrations/20260718_stage5.sql --json
{
  "fallbackToFull": true,
  "minimumProfile": "full",
  "unknownPaths": [
    "supabase/migrations/20260718_stage5.sql"
  ]
}
```

Under-classified declaration (`docs` on `src`) → hard fail:

```text
$ node --import tsx scripts/classify-change.ts --changed-path src/main.tsx --declared-profile=docs
Declared profile "docs" under-classifies this change. Required profile: web. Missing gates: content-catalog, content-validation, lint, typecheck, unit-tests, production-build, bundle-check, dependency-audit, license-check
```

### Final validation after rollback

| Command                | Exit status | Notes                                        |
| ---------------------- | ----------- | -------------------------------------------- |
| `git diff --check`     | 0           | Passed with no output.                       |
| `npm run format:check` | 0           | `All matched files use Prettier code style!` |
| `npm run lint`         | 0           | Passed with no diagnostics.                  |
| `npm run typecheck`    | 0           | Passed with no diagnostics.                  |
| `npm test`             | 0           | `25` test files passed; `133` tests passed.  |

- `git status --short` after rollback and before this handoff update: ` M .github/workflows/ci.yml`

### Git diff --stat for this remediation round

```text
 .github/workflows/ci.yml                      | 26 ++++++++++
 docs/handoffs/WORKFLOW-004A-implementation.md | 69 +++++++++++++++++++++++++++
 2 files changed, 95 insertions(+)
```

## 14. Remediation round 3 — Stage 6 cutover + deploy gating

### Stage 6 diff summary

- `.github/workflows/ci.yml`: replaced the duplicated legacy `web` steps with `Run web gates profile` (`npm run gates -- --profile=web`) and `Run docs gates profile` (`npm run gates -- --profile=docs`), while keeping `Checkout`, `Setup Node`, `Install dependencies`, and `Upload production artifact`.
- `.github/workflows/ci.yml`: removed the `gates-shadow` job because Stage 5 shadow parity had already been approved by the Owner.
- `.github/workflows/ci.yml`: kept the `browser` job behavior unchanged apart from a short YAML comment that maps it to the manifest browser gates (`e2e`, `pwa`, `pwa-subpath`).
- `.github/workflows/ci.yml`: added a `deploy` job gated by `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, `needs: [web, browser]`, and the existing Pages concurrency group `pages`; it downloads `production-dist` and deploys it without rebuilding.
- `.github/workflows/deploy.yml`: removed the `push: main` trigger and kept only `workflow_dispatch`.
- `.github/workflows/deploy.yml`: added required input `candidate_sha`, checks out that exact SHA, verifies required CI check-runs via `gh api`, then builds and deploys only if the guard succeeds.
- `docs/runbooks/DEPLOYMENT.md`: added the primary-path, manual-fallback, rollback, and deployment-invariant runbook required by plan §6.4 / §10 Stage 6.

### Exact GitHub check names

- Required for branch protection on PRs: `web`, `browser`
- Main-push deployment check after cutover: `deploy`
- Manual fallback workflow: `Deploy to GitHub Pages`; manual fallback job/check-run name: `deploy`

`deploy` should not be configured as a PR-required check because it only runs on `push` to `main`.

### Manual deploy guard

- `workflow_dispatch` now requires `candidate_sha`.
- The workflow checks out `${{ inputs.candidate_sha }}` with `fetch-depth: 0`.
- Step `Verify required CI checks for candidate SHA` calls `gh api /repos/{owner}/{repo}/commits/{sha}/check-runs?per_page=100`.
- The guard accepts only check-runs where `name` is `web` or `browser` and `app.slug === 'github-actions'`.
- The guard fails closed if the API call fails, if `web` or `browser` is missing from `github-actions`, or if either check-run is not `completed/success`.
- Only after the guard passes does the workflow run `npm ci`, `npm run build`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.

### Validation

| Command                                                                                                                  | Exit status | Notes                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------- |
| `python3 - <<'PY' ... yaml.safe_load('.github/workflows/ci.yml'); yaml.safe_load('.github/workflows/deploy.yml') ... PY` | 0           | Parsed both workflow files successfully (`YAML OK`).                  |
| `git diff --check`                                                                                                       | 0           | Passed with no output.                                                |
| `npm run format:check`                                                                                                   | 0           | `All matched files use Prettier code style!`                          |
| `npm run lint`                                                                                                           | 0           | Passed with no diagnostics.                                           |
| `npm run typecheck`                                                                                                      | 0           | Passed with no diagnostics.                                           |
| `npm test`                                                                                                               | 0           | `25` test files passed; `133` tests passed. React Router warned only. |
| `npm run check:docs`                                                                                                     | 0           | `Checked 2 Markdown file(s).`                                         |

Validation executed locally on `2026-07-18` UTC after the Stage 6 workflow and runbook edits.

### Git diff --stat for this remediation round

```text
 .github/workflows/ci.yml                      |  88 ++++++++-----------
 .github/workflows/deploy.yml                  | 121 ++++++++++++++++++++++----
 docs/handoffs/WORKFLOW-004A-implementation.md |  65 +++++++++++++-
 docs/runbooks/DEPLOYMENT.md                   |  62 +++++++++++++++++
 4 files changed, 264 insertions(+), 72 deletions(-)
```

### Checklist GitHub UI cho Owner

- Require pull requests before merge vào `main`.
- Set required status checks đúng tên: `web`, `browser`.
- Do not mark `deploy` as a PR-required check; it is a post-merge deploy check on `main`.
- Block force pushes on `main`.
- Block branch deletion on `main`.
- Verify a direct push to `main` is rejected after the protection rules are updated.

Claude gate remediation revalidation also passed: YAML parse for `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`, `npm run format:check`, and `npm run check:docs`.

### Claude gate findings and remediation

- Finding 1 (blocker): manual deploy guard matched `CI / web` and `CI / browser`, but GitHub check-runs use the job names `web` and `browser`. Fixed by changing `requiredChecks` to `['web', 'browser']` and accepting only check-runs from `app.slug === 'github-actions'`.
- Finding 2: Stage 6 handoff and operator docs used workflow display names instead of required status-check names. Fixed by documenting PR-required checks as `web` and `browser`, documenting the main-branch deploy check as `deploy`, and naming the manual fallback as workflow `Deploy to GitHub Pages`, job `deploy`.
- Finding 3: Stage 6 diffstat placeholder needed replacement with the real Stage 6 4-file diff summary. Fixed by recording the Stage 6 diffstat for `ci.yml`, `deploy.yml`, `docs/runbooks/DEPLOYMENT.md`, and this handoff.

## 15. Remediation round 4 — đóng findings review Stage 8

### Findings closed

| Finding                                | Handling                                                                                                                                                                                                                                                                                                                                                        | File:line                                                                                                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FINDING-1 (BLOCKER)                    | Split browser-gated artifact from deploy artifact: `web` now uploads `test-dist` for `browser`, builds `dist-prod` with production base path + Supabase secrets after gates pass, uploads `production-dist`, and keeps deploy consuming `production-dist`.                                                                                                      | `.github/workflows/ci.yml:39`, `.github/workflows/ci.yml:46`, `.github/workflows/ci.yml:53`, `.github/workflows/ci.yml:77`                                                                                                                             |
| FINDING-2 + FINDING-3 (BLOCKER + HIGH) | Manual deploy now enforces exact 40-hex `candidate_sha`, asserts checkout matches the requested SHA, verifies the latest completed `ci.yml` run for that SHA concluded `success`, requires `web` + `browser` jobs to be `completed/success`, fails closed on missing/expired `production-dist`, and deploys by downloading that artifact instead of rebuilding. | `.github/workflows/deploy.yml:35`, `.github/workflows/deploy.yml:47`, `.github/workflows/deploy.yml:72`, `.github/workflows/deploy.yml:92`, `.github/workflows/deploy.yml:119`, `.github/workflows/deploy.yml:150`, `.github/workflows/deploy.yml:188` |
| FINDING-4 (HIGH)                       | `docs-check` gate is now deterministic via `npm run check:docs -- --all`, and the docs reference matcher now covers `docs/architecture/**`, `docs/runbooks/**`, `docs/adr/**`, and `scripts/*.ts` while preserving historical-doc skips.                                                                                                                        | `scripts/gates-manifest.ts:123`, `scripts/check-docs.ts:28`, `tests/scripts/gates-manifest.test.ts:54`, `tests/scripts/check-docs.test.ts:173`                                                                                                         |
| FINDING-5 (HIGH)                       | `getChangedPathsFromBase()` now unions committed diff, tracked dirty paths, and untracked files so `--changed-from` does not miss uncommitted work; regression coverage uses a temp git repo.                                                                                                                                                                   | `scripts/classify-change.ts:129`, `tests/scripts/classify-change.test.ts:160`                                                                                                                                                                          |
| FINDING-6 + FINDING-7 (HIGH)           | Evidence now records `base_sha` and `candidate_sha` before gates, rechecks both after gates, marks the run `invalid` if either changes, honors `EVIDENCE_FORCE_MANIFEST` only under Vitest, records `snapshot_fallback_reason`, and includes SHA-256 digests for repo-root `.env*` files in `build_inputs`.                                                     | `scripts/evidence.ts:39`, `scripts/evidence.ts:153`, `scripts/evidence.ts:269`, `scripts/evidence.ts:294`, `tests/scripts/evidence.test.ts:152`                                                                                                        |
| MEDIUM/LOW findings                    | Gate-order resolution now preserves topo order without a trailing sort, remaining `tests/scripts/*.test.ts` files map to the web union instead of `full`, and license-check tests assert the real CLI error text robustly.                                                                                                                                      | `scripts/gates.ts:88`, `scripts/gates-manifest.ts:227`, `tests/scripts/gates.test.ts:18`, `tests/scripts/gates-manifest.test.ts:38`, `tests/scripts/check-licenses.test.ts:58`                                                                         |
| Docs / invariant follow-up             | Deployment runbook now documents the manual artifact-only path, retention expiry guidance, and the bounded deviation. The architecture's Deployment Invariant now records the owner-approved bounded deviation and artifact-only manual deploy rule.                                                                                                            | `docs/runbooks/DEPLOYMENT.md:10`, `docs/runbooks/DEPLOYMENT.md:32`, `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md:405`                                                                                                                                |

### Validation evidence

| Command                                           | Exit status | Notes                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git diff --check`                                | 0           | Passed with no output.                                                                                                                                                                                                                                                                            |
| `npm run format:check`                            | 0           | `All matched files use Prettier code style!`                                                                                                                                                                                                                                                      |
| `python3 - <<'PY' ... yaml.safe_load(...) ... PY` | 0           | Parsed `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` successfully (`YAML OK`).                                                                                                                                                                                                    |
| `npm run lint`                                    | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                       |
| `npm run typecheck`                               | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                       |
| `npm test`                                        | 0           | `25` test files passed; `147` tests passed. Existing React Router future-flag warnings remained informational only.                                                                                                                                                                               |
| `npm run gates -- --profile=docs`                 | 0           | Passed with `git-diff-check`, `format-check`, and deterministic `docs-check --all`; checked `66` Markdown files and reported warnings only for external URLs.                                                                                                                                     |
| `npm run gates -- --profile=web`                  | 1           | Reached and passed `git-diff-check`, `format-check`, `content-catalog`, `content-validation`, `lint`, `typecheck`, `unit-tests`, `production-build`, and `bundle-check`, then failed at `dependency-audit` because this sandbox could not resolve `registry.npmjs.org` (`getaddrinfo ENOTFOUND`). |

### Git diff --stat

```text
 .github/workflows/ci.yml                      |  20 +-
 .github/workflows/deploy.yml                  | 163 +++++++++----
 docs/architecture/AI_WORKFLOW_ARCHITECTURE.md |  26 ++-
 docs/handoffs/WORKFLOW-004A-implementation.md |  33 +++
 docs/runbooks/DEPLOYMENT.md                   |  32 ++-
 scripts/check-docs.ts                         |   2 +-
 scripts/classify-change.ts                    |  44 +++-
 scripts/evidence.ts                           |  81 ++++++-
 scripts/gates-manifest.ts                     |   4 +-
 scripts/gates.ts                              |  23 +-
 tests/scripts/check-docs.test.ts              |  40 +++-
 tests/scripts/check-licenses.test.ts          |  46 ++--
 tests/scripts/classify-change.test.ts         |  69 +++++-
 tests/scripts/evidence.test.ts                | 318 +++++++++++++++++++-------
 tests/scripts/gates-manifest.test.ts          |  22 ++
 tests/scripts/gates.test.ts                   |  16 ++
 16 files changed, 728 insertions(+), 211 deletions(-)
```

## 16. Remediation round 5 — findings re-review vòng 2

Previous validation/evidence entries above are now `STALE` for release-readiness purposes; the records below supersede them for this remediation snapshot on July 18, 2026 (UTC).

### Finding closure matrix

| Finding / risk            | Handling                                                                                                                                                                                                                                                                                                                                                                                       | File:line                                                                                                                                                                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-1 (CRITICAL)          | Manual deploy now normalizes `candidate_sha`, verifies checkout, fetches `origin/main`, and fails closed unless `git merge-base --is-ancestor "$CANDIDATE_SHA" origin/main` succeeds. The GitHub API guard now accepts only `ci.yml` runs where `head_branch === 'main'` and `event === 'push'`, while keeping the existing `head_sha`, job, conclusion, and artifact checks.                  | `.github/workflows/deploy.yml:35`, `.github/workflows/deploy.yml:49`, `.github/workflows/deploy.yml:87`, `.github/workflows/deploy.yml:112`                                                                                                                                                        |
| FIX-2 (HIGH)              | SHA handling is now consistently lowercase-normalized in both bash and Node paths, and the runbook documents that uppercase input is normalized before comparisons/API queries.                                                                                                                                                                                                                | `.github/workflows/deploy.yml:40`, `.github/workflows/deploy.yml:87`, `docs/runbooks/DEPLOYMENT.md:38`                                                                                                                                                                                             |
| FIX-3 (HIGH)              | `getChangedPathsFromBase()` now parses `git diff --name-status -z --diff-filter=ACDMRTUXB` so rename/copy entries contribute both old and new paths; regression coverage locks the `src -> docs` rename case into `full` classification.                                                                                                                                                       | `scripts/classify-change.ts:129`, `tests/scripts/classify-change.test.ts:177`                                                                                                                                                                                                                      |
| FIX-4 (CRITICAL + MEDIUM) | Manifest fallback now fails closed when `git ls-files` metadata is unavailable, `.env*` digests are collected again after gates and invalidate the run if they changed, and manifest entries use `lstat()` with explicit `symlink` handling so target changes affect the snapshot. Regression coverage includes git-unavailable throw, `.env` mutation invalidation, and symlink target drift. | `scripts/evidence.ts:170`, `scripts/evidence.ts:220`, `scripts/evidence.ts:253`, `scripts/evidence.ts:333`, `tests/scripts/evidence.test.ts:345`, `tests/scripts/evidence.test.ts:357`, `tests/scripts/evidence.test.ts:389`                                                                       |
| FIX-5 (MEDIUM)            | `check-docs --all` now unions tracked and untracked Markdown files from git so draft `.md` files are validated too; the untracked broken-link case is covered by a temp git fixture.                                                                                                                                                                                                           | `scripts/check-docs.ts:118`, `tests/scripts/check-docs.test.ts:308`                                                                                                                                                                                                                                |
| FIX-6 (LOW)               | `check-docs.ts` now decodes `%20` targets before `path.resolve()`, accepts `npm run` references with flexible whitespace, and downgrades broken relative Markdown links under historical `docs/plans/` and `docs/handoffs/` artifacts to warnings. `gates.ts` now converts child-process spawn errors into structured `exit_code=127` results instead of rejecting the runner.                 | `scripts/check-docs.ts:27`, `scripts/check-docs.ts:47`, `scripts/check-docs.ts:174`, `scripts/check-docs.ts:183`, `scripts/gates.ts:54`, `tests/scripts/check-docs.test.ts:246`, `tests/scripts/check-docs.test.ts:269`, `tests/scripts/check-docs.test.ts:291`, `tests/scripts/gates.test.ts:122` |
| ACCEPTED-1                | Recorded only, no code change: the owner-approved bounded deviation remains that browser/PWA gates validate `test-dist` while deploy promotes `production-dist`, and `test:pwa:subpath` still rebuilds internally. This remediation round intentionally did not change that behavior.                                                                                                          | `docs/runbooks/DEPLOYMENT.md:16`                                                                                                                                                                                                                                                                   |
| ACCEPTED-2                | Recorded only, no code change: evidence now catches accidental `.env*` drift before vs. after gates, but it still does not attempt to defend against a malicious local actor who mutates files during the run and restores them before the post-gate snapshot.                                                                                                                                 | `scripts/evidence.ts:354`                                                                                                                                                                                                                                                                          |
| ACCEPTED-3                | Recorded only, no code change: Windows-specific `spawn` shell behavior and symlink CLI-entrypoint edge cases remain out of scope for this Linux-based dev/CI workflow. The new tests cover POSIX spawn failure (`127`) and symlink snapshot semantics only.                                                                                                                                    | `scripts/gates.ts:54`, `scripts/evidence.ts:253`, `tests/scripts/gates.test.ts:122`, `tests/scripts/evidence.test.ts:389`                                                                                                                                                                          |

### Validation

Validation executed locally on `2026-07-18` UTC after the remediation round 5 edits.

| Command                                                               | Exit status | Notes                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git diff --check`                                                    | 0           | Passed with no output.                                                                                                                                                                                                                                                                     |
| `npm run format:check`                                                | 0           | `All matched files use Prettier code style!`                                                                                                                                                                                                                                               |
| `npm run validate-content`                                            | 0           | `Đã kiểm tra 17 unit, không phát hiện lỗi schema/nội dung.`                                                                                                                                                                                                                                |
| `npm run lint`                                                        | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                |
| `npm run typecheck`                                                   | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                |
| `npm test`                                                            | 0           | `25` test files passed; `156` tests passed. Existing React Router future-flag warnings remained informational only.                                                                                                                                                                        |
| `npm run build`                                                       | 0           | `vite build` succeeded; PWA assets generated under `dist/`.                                                                                                                                                                                                                                |
| `npm run gates -- --profile=docs`                                     | 0           | Passed `git-diff-check`, `format-check`, `docs-check`; `check:docs -- --all` scanned `66` Markdown files and emitted warnings only for external URLs.                                                                                                                                      |
| `npm run gates -- --profile=web`                                      | 1           | Reached and passed `git-diff-check`, `format-check`, `content-catalog`, `content-validation`, `lint`, `typecheck`, `unit-tests`, `production-build`, and `bundle-check`; then failed at `dependency-audit` with `getaddrinfo ENOTFOUND registry.npmjs.org` in this DNS-restricted sandbox. |
| `node --input-type=module -e "…prettier.format({ parser: 'yaml' })…"` | 0           | Parsed `.github/workflows/deploy.yml` successfully (`deploy.yml YAML OK`).                                                                                                                                                                                                                 |

### Git diff --stat

```text
 .github/workflows/deploy.yml                  |  32 ++++++--
 docs/handoffs/WORKFLOW-004A-implementation.md |  52 ++++++++++++
 docs/runbooks/DEPLOYMENT.md                   |  11 ++-
 scripts/check-docs.ts                         |  42 +++++++---
 scripts/classify-change.ts                    |  57 +++++++++++++-
 scripts/evidence.ts                           |  49 +++++++++++-
 scripts/gates.ts                              |  16 +++-
 tests/scripts/check-docs.test.ts              | 109 ++++++++++++++++++++++++++
 tests/scripts/classify-change.test.ts         |  36 ++++++++-
 tests/scripts/evidence.test.ts                |  82 ++++++++++++++++++-
 tests/scripts/gates.test.ts                   |  13 +++
 11 files changed, 465 insertions(+), 34 deletions(-)
```

## 17. Remediation round 6 — findings re-review vòng 3

Previous validation/evidence entries above are now `STALE` for release-readiness purposes; the records below supersede them for this remediation snapshot on July 18, 2026 (UTC).

### Finding closure matrix

| Finding / risk | Handling                                                                                                                                                                                                                                                                                                                                                                                                                                       | File:line                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-A (HIGH)   | `computeManifestEntries()` now treats only `ENOENT` / `ENOTDIR` as tracked-file deletion; other read failures such as permission errors now throw and fail evidence generation closed. `collectBuildInputs()` continues to compare pre/post gate digests, and regression coverage adds the unreadable tracked-file case plus the double-failure path where git-tree capture fails and manifest fallback must propagate its own error.          | `scripts/evidence.ts:109`, `scripts/evidence.ts:164`, `scripts/evidence.ts:257`, `scripts/evidence.ts:329`, `tests/scripts/evidence.test.ts:18`, `tests/scripts/evidence.test.ts:356`, `tests/scripts/evidence.test.ts:374`  |
| FIX-B (MEDIUM) | `check-docs.ts` no longer downgrades broken relative Markdown links merely because a file lives under `docs/plans/` or `docs/handoffs/`. The downgrade now applies only when the first 40 lines contain an explicit archival marker (`Status: STALE`, `Status: SUPERSEDED`, or `ARCHIVED`). The existing plan/handoff skip for prose repo-path and `npm run` references remains unchanged to avoid widening scope beyond the reported finding. | `scripts/check-docs.ts:16`, `scripts/check-docs.ts:47`, `scripts/check-docs.ts:64`, `scripts/check-docs.ts:159`, `scripts/check-docs.ts:193`, `tests/scripts/check-docs.test.ts:252`, `tests/scripts/check-docs.test.ts:274` |
| FIX-C (LOW)    | `collectBuildInputs()` now includes `.env*` symlinks, follows them via `readFile()`, and fails closed on read errors instead of silently skipping them. Regression coverage now proves that an external `.env.local` symlink changing during gate execution makes evidence invalid.                                                                                                                                                            | `scripts/evidence.ts:164`, `scripts/evidence.ts:177`, `tests/scripts/evidence.test.ts:421`                                                                                                                                   |
| FIX-D (LOW)    | Relative Markdown links are now rejected when they resolve outside `repoRoot`, even if the target exists elsewhere on the machine. The validator reports these as `Relative Markdown link points outside repository scope`.                                                                                                                                                                                                                    | `scripts/check-docs.ts:55`, `scripts/check-docs.ts:179`, `tests/scripts/check-docs.test.ts:345`                                                                                                                              |

### Validation

Validation executed locally on Saturday, July 18, 2026 (UTC) after the remediation round 6 edits.

| Command                                        | Exit status | Notes                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git diff --check`                             | 0           | Passed with no output.                                                                                                                                                                                                                                                                                      |
| `npm run format:check`                         | 0           | `All matched files use Prettier code style!`                                                                                                                                                                                                                                                                |
| `npm run validate-content`                     | 0           | `Đã kiểm tra 17 unit, không phát hiện lỗi schema/nội dung.`                                                                                                                                                                                                                                                 |
| `npm run lint`                                 | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                                 |
| `npm run typecheck`                            | 0           | Passed with no diagnostics.                                                                                                                                                                                                                                                                                 |
| `npm test`                                     | 0           | `25` test files passed; `161` tests passed. Existing React Router future-flag warnings remained informational only.                                                                                                                                                                                         |
| `npm run build`                                | 0           | `vite build` succeeded; PWA assets generated under `dist/`.                                                                                                                                                                                                                                                 |
| `npm run gates -- --profile=docs`              | 0           | Passed `git-diff-check`, `format-check`, and `docs-check`. The embedded `check:docs -- --all` scan covered `66` Markdown files and emitted warnings only for external URLs.                                                                                                                                 |
| `npm run check:docs -- --all`                  | 0           | Re-ran explicitly to record the standalone docs-gate result: `66` Markdown files scanned, `0` errors, `3` external-URL warnings (`CHANGELOG.md`, `docs/handoffs/FEATURE-013-implementation.md`, `docs/handoffs/FEATURE-014-implementation.md`). No historical-doc link repairs were required in this round. |
| `npm run evidence -- --profile=docs --dry-run` | 0           | Machine-generated evidence reported `validated_snapshot.kind = manifest`, `validated_snapshot.id = 5ccca5aa4fa99d2dd60f579b9b5ebc966b641dd61b5aa7bb51382ddd1484e945`, `candidate_sha = UNCOMMITTED`, and `result = pass`.                                                                                   |

Evidence note: the architecture-requested dirty-worktree binding command `git add -A && git stash create` was attempted in this environment and failed with exit `128` because `.git/index.lock` could not be created on the sandboxed read-only git metadata filesystem (`fatal: Unable to create '.git/index.lock': Read-only file system`). This round therefore records the failed attempt plus the machine-generated manifest evidence above.

### Git diff --stat

```text
 docs/handoffs/WORKFLOW-004A-implementation.md | 43 ++++++++++++++
 scripts/check-docs.ts                         | 40 ++++++++++---
 scripts/evidence.ts                           | 21 ++++++-
 tests/scripts/check-docs.test.ts              | 56 +++++++++++++++++-
 tests/scripts/evidence.test.ts                | 84 +++++++++++++++++++++++++--
 5 files changed, 230 insertions(+), 14 deletions(-)
```
