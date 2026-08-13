# FEATURE-017 Implementation Handoff

## Status

- Remediation state: VALIDATED (remediation round 2; independent review complete except the waived UI pass — see Independent verification)
- Risk tier / categories / escalation rationale: NORMAL; educational numeric data, UI/React, and PWA route allowlist.
- Base SHA / candidate SHA: fd0758700abc2d91878c62a5fe390215a559f9a9 / 4b2dbfa259f75b317925ae98265a18a91390591a
- Worktree state and dirty paths: clean at candidate `4b2dbfa` on branch
  `feature/017-reference-tables`. The implementer left remediation 2
  uncommitted as its envelope required; the coordinator committed it as
  `4b2dbfa` under tuann2's standing "commit, do not push" decision of
  2026-08-08. Not pushed; no PR open.
- CI reference for exact candidate (when required/available): not available —
  branch is intentionally unpushed, so gates were run locally by the
  orchestrator against the exact candidate.

## Summary and scope

- Requested scope and outcome: Offline lazy-loaded `/tra-cuu` reference tables, validator, datasets, and coverage.
- Files changed: content/reference/\*, reference types/loader/validator, route/app/PWA allowlist, content validator script, tests.
- `git diff --stat`: implementation snapshot is uncommitted; coordinator should capture the exact final stat with its evidence snapshot.

## Role execution log

| Role                 | Executing agent                              | Model / effort             | Human confirmer + timestamp                                            | Execution evidence                                                                                                                                                                       |
| -------------------- | -------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner              | Claude Code                                  | Sonnet 5 / medium          | tuann2, 2026-08-07                                                     | FEATURE-017 plan                                                                                                                                                                         |
| Implementer          | Codex (subagent)                             | inherited                  | tuann2, 2026-08-08                                                     | Relayed confirmation: original dispatch “hãy triển khai tính năng 17”; explicit selection of Codex via codex:rescue with full envelope.                                                  |
| Independent Reviewer | Codex (fresh executions, read-only envelope) | `gpt-5.6-sol` class / high | tuann2, 2026-08-08 (seat); 2026-08-13 (two-pass split; UI pass waived) | Validator pass `task-mskfrts2-896zjb` (stalled, finding recovered from job log); chemistry pass `task-msrm3zro-os7dya` (complete); UI pass not performed — see Independent verification. |
| Release Assessor     | Claude Code (fresh execution, read-only)     | Opus 5 / high              | tuann2, 2026-08-13 ("Ok xác nhận vai")                                 | Verdict **READY WITH CONDITIONS**. The coordinating execution declined this seat to avoid holding two roles. See Release Assessment below.                                               |

## Acceptance, decisions, and risks

| Plan acceptance criterion                       | Evidence / status                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lazy offline reference route                    | Production and subpath builds emit reference chunks; browser PWA run delegated after sandbox listener EPERM.            |
| Dataset metadata and validator invariants       | Remediation 2 validates every declared dataset entry field plus bounds, populated arrays, and duplicate atomic numbers. |
| Required elements and explicit out-of-set state | Remediation 1 distinguishes structural gaps from uncovered real positions.                                              |

- Design decisions: JSON is dynamically imported, never fetched, so Vite emits it into JS chunks for precache. Searchable element list remains the primary UI; periodic grid is desktop-only and horizontally scrollable. Lanthanide and actinide series remain outside this THCS reference scope; their period-6/7 positions are explicitly labelled “Ngoài tập tra cứu”, not presented as structural gaps.
- Remediation 1: fixed all non-record short-circuit paths in `validateElements`, `validateSolubility`, and `validateSimpleDataset`; each now calls metadata validation before returning. Unit coverage exercises `undefined`, `null`, and a primitive for elements, solubility, valences, activity-series, constants, and precipitates. The periodic grid leaves only structural gaps inert, labels uncovered valid positions “Ngoài tập tra cứu”, and the subpath PWA test now pairs each path with its own expected heading.
- Remediation 2 code-path inventory (all six datasets):
  - `elements.elements[]`: non-empty `symbol`, `name`, and `category`; finite
    `atomicMass` in 1–300; integer `atomicNumber` in 1–118, `period` in 1–7,
    and `group` in 1–18; non-empty table; duplicate `symbol` and
    `atomicNumber` rejection.
  - `solubility.legend`: all `T | K | I | B | -` keys map to non-empty strings;
    `cations[]` and `anions[]` are non-empty, non-empty-string arrays with no
    duplicates; every selected matrix row/cell remains required and is checked
    against the closed enum.
  - `valences.entries[]`: a non-empty table of objects with non-empty
    `formula`, `name`, and non-empty-string `valences[]`.
  - `activitySeries`: non-empty-string `series[]` and non-empty `note`.
  - `constants.constants[]`: a non-empty table of objects with non-empty `id`,
    `name`, and `unit`, plus finite numeric `value`.
  - `precipitates.entries[]`: a non-empty table of objects with non-empty
    `formula`, `name`, `color`, and `note`.
  - Shared metadata on all six datasets remains required: non-empty `source`,
    `version`, and `conditions`.
