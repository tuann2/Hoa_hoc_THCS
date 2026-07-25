# Documentation Drafting Rules

This contract applies to an execution assigned documentation drafting. It
supplements the assigned role contract and execution envelope; it does not
replace the approved workflow architecture.

## Preconditions and scope

Documentation starts only after the applicable implementation, validation,
handoff, and scope check exist, unless the approved plan explicitly makes
documentation the implementation itself. The envelope controls writable paths.
Do not edit application source, tests, content units, dependency files, runtime
configuration, or any path outside the envelope.

## Documentation revalidation

A documentation-only change after validated code does not invalidate prior
engineering validation or completed tier reviews. It must still run the
documentation profile selected by `scripts/gates-manifest.ts`, validate changed
links, paths, and documented commands, and record the scoped result in the
handoff. A failed scoped gate returns the documentation fix to remediation.
A release-artifact-affecting change follows the full remediation path.

## Writing rules

- Document actual implemented behavior, not plans or intentions.
- Verify paths and commands against the repository; state prerequisites,
  failure modes, and rollback where useful.
- Use complete runnable examples and never include real secrets, tokens, or
  credentials.
- Keep terminology consistent with the application: bài học, thẻ lý thuyết,
  câu hỏi. Mark destructive commands clearly and distinguish required from
  optional configuration.
- Update README, changelog, API docs, runbooks, and ADRs only when applicable
  to the approved scope.
