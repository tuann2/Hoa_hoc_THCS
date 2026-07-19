# Project Context

**Hoá học THCS** is a mobile-first, Duolingo-style web application for
Vietnamese lower-secondary students (grades 8–9, including advanced tracks)
to study Chemistry through theory cards, interactive quizzes, equation
balancing, and progress tracking. User-facing content is Vietnamese and
follows the Vietnamese THCS Chemistry curriculum.

## Technology and content

- Vite, React, TypeScript, and Tailwind power the static web application.
- Learning content is JSON under `content/units/`; the catalog is generated
  from those units.
- Supabase supports optional authentication and progress synchronisation; the
  app remains usable in local-only mode when its environment is absent.
- PWA support supplies same-origin offline learning after the initial online
  load. See [the architecture record](architecture.md) for the approved stack
  and [ADRs](adr/) for decisions.

## Content authoring rules

- A lesson has 1–25 theory cards according to its length and topics; split an
  independent advanced topic into its own card instead of appending it to a
  basic card.
- A lesson normally has 13 questions: 5 `basic`, 5 `applied`, and 3 `hsg`.
- HSG questions use the source: `Tự biên soạn theo dạng bài quen thuộc trong
đề thi HSG Hoá 9 cấp huyện/tỉnh`.
- Independently re-solve every numeric problem before submission. Use plain
  chemistry text such as `CH2=CH2` and `CH≡CH`, not LaTeX.
- Every question has `category: theory | calculation`. Qualitative questions,
  reaction chains, and all `balance` questions are `theory`; numerical mol,
  mass, volume, concentration, and yield problems are `calculation`.
- `scripts/tag-question-category.ts` may suggest a category for new questions,
  but the author re-checks each suggestion manually before commit. A human
  content review remains the separate final authority.

`npm run validate-content` is authoritative for machine-checkable schema,
catalogue, and equation-balance invariants. It does not replace intentional
review of chemistry correctness, answer quality, or pedagogy.
