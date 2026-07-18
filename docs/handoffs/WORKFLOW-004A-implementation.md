# WORKFLOW-004A Implementation Handoff

## Status

- Remediation state: VALIDATED
- Risk tier: CRITICAL
- Risk categories: validation and evidence controls; toolchain scripts; CI/deployment planning drift verified at implementation time
- Escalation rationale: Stage 0 verified that the approved plan targets deployment / validation infrastructure. Local implementation in this handoff is limited to Stage 0-4.

## 1. Summary

Implemented WORKFLOW-004A Stage 0 through Stage 4 only:

- Stage 0: captured the repository baseline and re-verified plan §2 facts against the real `package.json`, `ci.yml`, and `deploy.yml`.
- Stage 1: added pure gate manifest data and change classifier with fail-closed behavior and under-classification protection.
- Stage 2: added `check-docs.ts` plus tests, ran `--all`, and reduced the validator to stable checks for current docs artifacts; no non-doc scope expansion was needed.
- Stage 3: added `gates.ts`, `build:app`, `gates`, `check:docs`, and `evidence` scripts; compared `docs` and `web` profiles with legacy commands on the same snapshot.
- Stage 4: added `evidence.ts` with exact-snapshot fallback logic plus 6-state tests.

Implementation stayed out of Stage 5-8: no `.github/workflows/` edits, no architecture amendment, no deployment changes, no browser/PWA cutover work.

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
