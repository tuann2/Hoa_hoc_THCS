# WORKFLOW-004C Implementation Handoff

## Status

- Remediation state: VALIDATING
- Risk tier / categories / escalation rationale: ELEVATED /
  governance-enforcement tooling (scripts), risk-tier classification logic /
  classifier errors could let risky changes bypass review (plan header,
  approved 2026-07-19 by tuann2).
- Base SHA / candidate SHA: `7d9a0fb` (origin/main, 004B merge) / see
  evidence JSON below.
- Worktree state and dirty paths: clean at evidence time (see JSON).
- CI reference for exact candidate: PENDING (push authorization not yet
  granted; local full-profile evidence below).

## Summary and scope

- Requested scope and outcome: enforce the TRIVIAL tier by machine
  (fail-closed classifier), add the snapshot-bound micro-trace, add the CI
  verdict-confirmation step, measure the WORKFLOW-004 token baseline, run
  the three-part pilot. Plan:
  `docs/plans/WORKFLOW-004C-Trivial-Tier-Token-Measurement.md`.
- Files changed: `scripts/trivial-policy.ts`, `scripts/classify-trivial.ts`,
  `scripts/trace-trivial.ts` (new); `scripts/gates.ts`,
  `scripts/gates-manifest.ts`, `scripts/check-docs.ts` (2 exports),
  `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`,
  `docs/CONTEXT_RULES.md` (modified); 4 new test files;
  `docs/trace/trivial/.gitkeep`;
  `docs/measurements/WORKFLOW-004-token-baseline.md`; this handoff.
- `git diff --stat`: 19 files changed, ~2,300 insertions, 11 deletions
  (vs `origin/main`).

## Acceptance, decisions, and risks

| Plan acceptance criterion                                             | Evidence / status                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Machine-decided TRIVIAL verdict; §11 cases pass                       | `tests/scripts/classify-trivial.test.ts` — 16 §11 cases + 3 status cases, all pass                                |
| Governance/CI/scripts/deps/src/tests/schema/content cannot be TRIVIAL | denylist table test (30 samples) in `tests/scripts/trivial-policy.test.ts`                                        |
| Unknown path / add / delete / rename fail closed                      | classifier cases 3–6, 13–15                                                                                       |
| False TRIVIAL claim blocked by CI                                     | `trivial-verify` job + `verifyTrace` fixtures (smuggled edit, doctored trace)                                     |
| Snapshot-bound micro-trace per TRIVIAL run                            | `traceTrivial` writes schema-checked YAML bound to `computeSnapshot`; invalid traces rejected by `parseTraceYaml` |
| Pilot: 2 real TRIVIAL + 1 blocked violation                           | See "Pilot record" below                                                                                          |
| Token baseline, 8 scenarios, targets + deviations                     | `docs/measurements/WORKFLOW-004-token-baseline.md`                                                                |
| All tests pass on candidate                                           | 253 tests / 30 files pass locally; exact-candidate CI pending push                                                |
| Independent ELEVATED review + human approval                          | PENDING (dispatched after this handoff)                                                                           |

- Design decisions: (1) trace generation is a separate
  `scripts/trace-trivial.ts`, not folded into `gates.ts` — keeps
  `gates --tier=trivial` side-effect-free and mirrors the
  `evidence.ts` orchestrator pattern; (2) the CI claim trigger is "PR adds
  exactly one `docs/trace/trivial/*.yaml`", not a GitHub label (labels are
  out of scope per plan §5); a PR adding more than one trace fails closed;
  (3) `verifyTrace` recomputes the verdict from the actual git diff and
  ignores only the single trace file under verification — a doctored or
  under-reporting trace cannot pass; (4) `check-docs.ts` now exports its two
  existing reference patterns so the hard triggers are defined once
  repo-wide (in-scope clarification: additive export, no logic change);
  (5) the empty changeset is ESCALATE, not vacuously TRIVIAL.
- Deviations: (1) observed input tokens unavailable in this runtime —
  bytes/4 estimates recorded, same convention accepted in the 004B handoff;
  (2) pilot traces live on local branches `pilot/trivial-a` /
  `pilot/trivial-b` (not in this PR) because a non-TRIVIAL PR that adds
  trace files would correctly be rejected by its own `trivial-verify` job;
  (3) `npm_version` empty-in-restricted-sandbox gap from 004B does not
  reproduce here (evidence JSON has a real value).
- Blockers: none.
- Remaining risks / follow-up: (1) `trivial-verify` must be marked a
  required status check in GitHub branch protection to be enforcing — repo
  settings action for the owner, outside `ci.yml`; (2) architecture line
  "deferred to WORKFLOW-004C" becomes stale on merge — architecture edits
  are CRITICAL and out of scope, follow-up amendment noted; (3) content
  units allowlist relaxation intentionally deferred ≥1 month per plan §5.

## Pilot record

| Pilot | Branch                      | Change                                        | Verdict                                                | Gates                  | Trace                                                  | Verify |
| ----- | --------------------------- | --------------------------------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------------ | ------ |
| A     | `pilot/trivial-a`           | `PROJECT_STORY.md` wording fix                | TRIVIAL                                                | pass (6.00 s / 6.15 s) | `20260719-0348d9c8635d.yaml`, snapshot `3a49384d3ddc…` | exit 0 |
| B     | `pilot/trivial-b`           | `docs/content/CONTENT_OUTLINE.md` wording fix | TRIVIAL                                                | pass (6.06 s / 6.37 s) | `20260719-d14c5dae52db.yaml`                           | exit 0 |
| C     | `pilot/trivial-c-violation` | README `npm run dev` line edited              | ESCALATE (`code-fence`, `command-reference`) in 0.03 s | not run (fail-closed)  | refused (exit 1, no file)                              | n/a    |

## Validation evidence

```json
PENDING_EVIDENCE_JSON
```

## Independent verification

- Verifier / execution identifier / independence method: PENDING — fresh
  execution, independent-review envelope, no implementer transcript.
- Exact candidate CI status: PENDING (awaiting push authorization).
- Findings and disposition: PENDING
- Batch-content exception authorization: n/a
