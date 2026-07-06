# Architecture

Living record of the technology stack and the rationale behind each
significant choice. Updated by Claude Code whenever a new plan
introduces a new dependency, service, or infra component — only after
the human has explicitly approved that choice (see `CLAUDE.md` §"New
technology adoption").

For the full context, alternatives, and trade-offs behind a decision,
see the linked ADR in `docs/adr/`.

## Current stack

| Layer       | Technology                       | Since                    | Rationale (short)                                                                                                                                                         | ADR |
| ----------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Build/dev   | Vite                             | project start            | Fast dev server, native ESM, minimal config for a static SPA                                                                                                              | —   |
| UI          | React + TypeScript               | project start            | Component model fits card/quiz UI; TS catches content-shape errors at compile time                                                                                        | —   |
| Styling     | Tailwind CSS                     | project start            | Utility-first, fast iteration for mobile-first layouts                                                                                                                    | —   |
| Content     | JSON under `content/units/`      | project start            | No backend needed; content is data, versionable in Git, validated by script                                                                                               | —   |
| Hosting     | GitHub Pages (static)            | project start            | Free, zero-ops for a static SPA                                                                                                                                           | —   |
| Auth + sync | Supabase (Auth + Postgres + RLS) | FEATURE-006 (2026-07-06) | Free tier covers email+password auth and small JSON progress storage; official SDK avoids hand-rolled auth code; RLS enforces per-user isolation without a custom backend | —   |

## How to update this file

1. Add or update the row for the layer/technology affected.
2. Keep "Rationale" to one sentence — the full reasoning belongs in the
   plan (`docs/plans/<FEATURE-ID>.md`) and, for non-trivial decisions,
   in an ADR (`docs/adr/NNNN-<slug>.md`) linked from the table.
3. Never edit this file to reflect a technology choice that has not
   been explicitly approved by the human.
