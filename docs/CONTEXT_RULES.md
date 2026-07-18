# Context Rules

Start with `AGENTS.md`, the execution envelope, the assigned role contract,
and the approved plan where a plan is required. Retrieve additional context by
the task domain below; this is progressive disclosure, not a limit on safe
escalation.

| Task touches                   | Must read                                                                                           | Do not read by default                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Chemistry content (one unit)   | shim, plan, content schema/rules, target unit, validator output, target tests, `PROJECT_CONTEXT.md` | other units; full workflow architecture |
| UI/React/PWA                   | shim, plan, `docs/architecture.md`, target component/store, relevant Vite/PWA config and tests      | governance beyond the shim              |
| Supabase/auth/sync             | shim, plan, architecture and relevant ADR, migration/schema, auth/progress code, RLS constraints    | —; this is CRITICAL                     |
| CI/deploy/scripts/dependencies | shim, plan, relevant YAML, gate manifest/runner, package files and lockfile when relevant           | —; control changes are CRITICAL         |
| Governance/architecture        | shim, full workflow architecture, relevant role contracts, migration history                        | —; this is CRITICAL                     |
| Read-only question             | shim and the file or topic asked about                                                              | everything else                         |

## Hard triggers

Regardless of path count, read the full workflow architecture and escalate
context and risk for: policy or governance changes; CI or deployment;
dependencies or lockfiles; security, authentication, or RLS; schema or
migration; runtime behavior; test expectations; public APIs; educational
formulas, answers, or numeric values; and adding, removing, or renaming files.

Ambiguity or conflict always permits escalation: read more context and/or stop
for the owner. Context budgets are not hard caps for ELEVATED or CRITICAL work.
