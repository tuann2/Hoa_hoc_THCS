# WORKFLOW-003 — Amend AI Workflow Architecture (Token-Cost Corrections)

## Metadata

- Status: APPROVED
- Owner: Human Project Owner
- Author: Claude (Architect)
- Architecture source: `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`
  (v2.1 → v2.2)
- Follows: `docs/plans/WORKFLOW-002-Claude-Optimization.md`
- Origin: full-corpus workflow review, session 2026-07-12 (findings
  also recorded in project memory `workflow-audit-2026-07-12`)

---

## 1. Objective

Amend the approved architecture and its implementation documents to:

1. remove an unimplementable evidence requirement (tree-SHA);
2. fix an internal contradiction about post-validation documentation
   changes (the biggest recurring token drain);
3. cut the fixed per-session token overhead of the instruction corpus;
4. replace unmeasurable success metrics with countable ones and close
   WORKFLOW-002's Phase 3 obligation;
5. codify the FEATURE-012 "reviewer applies fixes" batch-content review
   variant so approved practice and the spec no longer drift.

This plan changes workflow governance documents only. It does not
change application source, content, tests, dependencies, CI/CD or any
runtime file.

---

## 2. Background

The v2.1 architecture (WORKFLOW-002, merged `eefa1db`) is directionally
sound and has been followed in practice through FEATURE-011 and
FEATURE-012. A full review of the six-document corpus (~1,400 lines)
found that several mechanisms cost more tokens than the duplication
they were designed to remove, one requirement has never been
implementable, and two documents state opposite rules for the same
case. Details per amendment below.

---

## 3. Risk classification

- Risk tier: `CRITICAL`
- Applicable categories: architecture change (the Risk Model's
  `CRITICAL` examples list "architecture changes"; design principle 10
  requires human approval for them). Only workflow governance
  documents are touched — no production data, deployment,
  infrastructure, payment, credential or auth surface.
- Escalation rationale: WORKFLOW-002 classified its migration as
  `NORMAL`, but that plan implemented an architecture the human had
  just approved; this plan changes the approved architecture's rules
  themselves. Per Risk Model rule 6, the ambiguity resolves upward to
  `CRITICAL`.
- Required independent verification (`CRITICAL` row): fresh Gemini
  review + separate fresh Codex adversarial review of the amended
  documents; CI on the exact candidate commit.
- Human plan approval also approves this classification.

---

## 4. Amendments

### A1 — Evidence binding: commit-bound evidence replaces tree-SHA

**Current:** the Validation Model requires a "validated
implementation-tree SHA" produced by a canonical evidence command, and
requires reviewers to be able to recompute it from base, dirty paths
and exclusions.

**Problem:** the canonical command has never existed (flagged as a
known limitation in the WORKFLOW-002 handoff §9 and still open two
features later). FEATURE-012's handoff fills the field with a commit
SHA — the wrong object type — and no reviewer has ever recomputed a
tree hash. The requirement produces bookkeeping, not assurance.

**Change:** delete the tree-SHA and recompute requirements. Evidence
binding becomes:

- once a candidate commit exists and the worktree is clean: candidate
  commit SHA, plus a CI run reference for that exact SHA when CI is
  required or available for the effective risk tier;
- whenever the worktree is dirty (with or without a candidate commit
  yet): the base/candidate commit SHA, the exact dirty paths, and the
  output of `git add -A && git stash create` run against that worktree
  — a real, already-available git command pair that binds the exact
  dirty content (plain `git stash create` alone silently omits
  untracked files, so `git add -A` first is required; see the
  remediation record below for how this was tightened after both
  independent reviews);
- reviews and verification SHOULD run against a candidate commit;
  committing to the feature branch before review is the normal path.

Timestamps, tool versions/lockfile SHA, and the per-command exit-status
table remain required.

**Remediation note:** the first remediation round (commit `cff1468`)
added `git stash create` for dirty-state content binding, in response
to both independent reviews finding that "base SHA + dirty paths" alone
does not bind exact content. A second review round then found that
plain `git stash create` silently omits untracked files and that this
plan's own A1 description text (this section) still said only "base
SHA + dirty-path list", contradicting the updated architecture — both
fixed by verifying `git stash create`'s actual behavior in a scratch
repo (see the implementation handoff) and updating this section to
match.

**Files:** architecture (Evidence Binding), `docs/handoffs/_TEMPLATE.md`
(§3), `AGENTS.md` (Required validation).

