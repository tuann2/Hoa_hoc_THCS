# <FEATURE-ID> Implementation Handoff

<!--
The only post-implementation orchestration artifact (architecture
Documentation Contract). Living document: fill review fields with
PENDING before independent review; update them with outcomes.
Regenerate after remediation; mark superseded evidence STALE.
-->

## Status

- Remediation state: PLANNED | IMPLEMENTING | VALIDATING | VALIDATED | REVIEWING | RELEASE_READY | REMEDIATION_REQUIRED | BLOCKED
- Risk tier: NORMAL | ELEVATED | CRITICAL
- Risk categories: <!-- per the architecture Risk Model -->
- Escalation rationale: <!-- why this tier; "n/a" if lowest applicable -->

## 1. Summary

Mô tả ngắn kết quả triển khai.

## 2. Files changed

| File      | Change |
| --------- | ------ |
| `src/...` | ...    |

```text
<git diff --stat output>
```

## 3. Evidence binding

- Base commit SHA (`HEAD` when validation started): ...
- Candidate commit SHA: ... | UNCOMMITTED
  <!-- once a candidate commit exists, it + a CI run reference for that
  exact SHA is the evidence anchor; before that, base SHA + dirty paths -->
- CI run reference for the candidate commit (when available): ...
- Dirty-worktree state and exact dirty paths (required pre-commit; state
  "clean" if a candidate commit exists and the worktree is clean): ...
- Validation start (UTC, ISO 8601): ...
- Validation completion (UTC, ISO 8601): ...
- Runtime / package-manager versions: ...
- Validation-tool versions or lockfile SHA: ...

## 4. Validation commands and gates

| Command                    | Exit status | Quality gate satisfied |
| -------------------------- | ----------- | ---------------------- |
| `git diff --check`         | 0           | Baseline               |
| `npm run format:check`     | 0           | Baseline               |
| `npm run validate-content` | 0           | Content/schema         |
| ...                        | ...         | ...                    |

<!-- Only gates applicable to the change type per the architecture
quality-gates table. A required gate with no command = blocker. -->

## 5. Design decisions

- ...

## 6. Deviations from the approved plan

- None

## 7. Independent verification

- Verifier identity: PENDING <!-- e.g. fresh Codex review / fresh Gemini review / CI -->
- Execution identifier: PENDING
- Independence method: PENDING <!-- CI on candidate commit / fresh read-only execution -->
- CI commit SHA and status (when required or available): PENDING
- Review findings and disposition: PENDING

## 8. Blockers

- None

## 9. Known limitations

- ...

## 10. Remaining risks

- ...

## 11. Follow-up work

- ...