- Remediation 2 test coverage: corrected the complete-minimal fixture to add
  `category` and populated each required table; added determinate rejection
  cases for new element bounds/duplicate/empty-table rules, malformed and
  incomplete entry objects, constants values, activity-series values/note,
  solubility legend and axes, and all required empty tables.
- Divergences from `content/units/**`: **one, found by independent review pass 1
  (2026-08-13), correcting the implementer's earlier "none found".** The rounded
  atomic masses do match (Fe 56, Cu 64, Zn 65, Cl 35,5), but the activity series
  does not: `content/units/n8-kim-loai.json` card `n8-l1-c3` (line 30) prints
  `K, Na, Mg, Al, Zn, Fe, Pb, (H), Cu, Ag, Au` under the heading "Dãy hoạt động
  hoá học của kim loại" — **missing Ca and Hg**. `content/reference/activity-series.json`
  carries the correct 13-position series `K, Na, Ca, Mg, Al, Zn, Fe, Pb, (H), Cu,
Hg, Ag, Au`. The unit is additionally self-contradictory: line 40 of the same
  file states "K, Na và Ca phản ứng mạnh với nước", relying on a Ca its own
  printed series omits.
  Per the approved plan the standard source wins and `content/units/**` is out of
  scope for this feature, so the unit was **not** edited. Recorded here as a
  required follow-up.
- Deviations (two, both authorised by tuann2 and neither weakening a gate):
  1. **`dependency-audit` left failing.** 4 advisories pre-existing on `main`
     before this branch — `brace-expansion`, `fast-uri`, `nanoid` (high),
     `postcss` (moderate). tuann2 deferred patching them on 2026-08-08. The gate
     was **not** modified, disabled, or allowlisted. **A merge still requires a
     deviation argued on its own merits**: the waiver used for PR #40/#41 rested
     on those being Markdown-only changes, which does not transfer to this code
     change on the full gate profile. Note also that `npm audit fix` is not a
     safe quick fix here — a dry run shows it bumps the whole `@typescript-eslint`
     toolchain 8.38→8.65, still fails to patch `postcss` without `--force`, and
     would move `react-router`, which is deliberately pinned per the
     2026-07-25 allowlist rationale. Treat the advisory work as its own
     change at its own tier (`docs/CONTEXT_RULES.md` puts dependencies/lockfiles
     in the CRITICAL row).
  2. **Independent review of UI/routing/config waived** by tuann2 on 2026-08-13
     after four consecutive Codex executions refused the role over confirmation
     wording. See Independent verification for the resulting blind spot.
- Blockers: browser PWA validation is delegated to the orchestrator. `npm run test:pwa`
  and `npm run test:pwa:subpath` build successfully in the Codex sandbox, then
  Playwright cannot start preview because `127.0.0.1:4173` returns `listen EPERM:
operation not permitted`. The orchestrator ran both on candidate `4b2dbfa`:
  6/6 and 1/1.
- Remaining risks / follow-up:
  1. **Fix `content/units/n8-kim-loai.json` card `n8-l1-c3`** — activity series
     missing Ca and Hg, and self-contradictory with line 40 of the same file.
     Out of scope here; needs its own change against `content/units/**`.
  2. **UI/routing/config never independently reviewed** — see the limitation
     recorded under Independent verification.
  3. Patch the 4 deferred advisories as a separate, planned change.
  4. **Fix `src/routes/ReferenceRoute.tsx:100`** — the grid legend still refers
     to a cell label "Chưa có dữ liệu" that remediation 1 renamed to
     "Ngoài tập tra cứu" (line 141). Found by the Release Assessor, 2026-08-13.
