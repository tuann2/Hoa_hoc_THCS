# WORKFLOW-005: Architecture v2.5 — close stale "deferred to WORKFLOW-004C" self-reference

## Status

- Status: APPROVED
- Owner: Claude Code
- Approved by / date: tuann2, 2026-07-26
- Risk tier: CRITICAL
- Risk categories and escalation rationale: Risk Model rule 2 — any change to
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` is CRITICAL regardless of
  size; no size/wording exception exists in the architecture.
- Change type and required gate profile: docs (governance); see
  `scripts/gates-manifest.ts` docs profile.

## Objective and scope

- Objective: the "### TRIVIAL policy" section (architecture lines ~156–163)
  still reads "automated enforcement and its micro-trace schema are deferred
  to WORKFLOW-004C". WORKFLOW-004C merged 2026-07-19 (PR #17, `770e091`) and
  enforcement now exists (`npm run gates -- --tier=trivial`,
  `npm run trace:trivial`, CI job `trivial-verify`). The sentence is now a
  stale, self-referential forward pointer and must be corrected to state
  present-tense fact. This is the follow-up recorded in the WORKFLOW-004C
  handoff's open-items list.
- In scope: rewording the "### TRIVIAL policy" paragraph only, to describe
  enforcement as existing (not deferred) and to reference `scripts/
trivial-policy.ts` as the policy-text SSOT (already true per 004C, just not
  yet stated in the architecture). Version bump to v2.5, amendment-history
  line, migration-history line, Status line.
- Out of scope: any change to TRIVIAL's substantive rules (allowlist,
  deny-list, escalation behavior), any other architecture section, closing
  the other two 004C follow-ups (branch-protection required check — human
  GitHub action, out of band; `check-docs.ts` symlink gap — deferred, tracked
  separately).

## Current analysis and design

- Current behavior: `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md:156-163`
  frames enforcement as future/deferred work. `tests/scripts/
