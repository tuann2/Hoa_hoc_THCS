# WORKFLOW-004 token baseline (measured under WORKFLOW-004C)

- Date: 2026-07-19
- Measured on branch `feature/WORKFLOW-004C` (candidate for architecture
  v2.4 + TRIVIAL enforcement); "before" numbers are read from git history
  at commit `ce5a9d4` (main immediately before the WORKFLOW-004B merge).
- Method: fixed 8-scenario set (6 reused from the WORKFLOW-004B
  conformance suite + 2 new TRIVIAL scenarios). Primary metric is
  mandatory-context bytes and lines; estimated tokens are bytes/4. The
  runtimes used here do not report observed input tokens, so the token
  column is an estimate, not a tokenizer-output claim (recorded as a
  deviation, same convention as the 004B handoff). Command scenarios ran
  2 times each; times are averaged over the 2 runs. Per the approved
  HIGH-07 Modified constraint there is no multi-round p50/p95 benchmark.
- The 004B conformance scenario "restricted profile ⇒ degradation path"
  is excluded from the reused set: it measures sandbox behavior, not
  context routing, and has no deterministic before/after token
  comparison. This exclusion is a documented judgment call.

## Mandatory-context file sizes

| File                                            | Before (`ce5a9d4`) | After (004C candidate) |
| ----------------------------------------------- | ------------------ | ---------------------- |
| `CLAUDE.md`                                     | 9,874 B / 203 ln   | 35 B / 3 ln            |
| `AGENTS.md`                                     | 3,600 B / 96 ln    | 1,992 B / 32 ln        |
| `AI_WORKFLOW.md`                                | 10,704 B / 215 ln  | unchanged legacy alias |
| `docs/CONTEXT_RULES.md`                         | absent             | 2,709 B / 34 ln        |
| `docs/roles/implementer.md`                     | absent             | 2,281 B / 46 ln        |
| `docs/PROJECT_CONTEXT.md`                       | absent             | 2,088 B / 39 ln        |
| `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` | 27,369 B / 625 ln  | 18,896 B / 340 ln      |

Before 004B every governed task loaded the fat `CLAUDE.md` (9,874 B) plus
`AI_WORKFLOW.md` (10,704 B) ≈ 20,578 B (~5,145 tokens) of mandatory
governance context, before any task file. After 004B/004C the shim chain
is `CLAUDE.md` (35 B) → `AGENTS.md` (1,992 B) ≈ 2,027 B (~507 tokens),
with everything else retrieved per `docs/CONTEXT_RULES.md`.

## Scenario table

Estimated tokens = mandatory bytes / 4, rounded. Targets: read-only
≤1.5k; TRIVIAL ≤2.5k; NORMAL ≤5k; CRITICAL escalates (no cap).

| #   | Scenario                         | Phase  | Mandatory context                                                         | Bytes          | Est. tokens     | Target    | Result                     |
| --- | -------------------------------- | ------ | ------------------------------------------------------------------------- | -------------- | --------------- | --------- | -------------------------- |
| 1   | Read-only question               | before | fat CLAUDE.md + AI_WORKFLOW.md                                            | 20,578         | ~5,145          | ≤1.5k     | FAIL (legacy)              |
| 1   | Read-only question               | after  | shim chain                                                                | 2,027          | ~507            | ≤1.5k     | PASS                       |
| 2   | Non-governance docs typo         | before | fat CLAUDE.md + AI_WORKFLOW.md                                            | 20,578         | ~5,145          | ≤5k       | FAIL (legacy)              |
| 2   | Non-governance docs typo         | after  | shim chain + CONTEXT_RULES                                                | 4,736          | ~1,184          | ≤5k       | PASS                       |
| 3   | NORMAL content unit change       | before | fat CLAUDE.md + AI_WORKFLOW.md                                            | 20,578         | ~5,145          | ≤5k       | FAIL (legacy)              |
| 3   | NORMAL content unit change       | after  | shim chain + implementer + CONTEXT_RULES + PROJECT_CONTEXT                | 9,105          | ~2,276          | ≤5k       | PASS                       |
| 4   | NORMAL UI change                 | before | fat CLAUDE.md + AI_WORKFLOW.md                                            | 20,578         | ~5,145          | ≤5k       | FAIL (legacy)              |
| 4   | NORMAL UI change                 | after  | shim chain + implementer + CONTEXT_RULES                                  | 7,017          | ~1,754          | ≤5k       | PASS                       |
| 5   | CRITICAL governance question     | before | fat CLAUDE.md + AI_WORKFLOW.md + full architecture                        | 47,947         | ~11,987         | escalates | PASS (by design)           |
| 5   | CRITICAL governance question     | after  | shim chain + implementer + CONTEXT_RULES + full architecture              | 25,913         | ~6,478          | escalates | PASS (by design)           |
| 6   | No-envelope dispatch (read-only) | before | fat CLAUDE.md + AI_WORKFLOW.md                                            | 20,578         | ~5,145          | ≤1.5k     | FAIL (legacy)              |
| 6   | No-envelope dispatch (read-only) | after  | shim chain (explicit read-only rule)                                      | 2,027          | ~507            | ≤1.5k     | PASS                       |
| 7   | TRIVIAL docs typo end-to-end     | before | n/a — tier did not exist; nearest path was NORMAL (scenario 2)            | 20,578         | ~5,145          | ≤2.5k     | n/a (no TRIVIAL tier)      |
| 7   | TRIVIAL docs typo end-to-end     | after  | shim chain + CONTEXT_RULES + classifier verdict output (~1 KB)            | 5,760          | ~1,440          | ≤2.5k     | PASS                       |
| 8   | TRIVIAL claim that must escalate | before | n/a — tier did not exist                                                  | —              | —               | —         | n/a                        |
| 8   | TRIVIAL claim that must escalate | after  | shim chain + CONTEXT_RULES + classifier ESCALATE output, then NORMAL path | 5,760 + NORMAL | ~1,440 + NORMAL | fail fast | PASS (escalated in <0.1 s) |

## Command timings (2 runs averaged, real executions)

| Scenario                                                   | Command                                                 | Run 1  | Run 2  | Avg    |
| ---------------------------------------------------------- | ------------------------------------------------------- | ------ | ------ | ------ |
| 7 (pilot A, `PROJECT_STORY.md` wording fix)                | `npm run gates -- --tier=trivial --changed-from=<base>` | 6.00 s | 6.15 s | 6.08 s |
| 7 (pilot B, `docs/content/CONTENT_OUTLINE.md` wording fix) | `npm run gates -- --tier=trivial --changed-from=<base>` | 6.06 s | 6.37 s | 6.22 s |
| 8 (pilot C, README command-line edit, ESCALATE)            | `npm run gates -- --tier=trivial --changed-from=<base>` | 0.03 s | 0.03 s | 0.03 s |

The 6-second TRIVIAL wall time is dominated by the three minimal gates
(`git-diff-check`, `format-check`, `docs-check --all`); the classifier
verdict itself resolves in ~30 ms, which is why a wrong TRIVIAL attempt
(scenario 8) fails closed almost instantly instead of running gates.

## Deviations

- Observed input tokens: not reported by the runtimes used for this
  measurement; bytes/4 estimates are presented instead (same deviation
  as recorded and accepted in the 004B handoff).
- "Before" rows are computed from repository state at `ce5a9d4`; no
  legacy runtime was re-executed. Byte counts are exact; the FAIL labels
  on legacy rows reflect target comparison only.
- Scenario 8's post-escalation NORMAL-path cost is not double-counted
  here; it equals scenario 2's NORMAL "after" row by construction.
