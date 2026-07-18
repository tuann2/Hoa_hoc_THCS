# Claude Code Provider Runbook

This runbook describes current adapter mechanics, not governance policy. Read
the execution envelope and role contract before acting.

## Invocation

Start a session in the target repository. For delegated work, pass the envelope,
approved plan, allowed paths, action-safety constraints, and the provider
profile that supplies the role's required capabilities. Use separate fresh
sessions for independent review; do not pass the implementer transcript.

## Execution profiles

| Profile            | Adapter                | Effective capabilities                                          | Known restrictions                                  |
| ------------------ | ---------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| claude-interactive | CLI or IDE session     | repository access and orchestration as granted by host/envelope | host permissions vary; verify before assigning work |
| claude-delegated   | subagent orchestration | capabilities of the selected delegated adapter profile          | must not imply the host's permissions               |

When host or adapter capabilities are unclear, use read-only inspection and
escalate. Provider identity never substitutes for the envelope.
