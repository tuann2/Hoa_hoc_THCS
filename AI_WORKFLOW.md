# AI Workflow

Shared process for all agents working in this repository. Role-specific
rules live in `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex) and
`docs/DOCUMENTATION_RULES.md` (Antigravity/Gemini).

## Roles

| Agent | Role | Must never |
|---|---|---|
| Claude Code | Architect, planner, orchestrator, reviewer | Merge or deploy |
| Codex | Implementation, tests, targeted fixes, independent review | Change architecture or scope on its own |
| Antigravity/Gemini | README, API docs, ADR, runbook, changelog | Modify source code |
| Human | Approves plans and diffs, merges, deploys | Hand full production control to any agent |

## Pipeline

```text
Requirement (human)
  → Claude: analyze repo, write docs/plans/<FEATURE-ID>.md
  → Human: approve plan (status → APPROVED)
  → Codex: implement approved scope, write tests, run validation,
           create docs/handoffs/<FEATURE-ID>-implementation.md
  → Claude: inspect git diff, rerun validation independently
  → Codex: targeted corrections for confirmed findings only
  → Codex: /codex:review (and adversarial review for high-risk changes)
  → Antigravity: update docs to match implemented behavior
  → Human: review diff, commit, merge, deploy
```

## Ground rules

1. Claude Code is the single entry point for requirements.
2. No implementation starts before a plan is APPROVED by a human.
3. Codex implements only what the approved plan defines.
4. Summaries from any agent are not trusted; the Git diff is the truth.
5. Every material change ships with tests.
6. Documentation is written only after the code is validated.
7. No agent commits, pushes, merges, releases or deploys.
8. Never work directly on `main`; use `feature/<FEATURE-ID>` branches.
9. No secrets, tokens or production credentials are given to agents.
10. The human keeps final approval on plan, diff, merge and deploy.

## Artifacts

| Artifact | Location | Owner |
|---|---|---|
| Plan | `docs/plans/<FEATURE-ID>.md` | Claude Code |
| Implementation handoff | `docs/handoffs/<FEATURE-ID>-implementation.md` | Codex |
| ADR | `docs/adr/NNNN-<slug>.md` | Antigravity (drafted), human (approved) |
| API docs | `docs/api/` | Antigravity |
| Runbooks | `docs/runbooks/` | Antigravity |
| Changelog | `CHANGELOG.md` | Antigravity |

## Commit convention

Three separate commits per feature, in order:

1. `docs: add approved plan for <FEATURE-ID>`
2. `feat: implement <FEATURE-ID>` (includes tests and handoff)
3. `docs: document <FEATURE-ID>`

Commits are made by the human after reviewing each diff.

## Validation

Claude Code must rerun the repository's real commands (do not copy these
blindly — replace with the project's actual scripts):

```bash
# example for a Node project
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

## Escalation

Any agent that finds the approved plan conflicting with the actual
repository must stop and report instead of improvising.
