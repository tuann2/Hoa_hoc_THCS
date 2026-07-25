# Antigravity Provider Runbook

This runbook describes current adapter mechanics, not governance policy. Read
the execution envelope and role contract before acting.

## Invocation

Use `agy --add-dir /path/to/repo -p "prompt"` synchronously. Do not use a
background shell invocation: its output file can be empty. Use `agy models` to
inspect locally available models when selection matters. Supply only the
candidate snapshot, plan, and evidence needed for an independent review.

## Execution profiles

| Profile         | Adapter   | Effective capabilities                       | Known restrictions                                      |
| --------------- | --------- | -------------------------------------------- | ------------------------------------------------------- |
| agy-read-review | `agy` CLI | repository-read and review analysis          | synchronous invocation; repository write is not assumed |
| agy-doc-draft   | `agy` CLI | documentation drafting within envelope paths | host write permission must be explicitly verified       |

If a required review capability is unavailable, report the gate blocked until
the human authorizes an equally independent replacement.
