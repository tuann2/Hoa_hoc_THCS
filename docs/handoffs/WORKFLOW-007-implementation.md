# WORKFLOW-007 Implementation Handoff

## Status

- Remediation state: VALIDATED (final, post-remediation-round-1). Both the
  original defect found by independent review and its fix are recorded
  below with independent, repeat verification.
- Risk tier / rationale: ELEVATED — `scripts/**` + `.github/**` change
  (governance-enforcement tooling, same risk class as WORKFLOW-004C's
  TRIVIAL classifier), per the plan's own risk assessment. Does not touch
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`.
- Base SHA / candidate SHA: `ae12dc6a274a488ef68f2c401ee819f4b78c6700` /
  `UNCOMMITTED` (working tree on branch
  `docs/workflow-006-007-plans-005-measurement`); CI: PENDING (no
  commit/push yet).
- Independent review: complete — one fresh adversarial pass found a
  must-fix defect; a second fresh pass confirmed the fix. See below.

## Scope and diff

- Implementer: Codex, delegated via `codex:codex-rescue`, effort medium
  (per the plan's execution assignment), under an ELEVATED execution
  envelope with `allowed_paths` limited to exactly:
  `scripts/check-branch-context-drift.ts`,
  `tests/scripts/check-branch-context-drift.test.ts`,
  `.github/workflows/ci.yml`. `commit`/`push`/`merge`/`deploy` all
  `false` in every dispatch; nothing outside those three files was
  touched by any Codex dispatch.
- First dispatch was correctly refused: Codex declined to write without
  an execution envelope in the request, per this repo's governance. A
  second dispatch with the envelope attached (per
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` "Execution envelope")
  succeeded.
- Files created/modified (final state, all within `allowed_paths`):
  - `scripts/check-branch-context-drift.ts` (new) — deterministic branch
    drift check, no LLM, pure git-object reads.
  - `tests/scripts/check-branch-context-drift.test.ts` (new) — synthetic
    temp-git-repo fixtures, no dependency on this repo's real branches
    (deliberate orchestrator instruction; see "Deviations" below).
  - `.github/workflows/ci.yml` — one new job, `branch-context-drift`,
    `if: github.event_name == 'pull_request'`, warn-only.

## Design as implemented

