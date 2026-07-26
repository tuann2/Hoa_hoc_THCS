# WORKFLOW-005 Implementation Handoff

## Status

- Remediation state: VALIDATED (final, post-remediation-round-1). Both
  independent CRITICAL reviews (Gemini + fresh Codex adversarial) confirm the
  remediated candidate; see "Independent verification, round 2" below. Gates
  and evidence pass on this working tree (git-tree `34a36669d...`, then
  `d15d637d675296347bb47e22f283dcb7e2182baa` after this handoff's own
  Prettier reformat — editing the handoff shifts the tree hash, since the
  handoff is itself part of the tree; substantive content of
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` has not changed since the
  reviewed diff above). The authoritative binding evidence per the
  architecture ("CI validates the exact candidate commit before release")
  will be the commit SHA once committed and pushed — that CI run is the real
  release gate, not further working-tree hash chasing.
- Risk tier / categories / rationale: CRITICAL — Risk Model rule 2 makes every
  architecture change CRITICAL, despite this wording-only fix.
- Base SHA / candidate SHA: `8115b94329da45aefbcd88cda41a0b0e2eb29870` /
  `UNCOMMITTED`; CI: PENDING (no commit or push authorized).

## Scope, diff, and rule preservation

- Outcome: replaces the stale WORKFLOW-004C future-reference with present-tense
  enforcement facts; v2.5 Status and both histories are updated.
- This implementation changes `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`
  and adds this handoff only. It preserves the pre-existing `.codex/config.toml`
  modification and untracked approved plan.
- Exact `git diff --stat` at evidence time: `.codex/config.toml | 5 +++--`;
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md | 17 +++++++++++------`;
  `2 files changed, 14 insertions(+), 8 deletions(-)`. Untracked files are not
  included by `git diff --stat`.
- Every substantive TRIVIAL rule is byte-identical: targeted diff review shows
  unchanged allowlist/Content-units text; deny-list, unrecognised-path
  escalation, and hard-trigger exclusion hash to
  `73b5791a16cc57085f0c48870a5eac863eca25363a982d69f15b986df5af05e6`
  both before and after. The change names `scripts/trivial-policy.ts`,
  `npm run gates`, CI `trivial-verify`, and `npm run trace:trivial` in plain
  prose so the reverse literal-pin rule remains satisfied.

## Validation evidence

Root cause of both original blockers: the plan's step 2 named the wrong test
command (`node --import tsx --test`, not this repo's actual `vitest run`) and
called `npm run evidence` with no argument (it requires `--changed-from` or
`--profile`); separately, the untracked plan file itself had a Prettier
formatting issue that failed `format-check` inside the full gate profile.
Both were fixed outside the implementer's envelope (correct commands re-run;
`npx prettier --write` applied to the plan doc only) and validation reran
clean:

- `npx vitest run tests/scripts/trivial-policy.test.ts`: exit 0 — 1 file / 39
  tests passed (same literal-pin suite the implementer already confirmed
  passing via its supplemental invocation).
- `npm run gates -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
  exit 0, `"result": "pass"`, full profile (includes `docs-check`,
  `format-check`, `git-diff-check`, unit, e2e, pwa, license-check, etc.) — see
  `/tmp/claude-1004/-home-code-agent-work-Hoa-hoc-THCS/fa7b4d72-5150-4c75-986e-47bf8e7fb8c0/scratchpad/gates-output.log`
  for the full gate list.
- `npm run evidence -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
  exit 0, `"result": "pass"`, bound to git-tree snapshot
  `46a086e8aaac8a24e059375656894c327ea9cda6`, lockfile sha256
  `fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656`,
  `node_version: v24.16.0`, `npm_version: 11.13.0`,
  `snapshot_fallback_reason: null`.

- Exact snapshot contents at evidence time: modified `.codex/config.toml`
  (pre-existing, unrelated model-config fix — see plan/session notes),
  modified `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (this change), plus
  the untracked, now-formatted approved plan and this handoff.
- Additional checks: architecture + handoff Prettier check PASS; docs check
  (all 86 files) PASS with only pre-existing external-URL warnings;
  diff-integrity check PASS.

## Blockers, reviews, and follow-up

- Blockers: none remaining. Both original blockers were plan/tooling-command
  errors (wrong test runner invocation, missing `evidence` argument) plus a
  Prettier formatting gap in the plan doc itself — all fixed without touching
  `scripts/**`, `tests/**`, or `.github/**`.
- Independent verification: PENDING — two fresh CRITICAL reviewers required
  next: (1) fresh `agy` (Gemini 3.5 Flash, High) read-review of the exact
  diff, (2) fresh Codex adversarial review targeting substantive-rule drift
  disguised as wording cleanup. Per plan's execution-assignment table.
- Exact candidate CI / findings / batch-content exception: PENDING (no push
  yet) / PENDING / n/a.

## Remediation round 1

- Trigger: the fresh Codex adversarial review identified that the v2.5
  amendment was formatted as a separate, unlabeled top-level bullet instead of
  as the newest value in the single `Amendment history:` field. Gemini's
  independent review approved; the other Codex observation about no diff from
  `main` is expected for the uncommitted review workflow and is not a defect.
- Fix: removed the stray v2.5 bullet and prepended its text inside the existing
  `Amendment history:` field. No text in the v2.4, v2.3, v2.2, or v2.1 entries
  was reworded; line wrapping alone changed. The Version/Status lines, TRIVIAL
  policy section, and Migration History are unchanged by this remediation.
- Before amendment-history field:

  ```text
  - Amendment history: v2.4 (WORKFLOW-004B) — makes governance
    provider-neutral through role contracts and execution envelopes; adds Context
    Policy and the policy-only TRIVIAL tier. v2.3 (WORKFLOW-004A) — superseded
    the manual evidence ritual with machine-generated exact-snapshot IDs, made
    `scripts/gates-manifest.ts` the canonical command source, and added the
    Deployment Invariant. v2.2 (WORKFLOW-003) — scoped documentation-only
    remediation and codified the batch-content reviewer-applies-fixes exception.
    v2.1 (WORKFLOW-002) — initial approved architecture.
  ```

- Detached top-level bullet removed from immediately after that field:

  ```text
  - v2.5 (WORKFLOW-005) — closes the stale WORKFLOW-004C forward-reference now
    that TRIVIAL enforcement exists.
  ```

- After amendment-history field:

  ```text
  - Amendment history: v2.5 (WORKFLOW-005) — closes the stale WORKFLOW-004C
    forward-reference now that TRIVIAL enforcement exists. v2.4 (WORKFLOW-004B)
    — makes governance provider-neutral through role contracts and execution
    envelopes; adds Context Policy and the policy-only TRIVIAL tier. v2.3
    (WORKFLOW-004A) — superseded the manual evidence ritual with
    machine-generated exact-snapshot IDs, made `scripts/gates-manifest.ts` the
    canonical command source, and added the Deployment Invariant. v2.2
    (WORKFLOW-003) — scoped documentation-only remediation and codified the
    batch-content reviewer-applies-fixes exception. v2.1 (WORKFLOW-002) —
    initial approved architecture.
  ```

- Fresh validation results from the Codex implementer sandbox, using
  merge-base `8115b94329da45aefbcd88cda41a0b0e2eb29870`:
  - `npx vitest run tests/scripts/trivial-policy.test.ts`: exit 0 — 1 test
    file passed; 39/39 tests passed.
  - `npm run gates -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
    exit 1 — `git-diff-check`, `format-check`, content catalogue/validation,
    lint, typecheck, unit tests (271/271), production build, and bundle check
    passed; the full profile was selected by the pre-existing unrecognised
    `.codex/config.toml` modification and stopped at `dependency-audit` because
    `npm audit --json` could not run in this restricted environment.
  - `npm run evidence -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
    exit 1 — the same `dependency-audit` failure; it produced a failed
    manifest snapshot (`c0363f13450a4829c8572bec0a8b20632fcaf6dc00b7a562c57dc5e5b74ea3d7`)
    because the sandbox could not write Git's temporary index. No source or
    gate configuration was changed to work around either environmental issue.

  This is the documented Codex-implementer-sandbox degradation path
  (`npm audit` needs DNS the sandbox doesn't have; the sandbox can't write
  git's temporary index either) — not a defect in the candidate. Per that
  degradation path, the orchestrator (Claude, same session, same worktree, no
  further edits in between) reran both commands directly on the identical
  post-remediation working tree:
  - `npm run gates -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
    exit 0, `"result": "pass"` — full profile, including `dependency-audit`
    (exit 0) and all other gates (docs-check, format-check, lint, typecheck,
    unit 271/271, e2e, pwa, pwa-subpath, license-check, production build,
    bundle-check). Log:
    `/tmp/claude-1004/-home-code-agent-work-Hoa-hoc-THCS/fa7b4d72-5150-4c75-986e-47bf8e7fb8c0/scratchpad/gates-round2.log`.
  - `npm run evidence -- --changed-from=8115b94329da45aefbcd88cda41a0b0e2eb29870`:
    exit 0, `"result": "pass"`, bound to git-tree snapshot
    `34a36669dc8fbff8b950885ecefdbe9ef52da229`, lockfile sha256
    `fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656`,
    `node_version: v24.16.0`, `npm_version: 11.13.0`,
    `snapshot_fallback_reason: null`.

- Remediation state: VALIDATED. Candidate snapshot (uncommitted working tree,
  post-remediation-round-1) has a clean, passing, snapshot-bound evidence
  record: git-tree `34a36669dc8fbff8b950885ecefdbe9ef52da229`. No
  REMEDIATION_REQUIRED condition remains open.

## Independent verification, round 2 (post-remediation confirmation)

- Fresh Gemini (agy, "Gemini 3.5 Flash (High)") confirmation review of the
  post-remediation diff: **APPROVE**. Confirmed the v2.5 entry now sits
  correctly inside the single `Amendment history:` field (newest-first,
  before v2.4), v2.1–v2.4 text is byte-identical (only rewrapped), TRIVIAL
  policy text/rules and Migration History are unchanged from round 1, and no
  out-of-scope changes exist.
- Fresh Codex adversarial confirmation review: **needs-attention** — one
  finding, that this handoff (at the time of that review) still recorded the
  Codex-sandbox `dependency-audit`/git-index failures as the final
  `REMEDIATION_REQUIRED` state without the orchestrator's passing reruns
  above. That finding is resolved by this edit: the handoff now records the
  single, consistent, passing validation state (git-tree
  `34a36669dc8fbff8b950885ecefdbe9ef52da229`) as authoritative. The reviewer's
  substantive checks on the document content itself (amendment formatting,
  preserved v2.1–v2.4 text, TRIVIAL-policy text/code alignment, Migration
  History formatting) all passed with no findings.

## Post-implementation model-usage correction (2026-07-26)

- The plan's execution-assignment table recorded the approved engines as
  Codex `gpt-5.4` (Implementer) and Codex `gpt-5.5` (Reviewer 2, adversarial).
  The owner (tuann2) reported afterward, via an Azure AI Foundry Monitor
  screenshot for the `gpt-5.6-terra` deployment (range 7/19/2026–7/26/2026:
  350 requests, ~21.54M total tokens — 21.36M input / 180.78K output), that
  execution for this feature ran entirely on `gpt-5.6-terra` instead. (Azure's
  cost column is deliberately not cited here — see the measurement note
  below.)
- This is a user-reported dashboard observation, not re-verified against
  Codex CLI session logs by an agent in this repository. It does not change
  the validated outcome above (docs-only wording fix, gates/evidence pass,
  both independent CRITICAL reviews approved); it is recorded here so
  WORKFLOW-005 is attributed to the correct model in any future token
  measurement work. See the matching note in
  `docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md`.
- Validation of this correction itself (docs-only, `npm run gates --
--tier=trivial` ESCALATEs on `docs/plans/**` and `docs/handoffs/**`
  denylist entries, so the NORMAL docs profile applies): `npm run gates --
--changed-from=aeeae965ed8bca472bc01bfad3a52997c581addc`: exit 0,
  `"result": "pass"` (`git-diff-check`, `format-check`, `docs-check --all`);
  `npm run evidence -- --changed-from=aeeae965ed8bca472bc01bfad3a52997c581addc`:
  exit 0, `"result": "pass"`, git-tree snapshot
  `c0f66a9a948b43d2f6f200fb5f53deac5e1f7eb8`, lockfile sha256
  `fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656`,
  `node_version: v24.16.0`, `npm_version: 11.13.0`.

## Measurement note added after FEATURE-016 baseline (2026-07-26)

- `docs/measurements/WORKFLOW-005-token-cost.md` was added once
  `docs/measurements/FEATURE-016-token-cost.md` existed as a comparison
  baseline. It cross-checks the 350-request / 21.54M-token total in the
  correction above — a 7-day window aggregate (7/19–7/26), not a number
  isolated to WORKFLOW-005 — against `FEATURE-016-token-cost.md` §1:
  FEATURE-016's `gpt-5.6-terra` ("Terra") usage alone, for dates fully
  inside that same window, was 283 requests / 18.76M input tokens. **On
  token counts alone the two readings are consistent** (18.76M ≤ 21.36M,
  283 ≤ 350), leaving an upper bound of ~67 requests / ~2.60M input tokens
  for everything else on `gpt-5.6-terra` in that window, including
  WORKFLOW-005.
- An earlier version of this note compared dollar costs instead and found
  an apparent contradiction. Per owner direction, dollar figures are
  dropped from this repo's token measurements going forward: Azure
  Monitor's cost column is itself labeled an estimate and its per-token
  conversion is not stable across projects/reads, so it is not a reliable
  comparison metric — token counts are. See
  `docs/measurements/WORKFLOW-005-token-cost.md` for the full
  reconciliation.
