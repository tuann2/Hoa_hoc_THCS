# WORKFLOW-003 Implementation Handoff

<!--
The only post-implementation orchestration artifact (architecture
Documentation Contract). Living document: fill review fields with
PENDING before independent review; update them with outcomes.
Regenerate after remediation; mark superseded evidence STALE.
-->

## Status

- Remediation state: REVIEWING (both required CRITICAL-tier reviews complete
  and dispositioned; awaiting human release approval — see §7 and §11)
- Risk tier: CRITICAL
- Risk categories: architecture change (Risk Model rule 2 / examples table).
  No application source, production data, deployment, infrastructure,
  payment, credential or auth surface touched — documentation/workflow
  governance only.
- Escalation rationale: this plan changes the rules of the already-approved
  v2.1 architecture itself, not just an implementation under it (see
  `docs/plans/WORKFLOW-003-Architecture-Amendments.md` §3).

## 1. Summary

Amended `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` v2.1 → v2.2 per the
approved plan's 5 amendments (A1–A5): removed the never-implemented
tree-object-SHA evidence requirement and replaced it with commit-bound
evidence (candidate commit SHA + CI reference when required/available, or
base SHA + dirty paths + `git add -A && git stash create` SHA when dirty);
scoped documentation-only post-validation changes to not invalidate
engineering/review evidence, matching `docs/DOCUMENTATION_RULES.md`;
condensed the architecture from 715 to 570 lines (three per-tier workflow
diagrams merged into one table, vertical-arrow diagrams collapsed to
prose/tables); replaced unmeasurable Success Metrics with metrics derivable
from repository artifacts and closed WORKFLOW-002's deferred Phase 3 via a
retrospective FEATURE-011/012 baseline; and codified the FEATURE-012
batch-content reviewer-applies-fixes exception with authorization-source
recording.

Two full CRITICAL-tier independent review rounds (fresh Gemini + fresh
Codex adversarial, run in parallel each round) plus one narrow round-3
re-check found and the implementation fixed 8 confirmed defects across
3 remediation commits — including one case where a reviewer's suggested
fix (`git stash create -u`) was independently verified in a scratch repo
and found not to work, and a different, verified fix (`git add -A && git
stash create`) was used instead. See §5 and §7 for detail.

## 2. Files changed

