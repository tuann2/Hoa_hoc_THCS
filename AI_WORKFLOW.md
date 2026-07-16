# AI Workflow

Shared process for all agents working in this repository. The single
source of truth for workflow rules is
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md` (when its status is
APPROVED). This file records project-specific mechanics (tool
invocation, commands, artifacts) and defers all policy to the
architecture. Role-specific rules live in `CLAUDE.md` (Claude Code),
`AGENTS.md` (Codex) and `docs/DOCUMENTATION_RULES.md`
(Antigravity/Gemini).

## Roles

Defined by the architecture's Responsibility Matrix:

| Agent              | Tool / invocation             | Role                                                                              | Must never                                |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Claude Code        | `claude` CLI / IDE extension  | Architect: planning, risk classification, orchestration, gates, release readiness | Implement features; approve release       |
| Codex              | `codex:codex-rescue` subagent | Engineering engine: implementation, validation, handoff; fresh executions review  | Change architecture or scope on its own   |
| Antigravity/Gemini | `agy -p "..."` CLI            | Independent reviewer (required for `CRITICAL`); docs drafting                     | Modify source code                        |
| Human              | GitHub UI / terminal          | Final authority: approves plans, risk tiers, releases; merges, deploys            | Hand full production control to any agent |

## Pipeline

The per-tier workflows (`NORMAL` / `ELEVATED` / `CRITICAL`), the
remediation state machine and the session lifecycle are defined in the
architecture. Summary of the common shape:

```text
Requirement (human)
  → Claude: plan in docs/plans/<FEATURE-ID>.md with risk tier
  → [if new tech] rationale + alternatives + trade-offs → explicit human approval
  → Human: approve plan (status → APPROVED; approval covers the risk tier)
  → Codex: implement approved scope, run applicable canonical gates,
    write implementation handoff with snapshot-bound evidence
  → Claude gate: handoff + git diff --stat + bound evidence
    (line-level inspection only per Claude Gates triggers)
  → Independent verification per risk tier (see architecture table)
  → Findings → remediation state machine (back to Codex, re-validate,
    regenerate handoff, repeat required reviews)
  → Claude: release-readiness assessment; commit/push/PR when authorized
  → Human: review, merge, deploy
  → [if new tech was adopted] Claude: update docs/architecture.md
    (and docs/adr/ for non-trivial decisions)
```

## Ground rules

1. Claude Code is the single entry point for requirements.
2. No implementation starts before a plan is APPROVED by a human.
3. Codex implements only what the approved plan defines.
4. Summaries are never evidence. Evidence must be bound to the exact
   implementation snapshot (see the architecture's Trust Model and
   Evidence Binding).
5. Every material change ships with tests.
6. Documentation is written only after the code is validated.
7. Codex and Gemini never commit, push, merge, release or deploy.
8. Claude Code may commit and push when the human explicitly authorizes
   it for a session (e.g. "bạn cứ commit/push khi xong").
9. Never work directly on `main`; use `feature/<FEATURE-ID>` branches.
10. No secrets, tokens or production credentials are given to agents.
11. The human keeps final approval on plan, diff, merge and deploy.
12. New technology (dependency, service, infra) requires stated
    rationale/alternatives/trade-offs and explicit human approval before
    implementation, then a record in `docs/architecture.md`.
13. Validation executes once per implementation snapshot; successful
    gates are not rerun merely to reproduce logs.
14. Independent reviewers are fresh executions with no inherited
    implementation context; they report findings and never modify the
    candidate — except the architecture's bounded
    reviewer-applies-fixes exception for `NORMAL`-tier learning-content
    batch review (see "Independent review per risk tier" below), which
    never applies to `ELEVATED`/`CRITICAL` work.

## Invoking Codex from Claude

Codex is delegated via the `codex:codex-rescue` subagent. Always prefix
the prompt with routing flags before the `<task>` block:

```
--cwd /absolute/path/to/repo   # required when repo ≠ session cwd
--write                        # required for file writes
--background                   # optional: returns immediately, notifies on done
--wait                         # optional: blocks until done (use for small tasks)
```

**Critical**: the `--cwd` flag must appear first. Without it, Codex
operates in the Claude session's working directory, not the target repo.
See `docs/runbooks/AGENT_TOOLS_SETUP.md` for the one-time fix required
in the Codex plugin cache.

### Parallel delegation (for independent units)

When tasks do not share files, delegate all at once with
`run_in_background: true`. Cuts wall-clock time ~3×:

```
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task B3>")
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task B4>")
```

Check status: `node <codex-companion.mjs path> status --cwd /repo --all --json`

### Codex action safety

Always include in every Codex prompt:

```
<action_safety>
Không commit, không push. Chỉ sửa <file(s)>.
</action_safety>
```

## Invoking the independent reviewer (agy) from Claude

Antigravity CLI (`agy`) runs reviewer models synchronously. Per the
architecture, independent review is required for `CRITICAL` work and
optional otherwise. Also usable for docs drafting (README, changelog,
ADR).

Model selection:

- `"Claude Opus 4.6 (Thinking)"` — review tính năng, code, diff,
  lockfile.
- `"Gemini 3.5 Flash (High)"` — review tài liệu, docs, learning content
  (JSON units).

```bash
# Synchronous — preferred (background mode writes 0-byte output file)
agy --model "Claude Opus 4.6 (Thinking)" \
    --add-dir /path/to/repo \
    -p "Your prompt here"

