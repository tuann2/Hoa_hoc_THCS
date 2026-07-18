export const PROFILE_NAMES = ['web', 'browser', 'docs', 'full'] as const;

export type ProfileName = (typeof PROFILE_NAMES)[number];

export const GATE_IDS = [
  'git-diff-check',
  'format-check',
  'content-validation',
  'lint',
  'typecheck',
  'unit-tests',
  'dependency-audit',
  'license-check',
  'production-build',
  'docs-check'
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
  'docs-check': {
    id: 'docs-check',
    command: ['npm', 'run', 'check:docs'],
    prerequisites: [],
    profiles: ['docs', 'full']
  }
};

export const PROFILE_GATE_IDS: Record<ProfileName, readonly GateId[]> = {
  web: [
    'git-diff-check',
    'format-check',
    'content-validation',
    'lint',
    'typecheck',
    'unit-tests',
    'dependency-audit',
    'license-check',
    'production-build'
  ],
  browser: [],
  docs: ['git-diff-check', 'format-check', 'docs-check'],
  full: [
    'git-diff-check',
    'format-check',
    'content-validation',
    'lint',
    'typecheck',
    'unit-tests',
    'dependency-audit',
    'license-check',
    'production-build',
    'docs-check'
  ]
};

export const WEB_CLASSIFIER_GATES = PROFILE_GATE_IDS.web.filter(
  (gateId) => gateId !== 'git-diff-check' && gateId !== 'format-check'
);

export const PATH_GATE_RULES: readonly PathGateRule[] = [
  {
    pattern:
      /^(?:docs\/.*\.md|README\.md|AGENTS\.md|AI_WORKFLOW\.md|docs\/.*\.txt)$/u,
    gates: ['docs-check'],
    reason: 'documentation-only files'
  },
  {
    pattern: /^content\//u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'content changes affect validation, tests, and build outputs'
  },
  {
    pattern: /^src\//u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'application source changes require web validation'
  },
  {
    pattern:
      /^tests\/(?:components|lib|routes|setup\.ts|store\/|scripts\/(?:validate-content|check-licenses)\.test\.ts$)/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'application or supporting script tests require web validation'
  },
  {
    pattern:
      /^scripts\/(?:validate-content|check-licenses|tag-question-category)\.ts$/u,
    gates: WEB_CLASSIFIER_GATES,
    reason: 'runtime validation scripts require web validation'
  },
  {
    pattern:
      /^(?:scripts\/(?:gates-manifest|classify-change|check-docs|gates|evidence)\.ts|tests\/scripts\/(?:gates-manifest|classify-change|check-docs|gates|evidence)\.test\.ts|package\.json|package-lock\.json|tsconfig\.json|eslint\.config\.js|vite\.config\.ts|\.github\/workflows\/.*)$/u,
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
