---
name: feature-delivery
description: Run the full plan → approve → Codex implement → verify → review → document workflow for a feature. Use when the user asks to deliver, build, or implement a feature end-to-end following the repository AI workflow.
---

# Feature Delivery Workflow

Run the repository's standard delivery pipeline for the feature the user
describes. Follow `CLAUDE.md` and `AI_WORKFLOW.md` at every step.

## Steps

1. **Assign a feature ID** (`FEATURE-NNN`, next unused number in `docs/plans/`).
2. **Plan**: inspect the repository, copy `docs/plans/_TEMPLATE.md` to
   `docs/plans/<FEATURE-ID>.md`, fill it in completely. Do not touch
   application code.
3. **Approval gate**: present the plan and stop. Only continue after the
   user explicitly approves; then set the plan status to APPROVED.
4. **Delegate to Codex**:
   `/codex:rescue --fresh --background implement <FEATURE-ID> according to docs/plans/<FEATURE-ID>.md. Read AGENTS.md and AI_WORKFLOW.md first. Implement only the approved scope, add or update tests, run all applicable validation commands, do not commit or push, and create docs/handoffs/<FEATURE-ID>-implementation.md.`
5. **Verify**: inspect `git status` and `git diff` against the plan.
   Rerun the project's real format/lint/typecheck/test/build commands
   yourself. Do not trust Codex's summary.
6. **Targeted fixes**: if defects are confirmed, send Codex a numbered
   list of specific issues via `/codex:rescue --resume`. Never say "fix
   everything".
7. **Review**: run `/codex:review --base main --background`. For
   high-risk changes (see CLAUDE.md list) also run
   `/codex:adversarial-review`. Triage findings as confirmed / uncertain
   / rejected before acting.
8. **Documentation**: after validation passes, coordinate the
   documentation step per `docs/DOCUMENTATION_RULES.md` (Antigravity via
   Bash, or hand the prompt to the user).
9. **Deliver**: summarize scope, diff, validation results and remaining
   risks. Recommend the three-commit sequence. The user commits and merges.

## Hard rules

- Never start step 4 before explicit plan approval.
- Never commit, push, merge or deploy.
- Stop and report if the plan conflicts with the repository.