- `MANDATORY_CONTEXT_FILES = ['CLAUDE.md', 'AGENTS.md',
'docs/CONTEXT_RULES.md']`; all three compared by **content** (identical
  treatment — see "Remediation round 1" for why this differs from the
  plan's original existence-only wording for the third file).
- Age gate: warns when a branch is ahead of its merge-base with the base
  ref by either `BRANCH_AGE_THRESHOLD_COMMITS = 5` commits, **or**
  `BRANCH_AGE_THRESHOLD_SECONDS = 3 * 24 * 60 * 60` seconds measured as
  `(base HEAD committer timestamp) − (merge-base committer timestamp)`
  — commit-timestamp arithmetic only, no `Date.now()`, so it stays
  reproducible from git objects alone in CI. This dual rule replaced an
  initial commit-count-only version (see "Implementation timeline"
  below).
- Warning output: branch/base/merge-base, both threshold values with
  actual counts, every drifted file with byte sizes on each side, and
  two suggested fix commands (`git merge`/`git rebase`).
- CI wiring: `branch-context-drift` job runs only on `pull_request`,
  checks out with `fetch-depth: 0`, invokes the script comparing
  `origin/<PR base ref>` against `HEAD`. The script's `runCli` wraps
  everything in try/catch and always returns exit code 0 — a drift
  warning, or even an operational failure (e.g. an unresolvable ref),
  can only print output, never fail the job.
- Out of scope, confirmed not present: no fail-closed behavior, no
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` change, no PR
  auto-comment/label posting.

## Implementation timeline

1. **First implementer pass**: script + test + CI job, using a
   commit-count-only age threshold (`>= 5 commits`). Self-validated by
   Codex: `npm run typecheck` exit 0, focused vitest exit 0 (4/4).
2. **Orchestrator validation caught a false negative before independent
   review**: checked the 5-commit threshold against the two real
   drifted branches from `docs/handoffs/WORKFLOW-006-implementation.md`
   Phase A —
   `chore/model-routing-config` (1 commit since merge-base) and
   `origin/codex/feature-015-chuan-hoa-noi-dung-hoc` (3 commits) — both
   below 5. The commit-count-only rule would not have warned on either
   real incident that motivated this plan.
3. **Fix (same implementer engagement)**: added the time-based branch of
   the rule (`BRANCH_AGE_THRESHOLD_SECONDS`, commit-timestamp-based).
   Re-verified against both real branches: `chore/model-routing-config`
   — 955311 s since merge-base (≥ 259200 s, triggers); `origin/codex/
feature-015-chuan-hoa-noi-dung-hoc` — 782140 s (triggers). Added a
   synthetic-fixture test for the time-based branch. `npm run typecheck`
   exit 0; focused vitest exit 0 (5/5).
4. **First independent review (fresh, adversarial)**: verdict
   NEEDS-ATTENTION. See "Remediation round 1" below for the one must-fix
   finding; the other finding was resolved as a documented orchestrator
   decision, not a code change (see "Deviations").
5. **Remediation round 1**: fixed the `docs/CONTEXT_RULES.md`
   existence-only comparison (see below). `npm run typecheck` exit 0;
   focused vitest exit 0 (6/6); full gate profile and evidence both pass
   (Codex's own sandbox run — see "Validation evidence" for the
   orchestrator's independent rerun).
6. **Second independent review (fresh)**: confirmed the fix resolves the
   finding, independently re-verified the age-threshold logic a third
   time against the same two real branches (matching numbers exactly),
   found no new issues. Its own "needs-attention" was solely because its
   read-only sandbox could not execute vitest (`EROFS` on
   `node_modules/.vite-temp`) — a known Codex-sandbox degradation
   pattern (same class as documented in
   `docs/measurements/FEATURE-016-token-cost.md` §6.1 and
   `docs/runbooks/providers/codex.md`), not a candidate defect. The
   orchestrator independently ran the same test directly and confirmed
   6/6 passing.

## Remediation round 1

- Trigger: fresh Codex adversarial review found that
  `docs/CONTEXT_RULES.md` was compared by existence only (`(baseContent
!== null) !== (branchContent !== null)`), not content. If `main`
  changes this file's content while a branch keeps a stale version, both
  sides "exist" and the script stays silent — a real false negative
  against the plan's stated objective (drift detection for all three
  mandatory-context files, not existence-only for the third).
- Fix: `docs/CONTEXT_RULES.md` now uses the same content comparison as
  `CLAUDE.md`/`AGENTS.md` (`baseContent !== branchContent`). The
  `'existence'` comparison variant was fully removed from the
  `ContextFileDifference.comparison` type and all branching logic — no
  dead code remains. Added a test case: `docs/CONTEXT_RULES.md` present
  with different content on both sides must warn.
- The review's second observation — that test fixtures are synthetic
  rather than literal real-branch names — was **not** treated as a
  defect to fix; see "Deviations".

## Validation evidence

- Orchestrator-independent reruns on the final candidate (after
  remediation round 1), same working tree Codex validated:
  - `npm run typecheck`: exit 0.
  - `npx vitest run tests/scripts/check-branch-context-drift.test.ts`:
    exit 0, 6/6 passed.
  - `npm run gates -- --changed-from=ae12dc6a274a488ef68f2c401ee819f4b78c6700`:
    exit 0, `"result": "pass"`, full profile (git-diff-check,
    format-check, unit-tests, production-build, bundle-check,
    dependency-audit, license-check, e2e, pwa, pwa-subpath, docs-check —
    all exit 0).
  - `npm run evidence -- --changed-from=ae12dc6a274a488ef68f2c401ee819f4b78c6700`:
    exit 0, `"result": "pass"`, git-tree snapshot
    `a17b879b30c987a8ecfe1d5daa6c52cdbb079286`, lockfile sha256
    `fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656`,
    `node_version: v24.16.0`, `npm_version: 11.13.0`,
    `snapshot_fallback_reason: null`.
- Real-branch age-threshold verification was independently repeated
  three times with matching results (orchestrator twice, fresh reviewer
  once): `chore/model-routing-config` = 1 commit / 955311 s since
  merge-base; `origin/codex/feature-015-chuan-hoa-noi-dung-hoc` = 3
  commits / 782140 s — both exceed the 259200 s (3-day) threshold and
  correctly produce a warning despite being under the 5-commit
  threshold.

## Blockers, reviews, and follow-up

- Blockers: none remaining.
- Independent verification: complete. Fresh adversarial review (round
  1. → NEEDS-ATTENTION, one must-fix finding, resolved in remediation
     round 1. Fresh confirmation review (round 2) → finding resolved, no
     new issues; its own NEEDS-ATTENTION label was environmental
     (read-only sandbox could not execute vitest), not a candidate defect,
     and is superseded by the orchestrator's direct rerun above.
- Human Approval required before merge: this changes CI
  (`.github/workflows/ci.yml`), per the plan's explicit requirement.
  Nothing has been committed or pushed pending that approval.
- Follow-ups noted but explicitly out of scope for this plan (per its
  "Out of scope" section and reviewer observations, none blocking):
  - Fail-closed behavior for `branch-context-drift` — deferred to a
    separate decision after ≥ 2 weeks of warn-only observation with no
    false positives, per the plan.
  - The new CI job resolves its base ref via
    `origin/${{ github.event.pull_request.base.ref }}` (a branch name)
    rather than `github.event.pull_request.base.sha` (a raw commit SHA,
    as the existing `trivial-verify` job uses). The independent
    reviewer assessed this as unlikely to fail to resolve given
    `fetch-depth: 0`, but noted it is less snapshot-exact than the SHA
    form; because the script's own top-level try/catch means any
    resolution failure degrades to a printed warning and still exits 0,
    this is a silent-warning-accuracy risk, not a build-break risk. Not
    fixed in this pass — flagged here for a future small follow-up.
  - Renames of a tracked file are not distinguished from stale content
    (reviewer's false-positive note): renaming `CLAUDE.md` on `main`
    while a branch keeps the old path would present as "content
    differs" (old path now reads as missing on the base side).
    Mechanically correct per the check's actual definition (does the
    canonical mandatory-context file exist with matching content), not
    treated as a defect.

## Deviations

- Test fixtures (`tests/scripts/check-branch-context-drift.test.ts`) use
  only synthetic temporary git repositories, not literal references to
  this repo's real branches (`chore/model-routing-config`,
  `origin/codex/feature-015-chuan-hoa-noi-dung-hoc`,
  `pilot/trivial-a/b/c-violation`) — a deliberate orchestrator
  instruction, deviating from the plan's original wording ("fixture lấy
  từ bảng nhánh của WORKFLOW-006 Phase A"). Rationale: those real
  branches can be deleted, rebased, or merged at any time (indeed, the
  plan's own originally-named examples, `FEATURE-014`/`FEATURE-016`,
  were already merged and moot by the time WORKFLOW-006 Phase A actually
  ran — see that handoff's correction note), which would silently break
  a unit test depending on them. The independent reviewer flagged this
  as not meeting the plan's literal fixture requirement; the
  orchestrator (acting as Release Assessor) accepts this as satisfying
  the requirement's _intent_ — confirming the logic against known real
  incidents — because that confirmation was performed and independently
  repeated three times via live git commands against this actual
  repository (see "Validation evidence"), not because it was skipped.
- `npm run evidence` failed once during the first implementer pass at
  `npm audit --json` due to restricted network in the Codex sandbox —
  the same documented degradation path as FEATURE-016 (`npm audit`
  needs DNS the sandbox doesn't have). Not a candidate defect; the
  orchestrator's own reruns (this document's "Validation evidence")
  used a full-network environment and both gates and evidence passed
  cleanly there.