**Side effect:** closes audit gap 3 by removing the requirement instead
of building tooling for it.

### A2 — Remediation scope: docs-only changes keep engineering evidence

**Current:** remediation rule 3 says any post-validation change to a
release-affecting file _including documentation_ invalidates all
validation and review evidence, and rule 4 then requires repeating
every tier-required review. The `feature-delivery` skill repeats this.
`docs/DOCUMENTATION_RULES.md` states the opposite (revalidation scoped
to the changed doc files; code gates not rerun). Three documents, two
rules — and the strict reading forces a full Gemini + Codex re-review
of a `CRITICAL` feature after a one-line README edit.

**Change:** amend rule 3 so that only changes to
**release-artifact-affecting files** (application source, tests,
`content/`, runtime/toolchain configuration, dependencies, migrations,
infrastructure/deployment files) invalidate engineering validation and
tier reviews. Documentation-only post-validation changes require only
the "Documentation only" gates on the changed files, recorded in the
handoff.

**Deviation recorded during remediation:** this plan originally assumed
`DOCUMENTATION_RULES.md` already stated the target rule and would not
need to change. Both independent reviews (Gemini and Codex adversarial)
independently found that assumption wrong: the file's literal opening
sentence ("writing or editing them after the implementation snapshot
was validated invalidates that snapshot's prior validation and review
evidence, exactly like any other post-validation change") directly
contradicts the amended architecture. `docs/DOCUMENTATION_RULES.md` was
therefore also amended (its opening paragraph only) to state the same
rule as the architecture — it is documentation Claude may edit directly
per `CLAUDE.md`.

**Files:** architecture (Remediation State Machine),
`.claude/skills/feature-delivery/SKILL.md` (Remediation + Documentation
sections), `docs/DOCUMENTATION_RULES.md` (deviation — see above),
`CLAUDE.md` and `AGENTS.md` (release-artifact list + A5 pointer, added
during remediation).

### A3 — Condense the instruction corpus (editorial; no rule change)

**Current:** the architecture is 715 lines and is designated reading
for both Claude and Codex; `CLAUDE.md` (204 lines) loads every
session. The three per-tier workflow diagrams (~100 lines, one word
per line) differ only in the review step; Trust Model, Independent
Verification, Claude Gates and the Validation Model restate each
other; risk-tier examples are duplicated verbatim in `CLAUDE.md`.

**Change:** condense the architecture to ≤450 lines — merge the three
tier diagrams into one table, deduplicate restated rules (each rule
stated exactly once, cross-referenced elsewhere). Remove from
`CLAUDE.md` content duplicated verbatim from the architecture
(risk-tier example lists), leaving a pointer.

**Constraint:** A3 is semantics-preserving. Every rule that survives
A1/A2/A5 must remain stated once; nothing is deleted as "duplicate"
unless its normative content survives elsewhere.

**Files:** architecture (whole document), `CLAUDE.md`.

### A4 — Measurable success metrics; close Phase 3

**Current:** targets like "Agent usage <25%" and "average context
<60k" have no measurement instrument in this repository, and the
baseline figures (52% / 75% / 64%) are unsourced. WORKFLOW-002's
Phase 3 dry-run has therefore never been executable as specified.

**Change:** replace the Success Metrics section with counts derivable
from existing artifacts (git history + handoffs):

- Codex implementation executions per feature (target: 1 for `NORMAL`);
- Claude sessions per feature (target: ≤2 for `NORMAL`);
- validation reruns by Claude of already-passed gates (target: 0);
- review/remediation rounds per feature;
- wall-clock from plan approval to `RELEASE_READY`.

Record a retrospective baseline measured from the FEATURE-011 and
FEATURE-012 artifacts, then declare WORKFLOW-002 Phase 3 closed by
this measurement.

**Files:** architecture (Success Metrics).

### A5 — Codify the batch-content review variant

**Current:** the architecture states "reviewers MUST report findings
rather than silently modify the candidate" with no exceptions. On
FEATURE-012 Phase B the human explicitly directed a different mode
(consolidated findings file; the reviewing execution also applies the
fixes; per-unit commits), recorded only in `docs/plans/FEATURE-012.md`
("Workflow revision 2026-07-12"). Practice and spec have drifted.

**Change:** add an explicit, bounded exception to Independent
Verification: for `NORMAL`-tier learning-content batch review, the
human may authorize a **reviewer-applies-fixes** mode in the plan or
by direct instruction. Conditions: findings are still recorded
(consolidated file or commit messages); numeric/chemistry corrections
still require independent re-verification of the fixed values; the
mode never applies to `ELEVATED`/`CRITICAL` work. Reference the
FEATURE-012 precedent.

**Files:** architecture (Independent Verification), `AI_WORKFLOW.md`
(Independent review per risk tier).

---

## 5. Out of scope

- `ci.yml` / `deploy.yml` fixes (audit gaps 1–2: missing
  `format:check` in CI; deploy runs without lint/test). Infrastructure
  change — separate plan, delegated to Codex.
- Any change to `src/`, `content/`, tests or dependencies.
- Historical documents (`WORKFLOW-002` plan/handoff, past feature
  handoffs) are not rewritten; they remain accurate for their time.

---

## 6. Implementation constraints

- All touched files are in `CLAUDE.md`'s "What Claude may edit
  directly" list → Claude edits directly and therefore runs the
  applicable canonical gates itself (WORKFLOW-002 Phase 2 precedent).
- Work on branch `feature/WORKFLOW-003`; never on `main`.
- Architecture version bumps v2.1 → v2.2 with a short amendment
  changelog at the top of the document; `Status: APPROVED` is set only
  by the human's approval of this plan plus review completion.
- No rule outside A1–A5 changes semantically.

---

## 7. Validation procedure

Documentation-only change type per the quality-gates table:

```bash
git diff --check
npm run format:check
```

plus verification that every command, path and cross-reference cited
in the amended documents exists in the repository. Evidence recorded in
`docs/handoffs/WORKFLOW-003-implementation.md` under the amended (A1)
evidence rules: candidate commit SHA + CI run for that SHA.

---

## 8. Independent verification (CRITICAL tier)

- **Fresh Gemini review** (`agy`, synchronous): check the amended
  corpus for internal contradictions, unimplementable requirements and
  semantic loss from the A3 condensation.
- **Fresh Codex adversarial review**: attempt to find loopholes the
  amendments introduce (e.g. a change class that now escapes
  remediation, or an evidence path that can no longer be verified).
- **CI** on the exact candidate commit (runs on `feature/**` push).
- Findings route through the remediation state machine; both reviews
  repeat after any remediation of the amended documents.

---

## 9. Acceptance criteria

- [x] All five amendments applied; architecture reads v2.2.
- [x] The tree-SHA class of evidence requirement is gone (A1) and
      replaced with commit-bound evidence plus `git stash create` for
      dirty-content binding. This criterion is scoped to that specific
      requirement class — it does not claim every gate in the
      pre-existing Canonical Quality Gates table has a repository
      command (e.g. the "Documentation only" link/path-check gate and
      the dependency/security/infra gates lacked commands before this
      plan and still do; unchanged, tracked as a follow-up, not a
      regression introduced here).
- [x] Architecture, `feature-delivery` skill, `CLAUDE.md`, `AGENTS.md`
      and `DOCUMENTATION_RULES.md` state the same rule for
      post-validation documentation changes (fixed in remediation after
      both independent reviews found the original edit left
      `DOCUMENTATION_RULES.md`'s literal wording contradicting the new
      rule).
- [ ] Architecture ≤450 lines; `CLAUDE.md` deduplicated; Gemini review
      confirms no semantic loss from condensation. **Not met on line
      count** (570 lines after remediation, was 715): the plan's own
      A3 constraint deprioritizes the exact number below correctness
      once content in the "do not touch" list (Responsibility Matrix,
      Trust Model, Risk Model, Claude Gates, Canonical Quality Gates,
      Context Budget, Design Principles) is preserved — condensing
      those further to hit ≤450 was out of this plan's approved scope.
      No dropped normative rule was found by either independent review.
- [x] New Success Metrics recorded with FEATURE-011/012 retrospective
      baseline; WORKFLOW-002 Phase 3 marked closed.
- [x] Batch-content review variant documented with conditions, the
      required authorization-source record, and the FEATURE-012
      precedent reference.
- [x] Baseline gates pass; Gemini + Codex adversarial reviews complete
      with all findings dispositioned; CI green on the candidate
      commit.
- [ ] Human approves release (merge).

---

## 10. Rollback

`git revert` of the amendment commit(s) on the feature branch, or
revert the merge commit on `main`. Documentation-only — no data or
runtime risk.
