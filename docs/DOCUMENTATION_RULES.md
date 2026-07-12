# Documentation Rules

Rules for the documentation agent (Antigravity/Gemini via `agy` CLI).
Load this file explicitly in the prompt — do not rely on `AGENTS.md`,
which is written for Codex.

## Invoking Gemini for docs work

Claude Code calls `agy` synchronously:

```bash
agy --model "Gemini 3.5 Flash (High)" \
    --add-dir /Users/tuann2/Documents/Code/Hoa_hoc_THCS \
    -p "$(cat <<'PROMPT'
[Your documentation task here.
 Reference this file and AI_WORKFLOW.md for rules.]
PROMPT
)"
```

Available models: `agy models`. Prefer "Gemini 3.5 Flash (High)" for
docs tasks; "Gemini 3.1 Pro (High)" for complex analysis.

**Do not run `agy` in background** (background writes 0-byte output).

## Preconditions

Documentation work starts only after:

- code passed review and all validation commands pass;
- build and tests pass;
- the implementation handoff exists under `docs/handoffs/`;
- Claude Code confirmed the implementation matches the approved plan.

## Documentation → Revalidate

Per the architecture's Remediation State Machine (v2.2, rule 3), a
documentation-only post-validation change does **not** invalidate prior
engineering validation or completed tier reviews — unlike a change to a
release-artifact-affecting file (source, content, tests, config,
dependencies, migrations, infrastructure or deployment), which does.

So documentation is never the last step before release readiness.
After Gemini/Claude finish the documentation files, run the
"Documentation only" gates from the architecture's quality-gates table
on the changed doc files before the candidate can be marked
`RELEASE_READY`:

```bash
git diff --check
npm run format:check
```

plus a check that any changed links, paths and documented commands are
still valid. This revalidation is scoped to the changed documentation
files — it does not require rerunning the code-focused gates (lint,
typecheck, tests, build), since documentation content does not affect
their applicability or outcome. Record the revalidation result in the
implementation handoff; if it fails, the fix returns to documentation
and the revalidation repeats.

## Allowed files

- `README.md`
- `CHANGELOG.md`
- `docs/**` (all subdirectories)
- API specification files under `docs/api/`

## Forbidden files

- `src/**`
- `tests/**`
- `content/units/**` (JSON content — Codex/Claude domain)
- dependency files (`package.json`, `package-lock.json`)
- runtime configuration (`.env`, `vite.config.ts`, etc.)

## General principles

- Document **actual implemented behavior** — not plans or intentions.
- Verify commands and paths against the repository before writing.
- Use complete, runnable examples.
- State prerequisites explicitly.
- Explain failure modes and rollback steps.
- Never include real secrets, tokens or credentials.

## Required documentation per feature

When applicable, update:

- `README.md` — user-facing feature description
- `CHANGELOG.md` — changelog entry under `[Unreleased]`
- `docs/api/` — API reference if public interface changed
- `docs/runbooks/` — operational runbook if deploy/config changed
- `docs/adr/` — ADR if a significant architecture decision was made

## Style

- Concise headings in Vietnamese or English consistent with existing docs.
- Prefer examples over abstract descriptions.
- Use consistent terminology (e.g. "bài học", "thẻ lý thuyết", "câu hỏi").
- Mark destructive commands clearly (e.g. `# NGUY HIỂM — xoá dữ liệu`).
- Distinguish required from optional configuration.
- Include expected output where useful.