- **Third deviation, previously unrecorded:** the plan assigns a distinct
  **Fact-checker (agy)** seat as the primary control on the top risk. That seat
  was never filled; the chemistry fact-check was folded into independent review
  pass B instead. The control was still satisfied — a fresh execution verified
  all six datasets exhaustively — but the deviation list above says "two" when
  there are three.

## Validation evidence

STALE (superseded by remediation round 1): the prior validation entry claimed `npm test` PASS, but the authoritative gate run reported unit-tests exit code 1. Remediation 1 gate result is `fail`: git-diff-check 0, format-check 0, content-catalog 0, content-validation 0, lint 0, typecheck 0, unit-tests 1. The unit failure is the existing `tests/scripts/gates-manifest.test.ts` call to `spawnSync git`, rejected by this sandbox with EPERM; 294 tests passed and 1 failed. Later full-profile gates did not run after this failure.

STALE (superseded by remediation round 2): all earlier remediation evidence
predates strengthened entry validation and cannot support this candidate.

Remediation round 2 direct validation, executed against the real six reference
datasets: `npm run lint` PASS (exit 0); `npm run typecheck` PASS (exit 0);
`npm test` FAIL (exit 1: 36 test files/315 tests passed, and the existing
`tests/scripts/gates-manifest.test.ts` `spawnSync git EPERM` test failed);
`npm run validate-content` PASS (exit 0: “Đã kiểm tra 11 unit và 6 bảng tra
cứu, không phát hiện lỗi schema/nội dung.”). The targeted
`tests/lib/reference-validation.test.ts` suite passed 33/33. No real-data
field conflicted with the strengthened rules. Browser/PWA gates were not run
in this remediation round.

## Independent verification

- Verifier / execution identifier / independence method: Codex, fresh
  executions holding no implementer transcript, dispatched by the coordinator
  with a read-only envelope (`repository_write: false`, `forbidden_paths: ['**']`).
  Human confirmation of the reviewer seat: tuann2, 2026-08-08. Review was run
  in two scoped passes, a split confirmed by tuann2 on 2026-08-13 after a
  single all-in-one review execution stalled for 9h14m and was cancelled.
  - Pass A — validator, job `task-mskfrts2-896zjb` (2026-08-08). Stalled before
    producing a report, but had already recorded its central finding to the job
    log, which the coordinator recovered.
  - Pass B — chemistry data, job `task-msrm3zro-os7dya` (2026-08-13), completed.
  - Pass C — UI, routing, and PWA/build config: **NOT PERFORMED.** Four
    successive executions refused to accept the role, each demanding a
    differently-worded confirmation, despite the same relay having been accepted
    by pass B minutes earlier. tuann2 waived this pass on 2026-08-13.
- Exact candidate CI status: not available; branch intentionally unpushed. Gates
  were run locally by the coordinator against the exact candidate `4b2dbfa`.
- Findings and disposition:
  - **Pass A / validator (blocking): FIXED.** The validator inspected only
    top-level structure; `validateReferenceData({})` returned zero errors and
    every entry inside every dataset array was unchecked. Fixed in remediation 2
    (`4b2dbfa`). Coordinator verified by mutation probe: 0/12 caught before,
    12/12 after, plus 21/21 on a further probe set never shown to the
    implementer, confirming the fix generalised.
  - **Pass B / chemistry data: NO ERRORS.** All six datasets verified
    exhaustively, not sampled — elements 30/30 field-by-field, solubility 60/60
    cells plus all five legend entries, valences 11/11, activity series every
    position and its note, constants 3/3, precipitates 6/6.
  - **Pass B / content divergence: OPEN, out of scope here.** Recorded above
    under "Divergences from `content/units/**`": `n8-kim-loai.json` card
    `n8-l1-c3` prints an activity series missing Ca and Hg. `content/units/**`
    is out of scope for FEATURE-017, so this requires a separate change.
