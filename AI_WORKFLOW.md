# AI Workflow

Shared process for all agents working in this repository. Role-specific
rules live in `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex) and
`docs/DOCUMENTATION_RULES.md` (Antigravity/Gemini).

## Roles

| Agent              | Tool / invocation                          | Role                                                       | Must never                                |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------- |
| Claude Code        | `claude` CLI / IDE extension               | Architect, planner, orchestrator, reviewer, committer      | Merge or deploy without human approval    |
| Codex              | `codex:codex-rescue` subagent              | Implementation, tests, targeted fixes, independent review  | Change architecture or scope on its own   |
| Antigravity/Gemini | `agy -p "..."` CLI                         | Independent numeric/logic review, README, docs, changelog  | Modify source code                        |
| Human              | GitHub UI / terminal                       | Approves plans, reviews diffs, merges, deploys             | Hand full production control to any agent |

## Pipeline

```text
Requirement (human)
  → Claude: analyze repo, write docs/plans/<FEATURE-ID>.md
  → [if plan introduces new tech] Claude: state rationale + alternatives
    + trade-offs in the plan → Human: approve the tech choice explicitly
  → Human: approve plan (status → APPROVED)
  → Codex: implement approved scope, validate, report
  → Claude: inspect git diff, rerun validation independently, commit
  → Codex (parallel, optional): targeted corrections for confirmed findings
  → Codex + Gemini (dual review): cross-check high-risk numeric/logic changes
  → Claude: commit fixes, push, open PR
  → Human: review PR diff, merge, deploy
  → [if new tech was adopted] Claude: update docs/architecture.md
    (and docs/adr/ for non-trivial decisions)
```

## Ground rules

1. Claude Code is the single entry point for requirements.
2. No implementation starts before a plan is APPROVED by a human.
3. Codex implements only what the approved plan defines.
4. Summaries from any agent are not trusted; the Git diff is the truth.
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
Agent(subagent_type="codex:codex-rescue", run_in_background=True,
      prompt="--cwd /repo --write --background <task B5>")
```

Check status: `node <codex-companion.mjs path> status --cwd /repo --all --json`

### Codex action safety

Always include in every Codex prompt:

```
<action_safety>
Không commit, không push. Chỉ sửa <file(s)>.
</action_safety>
```

## Invoking Gemini (agy) from Claude

Antigravity CLI (`agy`) runs Gemini models synchronously. Use for:

- Independent cross-check of numeric/logic problems Codex authored
- Docs drafting (README, changelog, ADR)
- Second-opinion review on high-risk content

```bash
# Synchronous — preferred (background mode writes 0-byte output file)
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /path/to/repo \
    -p "Your prompt here"

# Available models
agy models
# → Gemini 3.5 Flash (Low/Medium/High), Gemini 3.1 Pro (Low/High),
#   Claude Sonnet 4.6, Claude Opus 4.6, GPT-OSS 120B
```

**Note**: do not use `run_in_background: true` for Bash tool when calling
`agy` — the background output file stays empty. Run synchronously with a
`timeout` of 300000ms for long prompts.

**Give agy repo access**: always pass `--add-dir /path/to/repo` so Gemini
can read source files directly.

## Dual-agent review pattern

For high-risk content (numeric problems, financial calculations, complex
logic) run Codex and Gemini in parallel — they are independent and catch
different classes of errors:

```
Parallel:
  Codex  → re-solves every numeric, fixes errors in-place, reports
  Gemini → independent cross-check, reports findings only (read-only)

Then: Claude reconciles both reports, applies remaining fixes, commits.
```

This pattern caught a multi-choice answers bug (b3-l5-q8) that single-pass
review missed — Gemini noticed the `explanation` text mentioned a correct
value that wasn't in the `answers` array.

## Validation commands (this project)

```bash
npm run validate-content   # schema + PTHH balance check
npx prettier --write <file>
npm test                   # 15 unit tests
npm run lint
npm run typecheck
npm run build
```

Run all five before every commit. If any fails, fix and re-run the full
chain.

## Artifacts

| Artifact               | Location                                       | Owner                                   |
| ---------------------- | ---------------------------------------------- | --------------------------------------- |
| Plan                   | `docs/plans/<FEATURE-ID>.md`                   | Claude Code                             |
| Implementation handoff | `docs/handoffs/<FEATURE-ID>-implementation.md` | Codex (drafted), Claude (reviewed)      |
| Architecture record    | `docs/architecture.md`                         | Claude Code (updated after human approval) |
| ADR                    | `docs/adr/NNNN-<slug>.md`                      | Antigravity (drafted), human (approved) |
| API docs               | `docs/api/`                                    | Antigravity                             |
| Runbooks               | `docs/runbooks/`                               | Antigravity / Claude                    |
| Changelog              | `CHANGELOG.md`                                 | Claude Code                             |

## Commit convention

```
feat: implement <FEATURE-ID> — <short description>
fix: <what was wrong> (<where>)
docs: <what was documented>
content: add <unit> unit (<FEATURE-ID>)
```

Commits are made by Claude Code after validating each diff, when the
human has authorized session-level commit rights.

## Escalation

Any agent that finds the approved plan conflicting with the actual
repository must stop and report instead of improvising.