# Available models
agy models
```

**Note**: do not use `run_in_background: true` for Bash tool when calling
`agy` — the background output file stays empty. Run synchronously with a
`timeout` of 300000ms for long prompts.

**Give agy repo access**: always pass `--add-dir /path/to/repo` so the
reviewer can read source files directly.

If agy is unavailable for `CRITICAL` work, the review gate is blocked
until the human approves an equally independent replacement reviewer.

## Independent review per risk tier

See the architecture's Independent Verification table for the normative
requirements. Project mapping:

- `NORMAL` — CI on the exact candidate commit when available; otherwise
  one fresh read-only reviewer inspects the targeted diff and reruns the
  risk-relevant gate(s).
- `ELEVATED` — one fresh Codex review execution inspects every changed
  line, affected tests and the elevated-risk behavior.
- `CRITICAL` — one fresh Gemini review **and** one separate fresh Codex
  adversarial review inspect every changed line and critical failure
  modes.

Historical note: this dual-review pattern caught a multi-choice answers
bug (b3-l5-q8) that single-pass review missed.

For `NORMAL`-tier learning-content batch review, the architecture's
Independent Verification section defines a bounded
reviewer-applies-fixes exception (human-authorized, findings still
recorded, numeric/chemistry fixes still independently re-verified) —
see the architecture, not restated here.

## Validation commands (this project)

Canonical commands per the architecture's Validation Model:

```bash
git diff --check
npm run format:check
npm run validate-content   # schema + PTHH balance check
npm run lint
npm run typecheck
npm test
npm run build
```

Only the commands applicable under the architecture's quality-gates
table need to run for a given change type. Validation runs once per
snapshot by the implementation execution (normally Codex), and every
record must satisfy the architecture's Evidence Binding requirements.

## Artifacts

| Artifact               | Location                                       | Owner                                                                                                                                 |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Plan                   | `docs/plans/<FEATURE-ID>.md`                   | Claude Code (pre-implementation authority)                                                                                            |
| Implementation handoff | `docs/handoffs/<FEATURE-ID>-implementation.md` | Codex — the only post-implementation orchestration artifact (see the architecture's Documentation Contract; no duplicate `Result.md`) |
| Architecture record    | `docs/architecture.md`                         | Claude Code (updated after human approval)                                                                                            |
| ADR                    | `docs/adr/NNNN-<slug>.md`                      | Antigravity (drafted), human (approved)                                                                                               |
| API docs               | `docs/api/`                                    | Antigravity                                                                                                                           |
| Runbooks               | `docs/runbooks/`                               | Antigravity / Claude                                                                                                                  |
| Changelog              | `CHANGELOG.md`                                 | Claude Code                                                                                                                           |

## Commit convention

```
feat: implement <FEATURE-ID> — <short description>
fix: <what was wrong> (<where>)
docs: <what was documented>
content: add <unit> unit (<FEATURE-ID>)
```

Commits are made by Claude Code after the applicable gates have passed
for the snapshot, when the human has authorized session-level commit
rights.

## Escalation

Any agent that finds the approved plan conflicting with the actual
repository must stop and report instead of improvising. If scope changes
raise the effective risk tier, work stops until the revised plan is
approved. Unrecoverable blockers move the candidate to `BLOCKED` in the
remediation state machine.