trivial-policy.test.ts` literal-pins this section's wording against
  `scripts/trivial-policy.ts` in both directions (per memory of 004C), so any
  edit here must keep that test passing — confirm by reading the test before
  editing, and rerun it after.
- Proposed design: replace the deferred-tense sentence with a present-tense
  statement naming the enforcement commands and the CI check, add the
  `scripts/trivial-policy.ts` SSOT reference, keep every substantive rule
  (allowlist categories, deny-list, "unrecognised path escalates to NORMAL",
  hard-trigger exclusion) byte-for-byte unchanged. Bump `Version: 2.4` →
  `2.5`, add one `Amendment history` bullet and one `Migration History` bullet
  documenting WORKFLOW-005, update `Status` line to name the new version once
  approved.
- New technology: none.

## Delivery plan

Execution assignment (approved 2026-07-26, tuann2):

| Vai trò                | Agent đề xuất              | Model / effort đề xuất         | Lý do                                                                                             |
| ---------------------- | -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Planner                | Claude Code                | Sonnet 5 (this session)        | Authored this plan; human approved risk tier + scope in chat 2026-07-26.                          |
| Implementer            | Codex                      | gpt-5.4, reasoning effort high | Repo-default engineering engine; CRITICAL envelope with narrow allowed_paths limits blast radius. |
| Independent Reviewer 1 | agy (Gemini)               | Gemini 3.5 Flash (High)        | CRITICAL tier requires Gemini per architecture Risk Matrix; confirmed working 2026-07-19.         |
| Independent Reviewer 2 | Codex (fresh, adversarial) | gpt-5.5, reasoning effort high | Second, independent pass targeting substantive-rule drift disguised as wording cleanup.           |
| Release Assessor       | Claude Code                | Sonnet 5                       | Presents release-readiness assessment; human remains final approver, never Claude.                |

Mỗi chuyển vai trò cần một xác nhận riêng của con người; approval của plan
này (bao gồm bảng trên) cũng là xác nhận cho việc bắt đầu vai Implementer
ngay trong phiên này, theo yêu cầu "duyệt và thực thi" của người dùng
2026-07-26.

### Post-implementation model-usage correction (2026-07-26)

- The table above records the _approved_ engine assignment (`gpt-5.4` for
  Implementer, `gpt-5.5` for Reviewer 2). The owner (tuann2) subsequently
  reported, via an Azure AI Foundry Monitor screenshot for the `gpt-5.6-terra`
  deployment (date range 7/19/2026–7/26/2026: 350 requests, ~21.54M total
  tokens — 21.36M input / 180.78K output), that execution for this feature in
  fact ran entirely on `gpt-5.6-terra` rather than the planned
  `gpt-5.4`/`gpt-5.5`. (Azure's cost column is deliberately not cited here —
  see the measurement note below.)
- This is a user-reported observation from an external provider dashboard, not
  independently re-verified against Codex CLI session logs by an agent in this
  repository; it is recorded here for measurement accuracy, not as a
  substantive scope or governance change. The approved table above is left
  unmodified as the historical record of what was planned/authorized.
- Effect: none on outcome (docs-only wording fix, already validated and
  merged); this note exists solely so future token measurement work (e.g.
  `docs/measurements/`) attributes WORKFLOW-005 usage to the correct model.

### Measurement note added after FEATURE-016 baseline (2026-07-26)

- `docs/measurements/WORKFLOW-005-token-cost.md` (added once
  `docs/measurements/FEATURE-016-token-cost.md` existed as a comparison
  baseline) cross-checks the 350-request / 21.54M-token total above — a
  7-day window aggregate (7/19–7/26), not a number isolated to WORKFLOW-005
  — against `FEATURE-016-token-cost.md` §1: FEATURE-016's `gpt-5.6-terra`
  ("Terra") usage alone, for dates fully inside that same window, was 283
  requests / 18.76M input tokens. **On token counts alone the two readings
  are consistent** (18.76M ≤ 21.36M, 283 ≤ 350), leaving an upper bound of
  ~67 requests / ~2.60M input tokens for everything else on `gpt-5.6-terra`
  in that window, including WORKFLOW-005.
- An earlier version of this note compared dollar costs instead and found an
  apparent contradiction ($29.49 for FEATURE-016 alone exceeding the $8.44
  window total). Per owner direction, dollar figures are dropped from this
  repo's token measurements going forward: Azure Monitor's cost column is
  itself labeled an estimate and its per-token conversion is not stable
  across projects/reads, so it is not a reliable comparison metric. Token
  counts are the metric to track for reduction work. See
  `docs/measurements/WORKFLOW-005-token-cost.md` for the full reconciliation.

1. Implementation: apply the wording fix (see exact before/after in this
   plan's scope) via a fresh implementer execution under a CRITICAL envelope,
   `allowed_paths: ["docs/architecture/AI_WORKFLOW_ARCHITECTURE.md",
"docs/plans/WORKFLOW-005-Architecture-TRIVIAL-Reference-Fix.md",
"docs/handoffs/WORKFLOW-005-implementation.md"]`, `forbidden_paths:
["scripts/**", "tests/**", ".github/**"]` (no script/behavior change is in
   scope — if the implementer finds it needs to touch those, that's a scope
   escalation, stop and report). Read `tests/scripts/trivial-policy.test.ts`
   first to keep its literal pin satisfied.
2. Validation and evidence: docs gate profile (`npm run gates --
--changed-from=<base_sha>`), `npm run evidence`, plus
   `node --import tsx --test tests/scripts/trivial-policy.test.ts` to confirm
   the literal-pin test still passes against the new wording.
3. Review / handoff: CRITICAL independent verification — two separate fresh
   reviewers, one adversarial: fresh `agy` (Gemini, now confirmed working)
   read-review of the exact diff, plus a fresh Codex adversarial review
   looking specifically for accidental substantive-rule drift disguised as
   wording cleanup. Handoff at `docs/handoffs/
WORKFLOW-005-implementation.md` per the Documentation Contract. Commit,
   push only after both reviews clear and the Human Approver explicitly
   approves in chat (architecture rule: "Architecture changes require human
   approval").

## Risks and controls

| Risk                                                                   | Impact                                                                               | Mitigation                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Wording edit accidentally changes a substantive TRIVIAL rule           | Silently weakens governance                                                          | Literal-pin test (`trivial-policy.test.ts`) must pass unmodified; adversarial review targets exactly this |
| Version/amendment-history bump done inconsistently with prior entries  | Confusing audit trail                                                                | Copy the exact style of the existing v2.2–v2.4 entries when adding v2.5                                   |
| Scope creep into fixing the other two 004C follow-ups in the same pass | Mixes an out-of-band human action and a separate known gap into this CRITICAL change | Envelope forbidden_paths blocks scripts/tests edits; plan explicitly excludes them                        |

## Acceptance and recovery

- [ ] "### TRIVIAL policy" section no longer says enforcement is deferred;
      states it exists, names the commands/CI check, references
      `scripts/trivial-policy.ts` as SSOT.
- [ ] Every substantive TRIVIAL rule (allowlist, deny-list, escalation,
      hard-trigger exclusion) is byte-identical to the pre-change text.
- [ ] `tests/scripts/trivial-policy.test.ts` passes.
- [ ] Version/Status/Amendment history/Migration History updated to v2.5
      consistent with existing entries.
- Security considerations: none (docs-only, no code/behavior change).
- API/database impact: none.
- Test strategy: docs gate profile + the literal-pin unit test above.
- Rollback plan: single doc commit; revert if the literal-pin test fails or
  review finds substantive drift.