- **Known limitation the Release Assessor must weigh:** no independent execution
  reviewed the UI, the `appRouteAllowlist` regex, or E2E test strength. The only
  scrutiny those received came from the coordinator, which is not independent of
  them — the coordinator raised two findings there in remediation 1 (structural
  periodic-table gaps mislabelled "Chưa có dữ liệu", and a subpath E2E assertion
  loose enough to pass on a Home-route fallback), so it would be reviewing its
  own prior conclusions. Machine evidence for that area is limited to
  `test:pwa` 6/6 and `test:pwa:subpath` 1/1 on the exact candidate.
- Batch-content exception authorization: n/a

## Release Assessment

**Verdict: READY WITH CONDITIONS.** Assessed 2026-08-13 by a fresh read-only
Claude Code execution; the coordinating execution declined the seat rather than
hold two roles (AGENTS.md §7).

Evidence basis — the assessor re-ran rather than accepting the coordinator's
summary: full-profile gates, evidence generation, `test:e2e` (10/10),
`test:pwa` (6/6), `test:pwa:subpath` (1/1), `check:licenses` (654 packages),
`check:docs --all` (106 files), 29 independently-designed validator mutation
probes (28 caught), precache inspection of `dist/sw.js` confirming all six
dataset chunks present and zero raw `.json` shipped, and a bundle-budget check
(110,372 / 250,000 gzip).

Acceptance criteria 1, 2, 3 (symbol set) and 5 are evidence-backed. Criterion 4
(readable at 640/768/desktop) is **assertion-only**: Playwright covers 390px and
1280px, and the 640/768 claim rests on reading Tailwind breakpoints.

**Conditions for release:**

1. **Patch the 4 advisories in a separate change first**, per the binding text
   the human already approved at `docs/plans/FEATURE-017.md:13-14` — or obtain an
   explicit human amendment to that clause. The assessor's finding here corrects
   the coordinator: this was **not** an open question awaiting a fresh
   deviation argument. The approved plan already answers it.
2. **Fix `src/routes/ReferenceRoute.tsx:100`** (legend/label mismatch).
3. **Push and let CI validate the exact candidate**, confirming all 15 required
   gates — including `e2e`/`pwa`/`pwa-subpath` on lockfile dependencies, which
   also closes the stale-`node_modules` gap.
4. **Correct the handoff's gate reporting and deviation count** — done, above.

