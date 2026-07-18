# Repository Instructions

This repository has a governed AI workflow. Its source of truth is
`docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`; read it in full for
ELEVATED/CRITICAL work, when the envelope requires it, or when a conflict arises.

1. Act only under an execution envelope. Without one, stay read-only: do not
   edit files or assume a role.
2. Read the contract for `assigned_role` in `docs/roles/<role>.md`.
3. Before editing, read `docs/CONTEXT_RULES.md`; determine gates with
   `npm run gates -- --changed-from=<base_sha>` and generate evidence with
   `npm run evidence`.
4. Follow the approved plan and envelope scope. Escalate ambiguity, conflict,
   missing capability, or a higher effective risk tier.
5. `validate-content` is authoritative for machine-checkable
   structure/catalogue invariants. Chemistry correctness, answer quality, and
   pedagogy still require intentional review.
6. Never commit, push, merge, deploy, edit outside `allowed_paths`, or disable
   or alter a gate unless the envelope explicitly permits the action.

When the architecture is DRAFT, its new rules await human approval; follow the
currently approved architecture where they conflict.
