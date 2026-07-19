import {
  DOCUMENT_REFERENCE_PATTERN,
  SCRIPT_REFERENCE_PATTERN
} from './check-docs';
import type { GateId } from './gates-manifest';

export type TrivialPathRule = {
  pattern: RegExp;
  reason: string;
};

// Verbatim substrings from the "### TRIVIAL policy" section of
// docs/architecture/AI_WORKFLOW_ARCHITECTURE.md (v2.4). The test suite
// asserts each literal appears in that section, so policy drift between the
// architecture prose and this module fails loudly instead of silently.
export const TRIVIAL_POLICY_SOURCE = {
  file: 'docs/architecture/AI_WORKFLOW_ARCHITECTURE.md',
  heading: '### TRIVIAL policy'
} as const;

export const TRIVIAL_POLICY_DENYLIST_LITERALS = [
  '`AGENTS.md`',
  '`CLAUDE.md`',
  '`AI_WORKFLOW.md`',
  'workflow shims',
  'architecture',
  '`docs/architecture.md`',
  '`docs/adr/**`',
  'role contracts',
  'context rules',
  'documentation rules',
  '`docs/runbooks/**`',
  '`docs/PROJECT_CONTEXT.md`',
  'plans',
  'handoffs',
  'CI',
  'scripts',
  'package files',
  'application or test code',
  'backend files',
  'build/test/lint configuration',
  'content schema/catalogue'
] as const;

export const TRIVIAL_POLICY_ALLOWLIST_LITERALS = [
  'non-governance prose',
  'typo/format fixes',
  'Content units remain NORMAL initially'
] as const;

type DenylistReason = (typeof TRIVIAL_POLICY_DENYLIST_LITERALS)[number];

const denyRule = (
  pattern: RegExp,
  reason: DenylistReason
): TrivialPathRule => ({
  pattern,
  reason
});

export const TRIVIAL_DENYLIST_PATH_RULES: readonly TrivialPathRule[] = [
  denyRule(/^AGENTS\.md$/u, '`AGENTS.md`'),
  denyRule(/^CLAUDE\.md$/u, '`CLAUDE.md`'),
  denyRule(/^AI_WORKFLOW\.md$/u, '`AI_WORKFLOW.md`'),
  denyRule(/^\.claude\//u, 'workflow shims'),
  denyRule(/^\.codex\//u, 'workflow shims'),
  denyRule(/^\.agents\//u, 'workflow shims'),
  denyRule(/^docs\/architecture\.md$/u, '`docs/architecture.md`'),
  denyRule(/^docs\/architecture\//u, 'architecture'),
  denyRule(/^docs\/adr\//u, '`docs/adr/**`'),
  denyRule(/^docs\/roles\//u, 'role contracts'),
  denyRule(/^docs\/CONTEXT_RULES\.md$/u, 'context rules'),
  denyRule(/^docs\/DOCUMENTATION_RULES\.md$/u, 'documentation rules'),
  denyRule(/^docs\/runbooks\//u, '`docs/runbooks/**`'),
  denyRule(/^docs\/PROJECT_CONTEXT\.md$/u, '`docs/PROJECT_CONTEXT.md`'),
  denyRule(/^docs\/plans\//u, 'plans'),
  denyRule(/^docs\/handoffs\//u, 'handoffs'),
  denyRule(/^docs\/trace\//u, 'handoffs'),
  denyRule(/^\.github\//u, 'CI'),
  denyRule(/^scripts\//u, 'scripts'),
  denyRule(/^(?:package\.json|package-lock\.json)$/u, 'package files'),
  denyRule(/^(?:src|tests)\//u, 'application or test code'),
  denyRule(/^(?:index\.html|public\/)/u, 'application or test code'),
  denyRule(/^supabase\//u, 'backend files'),
  denyRule(
    /^(?:tsconfig\.json|eslint\.config\.js|vite\.config\.ts|postcss\.config\.js|tailwind\.config\.js|playwright(?:\.subpath)?\.config\.ts|\.prettierrc\.json|\.env\.example|\.gitignore)$/u,
    'build/test/lint configuration'
  ),
  denyRule(/^content\//u, 'content schema/catalogue')
] as const;

// Positive allowlist: TRIVIAL requires an exact, case-sensitive match here.
// This — not the denylist — is the fail-closed backstop: any path that does
// not positively match escalates.
export const TRIVIAL_ALLOWLIST_PATH_RULES: readonly TrivialPathRule[] = [
  {
    pattern: /^docs\/[A-Za-z0-9._/-]+\.md$/u,
    reason: 'non-governance prose documentation (docs/**/*.md)'
  },
  {
    pattern: /^(?:README|CHANGELOG|PROJECT_STORY)\.md$/u,
    reason: 'non-governance prose documentation (root prose files)'
  }
] as const;

// Hard content triggers (machine-checkable subset of the Context Policy hard
// triggers). Command and repository-path references reuse the exact
// definitions from check-docs.ts so they are defined once repo-wide. The
// non-global copies below are for safe `.test()` use (the originals carry the
// /g flag, which makes `.test()` stateful).
export const TRIVIAL_COMMAND_REFERENCE_PATTERN = new RegExp(
  SCRIPT_REFERENCE_PATTERN.source,
  'iu'
);
export const TRIVIAL_PATH_REFERENCE_PATTERN = new RegExp(
  DOCUMENT_REFERENCE_PATTERN.source,
  'u'
);
export const TRIVIAL_CODE_FENCE_DELIMITER_PATTERN = /(?:```|~~~)/u;
export const TRIVIAL_NUMERIC_TABLE_ROW_PATTERN = /^\s*\|.*\d/u;

export const TRIVIAL_GATE_IDS = [
  'git-diff-check',
  'format-check',
  'docs-check'
] as const satisfies readonly GateId[];
