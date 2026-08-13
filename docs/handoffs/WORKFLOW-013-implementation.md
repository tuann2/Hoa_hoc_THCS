# WORKFLOW-013 Implementation Handoff

## Status

- Remediation state: **VALIDATED** — the implementer's BLOCKED state below was
  resolved by the coordinator via the plan's documented degradation path. All
  entries dated before the "Coordinator completion" section describe the
  implementer's sandbox and are kept verbatim; read that section for the
  current position.
- Risk tier / rationale: ELEVATED; approved package and lockfile toolchain patch, requiring the full gate profile.
- Base SHA / candidate SHA: fd0758700abc2d91878c62a5fe390215a559f9a9 / see "Coordinator completion"
- Worktree state and dirty paths: package.json; this handoff. CI: PENDING; no commit is authorized.

## Summary and scope

- Corrected requested change: overrides now contain brace-expansion ^5.0.9, fast-uri ^3.1.5, nanoid ^3.3.17; direct devDependency postcss is exactly 8.5.26.
- `npm install` was attempted twice. It cannot resolve registry.npmjs.org (ENOTFOUND), and cache lacks all required patched versions; package-lock.json is unchanged.
- Package-lock version deltas from `git diff package-lock.json`: none. No unrelated bumps occurred; the required lockfile regeneration is delegated/blocking.
- React-router protection: `git diff package-lock.json | grep -i react-router` printed nothing (empty lockfile diff).

## Role execution log

| Role                 | Executing agent | Model / effort       | Human confirmer + timestamp | Execution evidence                                                                                                                                 |
| -------------------- | --------------- | -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude Code     | Opus 5 / high        | tuann2, 2026-08-13          | Approved amended plan                                                                                                                              |
| Implementer          | Codex           | gpt-5.6-terra / high | tuann2, 2026-08-13          | Relayed dispatch: "Ok làm plan vá 4 advisory đấy đi", then "Duyệt nội dung và ELEVATED rồi thực thi"; plan Implementer row names Codex (subagent). |
| Independent Reviewer | PENDING         | PENDING              | PENDING                     | PENDING                                                                                                                                            |
| Release Assessor     | PENDING         | PENDING              | PENDING                     | PENDING                                                                                                                                            |

## Correction and decisions

- Original defect: postcss was treated as transitive and overridden, but it is an exact direct devDependency (`8.5.19`); npm correctly raised EOVERRIDE when the override demanded `^8.5.26`.
- The first implementation correctly escalated rather than changing devDependencies outside its approved design. The amended plan's **“Đính chính thiết kế”** is normative: direct exact pin 8.5.26, no postcss override.
- Actual package.json deltas: postcss 8.5.19 -> 8.5.26; brace-expansion ^5.0.8 -> ^5.0.9; added fast-uri ^3.1.5 and nanoid ^3.3.17 overrides; removed the prior postcss override.
- No `npm audit fix` or `npm audit fix --force` command was run.

## Validation evidence

- 1. Lockfile diff: RAN; no version deltas (therefore no unrelated bumps); lockfile regeneration DELEGATED/BLOCKED by npm registry ENOTFOUND.
- 2. `npm run check:audit`: DELEGATED; wrapper could not execute `npm audit --json` in this sandbox.
- 3. `npm run lint`: PASS.
- 4. `npm run typecheck`: PASS.
- 5. `npm test`: FAIL after running 35 files/282 tests: `tests/scripts/gates-manifest.test.ts` failed at `spawnSync git EPERM` (281 passed).
- 6. Full gates: FAIL at unit-tests for the same EPERM. Ran and passed: git-diff-check, format-check, content-catalog, content-validation, lint, typecheck. Ran and failed: unit-tests. Never executed after stop: production-build, bundle-check, dependency-audit, license-check, e2e, pwa, pwa-subpath, docs-check.
- 7. `npm run build`: PASS. `npm run test:pwa`: DELEGATED to coordinator/CI; Playwright configured web server exited 1. `npm run test:pwa:subpath`: DELEGATED for the same web-server exit after its subpath build passed.
- `npm run evidence -- --changed-from=fd07587`: attempted; it reached unit-tests and could not produce final JSON after the same `spawnSync git EPERM`. No valid evidence JSON exists for this blocked snapshot.

## Independent verification

- Verifier / execution identifier / independence method: PENDING
- Exact candidate CI status: PENDING; CI must regenerate lockfile on an environment with registry access and validate the committed candidate.
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a

## Release Assessment

- Assessment and evidence basis: PENDING; implementation remains BLOCKED until npm install can generate the lockfile and the full required gates run.

## Coordinator completion (2026-08-13)

The implementer's sandbox has **no network**: `npm install` failed with
`ENOTFOUND registry.npmjs.org` and its cache lacked the patched versions, so it
could not regenerate `package-lock.json`. It escalated instead of improvising,
which was correct. The coordinator completed the step under the degradation
path recorded in the plan ("orchestrator hoặc CI chạy các gate đó").

The implementer's `package.json` was verified byte-for-byte against the amended
design before running anything, then `npm install` was run by the coordinator.

### Lockfile deltas — exactly the four targets, nothing else

```
brace-expansion  5.0.8  -> 5.0.9
fast-uri         3.1.4  -> 3.1.5
nanoid           3.3.16 -> 3.3.18
postcss          8.5.19 -> 8.5.26
```

`git diff --stat package-lock.json` = 14 insertions, 14 deletions. Zero packages
added, zero removed. `git diff package-lock.json | grep -i "react-router"` prints
nothing — the hard acceptance criterion holds.

Minor deviation from the plan's literal text: `nanoid` resolved to **3.3.18**,
not the 3.3.17 named in the plan. The `^3.3.17` override permits it and 3.3.18
is past the advisory boundary (`<3.3.17`), so the acceptance criterion is met.
Recorded rather than silently absorbed.

`npm install` reported "added 12, removed 33, changed 46" — that describes
`node_modules` on disk reconciling with the lockfile, **not** lockfile changes.
This incidentally closes the staleness gap that the FEATURE-017 Release
Assessor had flagged: `node_modules` previously held `react-router-dom@6.30.4`
against a lockfile pinning `7.18.1`, so local gates had been exercising the
wrong major. They no longer are.

### Gates — full profile, all 15, no early stop

`npm run gates -- --changed-from=fd07587` → `"profile": "full"`,
**`"result": "pass"`**, 15/15 executed:

```
PASS git-diff-check      PASS production-build   PASS e2e
PASS format-check        PASS bundle-check       PASS pwa
PASS content-catalog     PASS dependency-audit   PASS pwa-subpath
PASS content-validation  PASS license-check      PASS docs-check
PASS lint                PASS typecheck          PASS unit-tests
```

`dependency-audit` now PASSES: `npm run check:audit` reports **0 unapproved**,
down from 4. The two `react-router*` entries remain in the approved list under
the unchanged 2026-07-25 allowlist rationale.

The gate count is stated explicitly here because the FEATURE-017 handoff
described a truncated run as "9/10 PASS" when 15 gates were required and the
runner had aborted at #10. This run did not stop early; every required gate
produced a result.