**Assessor's finding on the waived UI review pass:** a NORMAL-tier candidate
should not proceed with it open, because
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md:116` requires _either_ CI on the
exact candidate _or_ one fresh reviewer inspecting the targeted diff — and
neither limb is currently satisfied. The remedy is not a fifth review execution:
pushing for CI satisfies the primary limb and covers exactly the UI/routing area
that lacks scrutiny. Condition 1 unblocks CI, so conditions 1 and 3 together
close the review gap architecturally.

**Stronger justification than the coordinator recorded, for the
`dependency-audit` deviation:** all four advisories resolve solely through
devDependencies (eslint, typescript-eslint, vite-plugin-pwa/workbox,
postcss/tailwind/vite). `npm ls --omit=dev` places none of them in the
production tree, so nothing reaches a student's browser. The assessor also
disproved a plausible hypothesis: the advisories are _not_ an artifact of the
stale `node_modules` — `npm audit --package-lock-only` reproduces all four, as
does CI under `npm ci`. They are real, genuinely pre-existing, and genuinely
unrelated to this branch. Still merge-blocking, but for the reasons in
condition 1, not runtime exposure.

**Practical note:** `main`'s CI has failed at `dependency-audit` since
2026-08-08, and the `deploy` job depends on `web` + `browser`. GitHub Pages has
not deployed since 2026-07-27. Merging FEATURE-017 before the advisories are
patched would ship it to no one.

**Not verified by the assessor, taken on report:** the human confirmations and
the 2026-08-13 waiver; that review passes A and B were fresh read-only
executions holding no implementer transcript; that four executions refused the
UI role; the coordinator's own 12- and 21-probe mutation runs (not reproduced,
though 29 independent probes reached the same conclusion); prior remediation
history.

The assessor recommends; it does not approve. The release decision is tuann2's.

## Orchestrator validation on candidate `4b2dbfa`

Authoritative run by the coordinator (Claude Code), not the implementer:

- `npm run gates -- --changed-from=fd07587`, profile `full`: 9/10 PASS —
  git-diff-check, format-check, content-catalog, content-validation, lint,
  typecheck, unit-tests (316/316), production-build, bundle-check.
  `dependency-audit` FAIL.
- `npm run evidence -- --changed-from=fd07587`: candidate
  `4b2dbfa259f75b317925ae98265a18a91390591a`, validated snapshot
  `8259cb3d2bfe10f16e063e221a97718e765792f2` (git-tree), `result: fail`
  attributable solely to `dependency-audit`.
- `npm run test:pwa` 6/6 and `npm run test:pwa:subpath` 1/1, run by the
  coordinator under the plan's documented degradation path because the Codex
  sandbox rejects the Playwright preview listener with EPERM. Re-run after
  remediation 2 specifically because `referenceLoader` calls
  `assertValidReferenceData` at runtime, so stricter validation could have
  broken `/tra-cuu` in a browser while unit tests stayed green. It did not.

`dependency-audit` fails on 4 advisories pre-existing on `main` before this
branch (`brace-expansion`, `fast-uri`, `nanoid` high; `postcss` moderate).
tuann2 decided on 2026-08-08 to defer patching them. **The gate was not
modified, disabled, or allowlisted.** A merge still requires a deviation
argued on its own merits: the waiver used for PR #40/#41 rested on those PRs
being Markdown-only, which does not transfer to this code change on the full
gate profile.

### Remediation 2 verification by the coordinator

The independent reviewer found that the validator inspected only top-level
structure. The coordinator confirmed it by mutation probe before dispatching
the fix, and re-probed afterwards:

- The 12 probes shown to the implementer: 0/12 caught before, 12/12 after.
- A further 21 probes **never shown to the implementer**: 21/21 caught. These
  covered rules the dispatch never mentioned — `NaN`/`Infinity`, non-integer
  atomic numbers, duplicate cations, missing legend keys, whitespace-only
  strings, and empty tables in every dataset — so the fix generalised rather
  than special-casing the reported sample.
- `npm run validate-content` still PASS against the real datasets, so the new
  rules produce no false positives on correct data.

## Correction to the orchestrator's gate reporting (2026-08-13)

The section "Orchestrator validation on candidate `4b2dbfa`" above reports
"9/10 PASS". **That framing was wrong and is corrected here.** The Release
Assessor caught it.

`npx tsx scripts/classify-change.ts --changed-from=fd07587` shows this change
requires **15** gates, not 10:

```
git-diff-check, format-check, content-catalog, content-validation, lint,
typecheck, unit-tests, production-build, bundle-check, dependency-audit,
license-check, e2e, pwa, pwa-subpath, docs-check
```

`runSelectedGates` (`scripts/gates.ts:186`) returns on the first non-zero exit,
so the run **aborted at `dependency-audit`, gate #10**, and gates 11-15 never
executed. "9/10" described the gates that happened to run before the runner
stopped, not the required set. Five required gates had produced no result at
all; `pwa` and `pwa-subpath` had manual substitutes, but `license-check`,
`e2e`, and `docs-check` had no evidence whatsoever.

Those three have since been run directly by the orchestrator on this candidate:

- `npm run check:licenses` — PASS, allowlist check over 654 packages.
- `npm run check:docs -- --all` — PASS over 106 files (warnings only, all of
  them unverifiable external GitHub Actions URLs in an unrelated WORKFLOW-008
  handoff).
- `npm run test:e2e` — **10/10 PASS**, desktop and mobile.

**Corrected position: all 15 required gates pass except `dependency-audit`.**

### Local gates did not exercise the release dependency set

Also raised by the Release Assessor and confirmed: `node_modules` is stale
relative to `package-lock.json` — installed `react-router-dom@6.30.4`,
`eslint@9.32.0`, `typescript-eslint@8.38.0` against lockfile `7.18.1`,
`10.8.0`, `8.65.0`. CI uses `npm ci`. Every local gate on this candidate,
including the e2e/pwa runs above, therefore exercised **react-router 6 on a
routing change**, while release would run react-router 7.

Exposure is bounded — `src/App.tsx` uses only `BrowserRouter`, `Routes`,
`Route` and `NavLink`, which are compatible across both majors, and the bundle
has 56% budget headroom so any v7 size delta cannot breach it — but it means
"the orchestrator ran the gates locally" is **not** equivalent to CI here. CI
on the pushed candidate remains the authoritative check.
