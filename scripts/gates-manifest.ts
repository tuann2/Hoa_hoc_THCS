export const PROFILE_NAMES = ['web', 'browser', 'docs', 'full'] as const;

export type ProfileName = (typeof PROFILE_NAMES)[number];

export const GATE_IDS = [
  'git-diff-check',
  'format-check',
  'content-catalog',
  'content-validation',
  'lint',
  'typecheck',
  'unit-tests',
  'production-build',
  'bundle-check',
  'dependency-audit',
  'license-check',
  'docs-check',
  'e2e',
  'pwa',
  'pwa-subpath'
] as const;

export type GateId = (typeof GATE_IDS)[number];

export type GateDefinition = {
  id: GateId;
  command: readonly [string, ...string[]];
  prerequisites: readonly GateId[];
  profiles: readonly ProfileName[];
};

export type PathGateRule = {
  pattern: RegExp;
  gates: readonly GateId[];
  reason: string;
};

export const GATE_DEFINITIONS: Record<GateId, GateDefinition> = {
  'git-diff-check': {
    id: 'git-diff-check',
    command: ['git', 'diff', '--check'],
    prerequisites: [],
    profiles: ['web', 'docs', 'full']
  },
  'format-check': {
    id: 'format-check',
    command: ['npm', 'run', 'format:check'],
    prerequisites: [],
    profiles: ['web', 'docs', 'full']
  },
  'content-catalog': {
    id: 'content-catalog',
    command: ['npm', 'run', 'check:content-catalog'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  'content-validation': {
    id: 'content-validation',
    command: ['npm', 'run', 'validate-content'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  lint: {
    id: 'lint',
    command: ['npm', 'run', 'lint'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  typecheck: {
    id: 'typecheck',
    command: ['npm', 'run', 'typecheck'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  'unit-tests': {
    id: 'unit-tests',
    command: ['npm', 'test'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  'dependency-audit': {
    id: 'dependency-audit',
    command: ['npm', 'audit', '--audit-level=moderate'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  'license-check': {
    id: 'license-check',
    command: ['npm', 'run', 'check:licenses'],
    prerequisites: [],
    profiles: ['web', 'full']
  },
  'production-build': {
    id: 'production-build',
    command: ['npm', 'run', 'build:app'],
    prerequisites: ['content-validation', 'typecheck'],
    profiles: ['web', 'full']
  },
  'bundle-check': {
    id: 'bundle-check',
    command: ['npm', 'run', 'check:bundle'],
    prerequisites: ['production-build'],
    profiles: ['web', 'full']
  },
  e2e: {
    id: 'e2e',
    command: ['npm', 'run', 'test:e2e'],
    prerequisites: [],
    profiles: ['browser', 'full']
  },
  pwa: {
    id: 'pwa',
    command: ['npm', 'run', 'test:pwa'],
    prerequisites: [],
    profiles: ['browser', 'full']
  },
  'pwa-subpath': {
    id: 'pwa-subpath',
    command: ['npm', 'run', 'test:pwa:subpath'],
    prerequisites: [],
    profiles: ['browser', 'full']
  },
  'docs-check': {
    id: 'docs-check',
    command: ['npm', 'run', 'check:docs', '--', '--all'],
    prerequisites: [],
    profiles: ['docs', 'full']
  }
};

const WEB_PROFILE_GATE_IDS = [
  'git-diff-check',
  'format-check',
  'content-catalog',
  'content-validation',
  'lint',
  'typecheck',
  'unit-tests',
  'production-build',
  'bundle-check',
  'dependency-audit',
  'license-check'
] as const satisfies readonly GateId[];

// Browser gates assume the caller already prepared the dist/artifact input.
const BROWSER_PROFILE_GATE_IDS = [
  'e2e',
  'pwa',
  'pwa-subpath'
] as const satisfies readonly GateId[];

const DOCS_PROFILE_GATE_IDS = [
  'git-diff-check',
  'format-check',
  'docs-check'
] as const satisfies readonly GateId[];

const FULL_PROFILE_SEEN_GATES = new Set<GateId>([
  ...WEB_PROFILE_GATE_IDS,
  ...BROWSER_PROFILE_GATE_IDS
]);

const FULL_PROFILE_GATE_IDS = [
  ...WEB_PROFILE_GATE_IDS,
  ...BROWSER_PROFILE_GATE_IDS,
  ...DOCS_PROFILE_GATE_IDS.filter(
    (gateId) => !FULL_PROFILE_SEEN_GATES.has(gateId)
  )
] as const satisfies readonly GateId[];

export const PROFILE_GATE_IDS: Record<ProfileName, readonly GateId[]> = {
  web: WEB_PROFILE_GATE_IDS,
  browser: BROWSER_PROFILE_GATE_IDS,
  docs: DOCS_PROFILE_GATE_IDS,
  full: FULL_PROFILE_GATE_IDS
};

export const WEB_CLASSIFIER_GATES = PROFILE_GATE_IDS.web.filter(
  (gateId) => gateId !== 'git-diff-check' && gateId !== 'format-check'
);

const BROWSER_CLASSIFIER_GATES = [...PROFILE_GATE_IDS.browser];

const WEB_AND_BROWSER_CLASSIFIER_GATES = [
  ...WEB_CLASSIFIER_GATES,
  ...BROWSER_CLASSIFIER_GATES
] as const satisfies readonly GateId[];

export const PATH_GATE_RULES: readonly PathGateRule[] = [
  {
    pattern:
      /^(?:docs\/.*\.md|README\.md|AGENTS\.md|AI_WORKFLOW\.md|docs\/.*\.txt)$/u,
    gates: ['docs-check'],
    reason: 'documentation-only files'
  },
  {
    pattern: /^content\/catalog\.json$/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'generated catalog changes affect the web validation surface'
  },
  {
    pattern: /^content\//u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'content changes affect validation, tests, and build outputs'
  },
  {
    pattern: /^index\.html$/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'application shell changes affect the web build and bundle output'
  },
  {
    pattern: /^public\//u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'public asset changes affect the built web artifact'
  },
  {
    pattern: /^src\/vite-env\.d\.ts$/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'Vite environment typing affects the web build surface'
  },
  {
    pattern: /^src\//u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'application source changes require web validation'
  },
  {
    pattern:
      /^tests\/(?:components|lib|routes|setup\.ts|store\/|scripts\/(?:(?!gates-manifest|classify-change|check-docs|gates|evidence|classify-trivial|trace-trivial|trivial-policy)[A-Za-z0-9._-]+\.test\.ts)$)/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'application or supporting script tests require web validation'
  },
  {
    pattern: /^tests\/e2e\//u,
    gates: BROWSER_CLASSIFIER_GATES,
    reason: 'Playwright specs require the browser gate profile'
  },
  {
    pattern:
      /^scripts\/(?:validate-content|check-licenses|check-bundle-budget|generate-content-catalog|tag-question-category)\.ts$/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'runtime validation scripts require web validation'
  },
  {
    pattern: /^playwright(?:\.subpath)?\.config\.ts$/u,
    gates: WEB_AND_BROWSER_CLASSIFIER_GATES,
    reason:
      'Playwright configuration changes require the web and browser gate union'
  },
  {
    pattern:
      /^(?:scripts\/(?:gates-manifest|classify-change|check-docs|gates|evidence|classify-trivial|trace-trivial|trivial-policy)\.ts|tests\/scripts\/(?:gates-manifest|classify-change|check-docs|gates|evidence|classify-trivial|trace-trivial|trivial-policy)\.test\.ts|package\.json|package-lock\.json|tsconfig\.json|eslint\.config\.js|vite\.config\.ts|\.github\/workflows\/.*)$/u,
    gates: PROFILE_GATE_IDS.full,
    reason:
      'validation infrastructure or toolchain changes require the full local gate union'
  }
] as const;

export function isGateId(value: string): value is GateId {
  return GATE_IDS.includes(value as GateId);
}

export function isProfileName(value: string): value is ProfileName {
  return PROFILE_NAMES.includes(value as ProfileName);
}

export function getGateDefinition(gateId: GateId): GateDefinition {
  return GATE_DEFINITIONS[gateId];
}

export function getGateCommand(gateId: GateId): readonly [string, ...string[]] {
  return getGateDefinition(gateId).command;
}

export function getProfileGateIds(profile: ProfileName): readonly GateId[] {
  return PROFILE_GATE_IDS[profile];
}
