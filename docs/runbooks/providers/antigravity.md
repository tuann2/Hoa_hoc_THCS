# Antigravity Provider Runbook

This runbook describes current adapter mechanics, not governance policy. Read
the execution envelope and role contract before acting.

## Invocation

Use `agy --add-dir /path/to/repo -p "prompt"` synchronously. Do not use a
background shell invocation: its output file can be empty. Use `agy models` to
inspect locally available models when selection matters. Supply only the
candidate snapshot, plan, and evidence needed for an independent review.

## Model selection

### Selection criteria

Choose the stronger structural-reasoning model tier for reviewing code, diffs,
and lockfiles. Choose the faster model tier for reviewing documentation and
learning content, including JSON units, when structural code reasoning is not
needed.

### Verified model IDs

Verified 2026-07-26 by running `agy models` in the orchestrator environment.

| Work tier                                      | Model ID                   |
| ---------------------------------------------- | -------------------------- |
| Strong structural reasoning                    | `claude-opus-4-6-thinking` |
| Fast documentation and learning-content review | `gemini-3.6-flash-high`    |

Other IDs available on the same date: `gemini-3.6-flash-medium`,
`gemini-3.6-flash-low`, `gemini-3.5-flash-high`, `gemini-3.5-flash-medium`,
`gemini-3.5-flash-low`, `gemini-3.1-pro-high`, `gemini-3.1-pro-low`,
`claude-sonnet-4-6`, `gpt-oss-120b-medium`.

These are the IDs `agy models` prints. Earlier repository documents wrote
display names such as `"Gemini 3.5 Flash (High)"`; prefer the printed ID.

If this verification date is old, run `agy models` again before use. Do not
substitute an unverified model ID.

## Execution profiles

| Profile         | Adapter   | Effective capabilities                       | Known restrictions                                      |
| --------------- | --------- | -------------------------------------------- | ------------------------------------------------------- |
| agy-read-review | `agy` CLI | repository-read and review analysis          | synchronous invocation; repository write is not assumed |
| agy-doc-draft   | `agy` CLI | documentation drafting within envelope paths | host write permission must be explicitly verified       |

If a required review capability is unavailable, report the gate blocked until
the human authorizes an equally independent replacement.