| File                                                 | Change                                                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`      | v2.1 → v2.2: A1–A5 applied, then remediated twice (715 → 570 lines)                                                                                             |
| `CLAUDE.md`                                          | Deduplicated risk-tier examples (pointer to architecture); release-artifact list now includes `tests`; A5 pointer added                                         |
| `AI_WORKFLOW.md`                                     | A5 pointer added to Independent review section and ground rule 14                                                                                               |
| `AGENTS.md`                                          | Evidence rule updated to commit-bound + `git add -A && git stash create`; A5 pointer added to reviewer section                                                  |
| `.claude/skills/feature-delivery/SKILL.md`           | Documentation/Remediation sections rewritten for A2 scoped-revalidation path; slash-command shorthand clarified                                                 |
| `docs/handoffs/_TEMPLATE.md`                         | Evidence-binding fields rewritten for A1; authorization-source field added for A5                                                                               |
| `docs/DOCUMENTATION_RULES.md`                        | **Deviation** (see §6): opening paragraph of "Documentation → Revalidate" rewritten to match the amended architecture, not left unchanged as originally planned |
| `docs/plans/WORKFLOW-003-Architecture-Amendments.md` | New; plan document, updated through remediation with corrected acceptance criteria and deviation record                                                         |

```text
.claude/skills/feature-delivery/SKILL.md           |  54 +--
AGENTS.md                                          |  20 +-
AI_WORKFLOW.md                                     |  11 +-
CLAUDE.md                                          |  33 +-
docs/DOCUMENTATION_RULES.md                        |  10 +-
docs/architecture/AI_WORKFLOW_ARCHITECTURE.md      | 405 +++++++--------------
docs/handoffs/_TEMPLATE.md                         |  17 +-
docs/plans/WORKFLOW-003-Architecture-Amendments.md | 319 ++++++++++++++++
8 files changed, 538 insertions(+), 331 deletions(-)
```

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): `62c9b32` (main, before
  branching)
- Candidate commit SHA: `67c5248` (tip of `feature/WORKFLOW-003`, pushed)
- Worktree state: clean (verified via `git status --porcelain` before
  writing this handoff)
- CI run reference for the candidate commit: GitHub Actions "CI" workflow,
  run `29213579122`, job `web`, conclusion `success` (verified via
  `gh api repos/tuann2/Hoa_hoc_THCS/commits/67c5248/check-runs`)
- Validation start (UTC, ISO 8601): 2026-07-12T16:29:00Z (first commit,
  `2c2408a`)
- Validation completion (UTC, ISO 8601): 2026-07-12T23:35:00Z (CI green on
  final commit, `67c5248`)
- Runtime / package-manager versions: Node v22.22.1, npm 10.9.4
- Validation-tool versions: Prettier 3.6.2

Commit sequence for this candidate (each preceded by baseline gates,
followed by review; documentation-only, so per the now-amended architecture
rule 3 no engineering/review evidence was invalidated between these
commits — only the review disposition below applies):

1. `2c2408a` — initial A1–A5 amendment
2. `cff1468` — remediation round 1 (6 confirmed findings from round-1
   Gemini + Codex reviews)
3. `258521a` — remediation round 2 (2 major + 2 minor confirmed findings
   from round-2 Gemini + Codex reviews)
4. `67c5248` — remediation round 3 (1 minor leftover from round-3 Gemini
   re-check)

## 4. Validation commands and gates

Documentation-only change type (no application source, content, tests,
dependencies, or CI/CD config touched):

| Command                                                | Exit status | Quality gate satisfied                           |
| ------------------------------------------------------ | ----------- | ------------------------------------------------ |
| `git diff --check` (each commit)                       | 0           | Baseline                                         |
| `npx prettier --check <8 changed files>` (each commit) | 0           | Baseline (formatting)                            |
| Cross-document grep sweep for stale A1/A2 phrasing     | clean       | Documentation only — cross-reference consistency |
| CI (`gh api .../67c5248/check-runs`)                   | success     | Independent verification anchor (see §7)         |

No lint/typecheck/test/build gates apply — no `src/`, `content/`, `tests/`,
or dependency files changed (confirmed via `git diff --stat` above).

## 5. Design decisions

- Deleted the tree-object-SHA evidence requirement entirely (A1) rather
  than finally implementing it, because a working equivalent already
  existed and was not being used: `git stash create` (plumbing command,
  captures exact dirty content as a commit SHA without touching the
  working tree). Adopted it instead of reinventing a "canonical evidence
  command."
- When round-2 Gemini review reported `git stash create` returns empty on
  untracked-only dirty state and suggested `git stash create -u` as the
  fix, that suggestion was independently tested in a scratch repo
  (`/tmp`) before being written into the architecture — it does not work
  (`-u` is not a valid option for this command; output stayed empty). The
  verified working fix, `git add -A && git stash create`, was used
  instead. This follows this project's own established practice (project
  memory `workflow_feedback.md`: "Always re-verify agy's quoted findings
  against the actual file before acting").
- Condensed the architecture to 570 lines, not the plan's ≤450 target,
  because hitting that number would have required editing sections the
  plan explicitly listed as "do not touch" (Responsibility Matrix, Trust
  Model, Risk Model, Claude Gates, Canonical Quality Gates, Context
  Budget, Design Principles) to preserve semantic completeness under
  two independent adversarial reviews. Both reviews confirmed no dropped
  normative rule from the condensation itself.
- Did not add repository commands for pre-existing quality gates that
  lacked them before this plan (documentation link/path checks,
  dependency/security/infra gates) — judged out of scope (WORKFLOW-002-era
  debt, not a WORKFLOW-003 regression) and corrected the plan's own
  acceptance-criteria wording rather than silently overclaiming.

## 6. Deviations from the approved plan

- **`docs/DOCUMENTATION_RULES.md` was amended**, though the approved plan
  (§4, A2) stated it was "reference text and does not change." Both
  independent reviews (round 1) found this assumption false: the file's
  literal opening sentence directly contradicted the new architecture
  rule. Fixed by rewriting only that opening paragraph to state the same
  rule as the architecture. Recorded in the plan document itself
  (§4, A2, "Deviation recorded during remediation") at the time it was
  discovered, not after the fact.
- Architecture line count: 570, not the plan's ≤450 target. Disclosed
  and justified in the plan's acceptance criteria (§9) rather than
  silently missed.
- One additional file touched beyond the plan's original file list per
  amendment: `.claude/skills/feature-delivery/SKILL.md`'s slash-command
  references were clarified (both reviewers flagged them as pointing to
  non-existent commands) — a one-line hygiene fix, not a policy change.

## 7. Independent verification

CRITICAL tier requires a fresh Gemini review and a separate fresh Codex
adversarial review, both inspecting every changed line, plus CI on the
exact candidate commit.

- Verifier identity: fresh Gemini (`agy`, model "Gemini 3.1 Pro (High)",
  synchronous) + fresh Codex adversarial (`codex:codex-rescue` subagent,
  `--background`, no inherited implementation context) — both run in
  parallel, 3 rounds total.
- Execution identifiers: Codex round 1 `task-mri0dw06-nxzoka`; Codex
  round 2 `task-mrif33wm-4ut9on`; Codex round 3 (targeted)
  `task-mrifdvbm-z4m0n2`. Gemini rounds run synchronously in this session
  (no persisted task ID; transcripts are in this session's tool-call
  history).
- Independence method: fresh agent executions with no inherited
  implementation context (per architecture's Independent Verification
  section), plus CI on the exact candidate commit.
- CI commit SHA and status: `67c5248`, GitHub Actions run `29213579122`,
  conclusion `success`.
- Review findings and disposition:
  - **Round 1** (against `2c2408a`) — both reviewers independently found
    the `docs/DOCUMENTATION_RULES.md` contradiction (severity: blocking).
    Codex additionally found: `tests/**` omitted from the release-artifact
    list; pre-commit evidence didn't bind exact content; CI-reference
    wording too rigid; A5 re-verifier and authorization-source gaps;
    Classification rule 2 omitted "architecture changes"; line count
    over target (flagged, not blocking per plan's own de-prioritization).
    Verdict: "Blocked pending rework." **All confirmed findings fixed** in
    commit `cff1468`.
  - **Round 2** (against `cff1468`) — Gemini found `git stash create`'s
    untracked-file empty-output edge case (verdict: "Ready with minor
    fixes"). Codex found the same edge case plus: the plan's own A1 text
    still described the old (pre-`git stash create`) evidence rule; a
    contradiction in `AI_WORKFLOW.md` ground rule 14 vs. its later A5
    acknowledgment; a stale line-count disclosure. Verdict: "Blocked
    pending further rework." **All confirmed findings fixed** in commit
    `258521a` (`git add -A && git stash create` adopted after independent
    scratch-repo verification rejected the reviewer-suggested `-u` flag).
  - **Round 3** (targeted re-check against `258521a`, then `67c5248`) —
    Codex re-verified all 4 previously-open items and independently
    reproduced the `git add -A && git stash create` fix in a scratch
    repo; verdict: "Ready for human approval." Gemini's round-3 pass
    found one last leftover (`Documentation Contract` section still
    referenced plain `git stash create`); **fixed** in commit `67c5248`.
  - No review round found any dropped normative rule from the A3
    condensation itself.
- Authorization source for the batch-content-review exception: n/a (this
  feature did not use reviewer-applies-fixes mode).

## 8. Blockers

- None.

## 9. Known limitations

- The pre-existing quality gates without repository commands
  (documentation link/path checking; dependency, security, infrastructure
  and migration gates) remain unaddressed — they predate this plan
  (present since v2.1/WORKFLOW-002) and are out of this plan's scope. A
  required gate with no command is still a blocker under the architecture
  when that gate type is actually triggered by a future feature.
- `feature-delivery/SKILL.md`'s `/codex:review` and
  `/codex:adversarial-review` remain shorthand notations, not real
  registered slash commands — clarified with a one-line note in this
  round, but not converted into actual command definitions.
- The Claude-session-count and context-size Success Metrics (A4) have no
  instrumentation in this repository and can only be tracked
  prospectively starting with the next feature (explicitly stated in the
  architecture rather than backfilled).

## 10. Remaining risks

- This is the first time the amended evidence rule (`git add -A && git
stash create` for dirty state) will be used in a real feature; it has
  been verified technically (twice, independently, in scratch repos) but
  not yet exercised in an actual Codex implementation handoff.
- The architecture is 570 lines, 27 lines longer than after the first
  remediation round, because closing real defects (found by review) added
  more precise text than the original condensation removed. Both
  reviewers confirm no dropped rule, but the token-cost goal is only
  partially met on this specific document versus the plan's original
  target.

## 11. Follow-up work

- Add repository commands for the pre-existing gate types that still lack
  them (documentation link checking, dependency/security/infra checks),
  or record an explicit human-approved alternative, before those gate
  types are ever actually triggered by a feature.
- Register `/codex:review` and `/codex:adversarial-review` as real slash
  commands, or fully replace the shorthand with the `Agent(...)` call
  form used elsewhere in `AI_WORKFLOW.md`.
- Track the new Success Metrics (Codex executions/feature, Claude
  sessions/feature, validation reruns, review rounds, wall-clock) starting
  with the next feature under this architecture.
- Fix the two pre-existing CI/deploy gaps found in the earlier full
  workflow audit (`ci.yml` missing `format:check`; `deploy.yml` running
  without lint/test) — out of scope for this plan, needs a separate
  CRITICAL-tier plan delegated to Codex.
