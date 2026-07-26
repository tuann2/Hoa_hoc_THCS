# WORKFLOW-006 Implementation Handoff

## Status

- Remediation state: RELEASE_READY (single pass, no remediation needed).
- Risk tier / rationale: NORMAL — docs + plan template + role contract +
  runbook only; no `scripts/**`, `.github/**`, or
  `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` touched. D.1
  (`.codex/config.toml`) turned out already correct pre-execution (see
  plan's "Kiểm tra tiền-thực-thi"), so this candidate touches no config
  either.
- Base SHA / candidate SHA: `ae12dc6a274a488ef68f2c401ee819f4b78c6700` /
  `UNCOMMITTED` (working tree on branch
  `docs/workflow-006-007-plans-005-measurement`).
- Independent review: not required per plan (NORMAL, CI-on-candidate is
  sufficient; see plan's execution-assignment table).

## Scope and diff

- In scope executed: Phase A (branch-drift investigation, this section),
  Phase D.3–D.5 (plan template field, implementer role-contract line,
  Codex runbook restriction note), Phase B (instrumentation design note),
  Phase E (update to `FEATURE-016-token-cost.md`).
- D.1 (`.codex/config.toml` model string) and D.2 (two dirty files) were
  found already complete before implementation started — see the plan's
  "Kiểm tra tiền-thực-thi (2026-07-26)" section. Neither was touched by
  this candidate.
- Files changed by this candidate: `docs/plans/_TEMPLATE.md`,
  `docs/roles/implementer.md`, `docs/runbooks/providers/codex.md`,
  `docs/measurements/token-cost-instrumentation-design.md` (new),
  `docs/measurements/FEATURE-016-token-cost.md`, plus this handoff and
  the plan edits recorded in
  `docs/plans/WORKFLOW-006-Input-Token-Cost-Audit.md` itself.

## Phase A — branch-context-drift scan (full, not the plan's preliminary manual sample)

Method: enumerated every local branch (`git for-each-ref refs/heads/`)
and every remote-only branch (`refs/remotes/origin/*` without a local
ref), `git fetch origin --prune` first. For each, checked
`git merge-base --is-ancestor <branch> main` — if true, the branch is
**merged** (fully contained in `main`, its own mandatory-context state is
moot regardless of what it was during the branch's life, since `main`'s
current state governs). If false, the branch has unique commits and its
`CLAUDE.md` / `AGENTS.md` / `docs/CONTEXT_RULES.md` (existence) were
compared against `main`'s current blobs via `git cat-file -s`. Drifted
branches were also checked against `7d9a0fb` (the WORKFLOW-004B merge
commit) with `git merge-base --is-ancestor 7d9a0fb <branch>` to confirm
they were created/diverged before 004B landed, not after.

`main` reference values: `CLAUDE.md` = 35 B, `AGENTS.md` = 1 992 B,
`docs/CONTEXT_RULES.md` exists (2 709 B).

### Still-open (unmerged) branches — the only ones a drift check matters for

| Branch                                                      | Merged into `main`? | `CLAUDE.md` | `AGENTS.md` | `CONTEXT_RULES.md` | Drift verdict                                          | Contains 004B (`7d9a0fb`)? |
| ----------------------------------------------------------- | ------------------- | ----------- | ----------- | ------------------ | ------------------------------------------------------ | -------------------------- |
| `chore/model-routing-config`                                | No                  | 10 443 B    | 3 600 B     | absent             | **DRIFTED** — pre-004B context, third distinct variant | No — diverged 2026-07-15   |
| `origin/codex/feature-015-chuan-hoa-noi-dung-hoc`           | No                  | 9 874 B     | 3 600 B     | absent             | **DRIFTED** — pre-004B context                         | No — diverged 2026-07-17   |
| `pilot/trivial-a`                                           | No                  | 35 B        | 1 992 B     | present            | clean                                                  | Yes                        |
| `pilot/trivial-b`                                           | No                  | 35 B        | 1 992 B     | present            | clean                                                  | Yes                        |
| `pilot/trivial-c-violation`                                 | No                  | 35 B        | 1 992 B     | present            | clean                                                  | Yes                        |
| `docs/workflow-006-007-plans-005-measurement` (this branch) | No                  | 35 B        | 1 992 B     | present            | clean                                                  | Yes                        |

`origin/codex/feature-015-chuan-hoa-noi-dung-hoc` is a **new finding**:
a WIP branch (last commit 2026-07-19, "chuẩn hoá nội dung Hoá học") not
previously identified as drifted in `FEATURE-016-token-cost.md` §5.1's
manual spot-check. It has no billing data attached (unlike
`feature/FEATURE-014`/`FEATURE-016`), so it is not a cost finding, but it
is exactly the kind of branch WORKFLOW-007's drift gate is meant to warn
on if work resumes on it without rebasing onto `main` first.

### Merged branches — excluded from the drift verdict, listed for completeness

All of the following are fully contained in `main` (`git merge-base
--is-ancestor <branch> main` = true), so whatever mandatory-context state
they had during their own life is moot — `main`'s current state is what
governs any future work: `docs/FEATURE-016-production-smoke-test`,
`feature/FEATURE-014`, `feature/FEATURE-015`, `feature/FEATURE-016`,
`feature/WORKFLOW-004`, `feature/WORKFLOW-004B`, `feature/WORKFLOW-004C`,
`feature/WORKFLOW-005`, `fix/FEATURE-016-progress-version-drift`,
`fix/audit-brace-expansion`, `fix/react-router-audit`, and (remote-only)
`origin/docs/readme-ai-credits`,
`origin/docs/WORKFLOW-005-model-usage-correction`,
`origin/feature/FEATURE-001,002,003,004,005,006,009,010,011,013`,
`origin/feature/WORKFLOW-003`.

**Correction to the plan's preliminary "Current analysis" paragraph:**
that paragraph listed `feature/FEATURE-014` alongside
`chore/model-routing-config` as both being "lệch" (drifted) findings of
the same kind. Phase A's full scan shows this conflates two different
things: `feature/FEATURE-014` **was** drifted during its life but is now
**merged** (moot — no longer an open risk), while
`chore/model-routing-config` is drifted **and still open** (a real,
current risk if anyone resumes work on it without rebasing). Only the
still-open table above represents current risk.

### Limitation (per plan's risk row)

This scan only sees branches that exist, locally or on `origin`, at
investigation time (2026-07-26). A branch deleted locally with an open,
un-synced PR elsewhere would not appear. No such case is known, but this
is a stated limitation, not a guarantee of completeness.

## Phase D — direct cleanup (D.3–D.5; D.1–D.2 already done pre-execution)

- **D.3**: `docs/plans/_TEMPLATE.md` — added a required "Execution
  profile + degradation path" field under `## Current analysis and
design`, referencing `docs/runbooks/providers/codex.md`'s profile
  table. `npx prettier --check` and `npm run check:docs` both pass after
  the edit.
- **D.4**: `docs/roles/implementer.md` — added a line under
  Responsibilities requiring remediation to enumerate every code path a
  finding applies to before fixing, directly addressing
  `FEATURE-016-token-cost.md` §6.5 (a remediation round existed only
  because the first fix covered one code path of a finding that applied
  to two). Same validation.
- **D.5**: `docs/runbooks/providers/codex.md` — added the `tsx` IPC
  `EPERM` restriction to the `codex-claude-subagent` row's "Known
  restrictions" column, alongside the existing `git-metadata-write`
  restriction, per `FEATURE-016-token-cost.md` §6.1 (this blocker hit
  3/3 validation rounds because it was undocumented and rediscovered each
  time). Same validation.

## Phase B — instrumentation design note (design-only, per plan)

Added `docs/measurements/token-cost-instrumentation-design.md`. It could
not verify from this environment whether Azure/Codex dashboards can
export cached-input-token or phase-tagged data (no live dashboard access
in this session) — the note states this as an open limitation rather than
promising a capability that has not been confirmed, per the plan's
explicit instruction ("nếu không, ghi rõ giới hạn còn lại, không hứa
quá").

## Phase E — FEATURE-016-token-cost.md update

Added a note to §5.1 pointing to this handoff's Phase A table: confirms
the "sự cố cục bộ, không lặp lại hệ thống" conclusion, adds the one new
drifted-branch finding, and corrects the merged-vs-still-open distinction
above.

## Validation evidence

- `npx prettier --write` applied to every changed file, then
  `npm run gates -- --changed-from=ae12dc6a274a488ef68f2c401ee819f4b78c6700`:
  exit 0, `"result": "pass"` (docs profile: `git-diff-check`,
  `format-check`, `docs-check --all`, 91 Markdown files checked, only
  pre-existing external-URL warnings).
- `npm run evidence -- --changed-from=ae12dc6a274a488ef68f2c401ee819f4b78c6700`:
  exit 0, `"result": "pass"`, git-tree snapshot
  `5354d9e4c9e1d2139cd4571f9b8449f70fa95dfd`, lockfile sha256
  `fcb9e26c85ffd1a43eec0a56a0cd2cb9b0a6d3a543e68f941989f03416f9c656`,
  `node_version: v24.16.0`, `npm_version: 11.13.0`,
  `snapshot_fallback_reason: null`.
- This snapshot includes the earlier commit on this same branch
  (`0056e3d`, the WORKFLOW-006/007 plan recovery + WORKFLOW-005
  token-only measurement) plus every file this handoff lists, since both
  are measured against the same `main` base
  (`ae12dc6a274a488ef68f2c401ee819f4b78c6700`).

## Blockers, reviews, and follow-up

- Blockers: none.
- Independent verification: not required (NORMAL tier, CI-on-candidate
  per plan).
- Follow-ups this plan explicitly defers (per its "Out of scope"):
  script/CI drift gate → `docs/plans/WORKFLOW-007-Branch-Context-Drift-Gate.md`;
  routing-model-to-risk-tier as a governance rule; allowing Codex to
  commit on feature branches; splitting closed review rounds out of the
  main handoff; fixing the `codex-claude-subagent` sandbox itself
  (outside this repo).
