import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRIVIAL_ALLOWLIST_PATH_RULES,
  TRIVIAL_CODE_FENCE_DELIMITER_PATTERN,
  TRIVIAL_COMMAND_REFERENCE_PATTERN,
  TRIVIAL_DENYLIST_PATH_RULES,
  TRIVIAL_GATE_IDS,
  TRIVIAL_NUMERIC_TABLE_ROW_PATTERN,
  TRIVIAL_PATH_REFERENCE_PATTERN,
  TRIVIAL_POLICY_ALLOWLIST_LITERALS,
  TRIVIAL_POLICY_DENYLIST_LITERALS,
  TRIVIAL_POLICY_SOURCE
} from '../../scripts/trivial-policy';
import { PROFILE_GATE_IDS } from '../../scripts/gates-manifest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

async function readTrivialPolicySection(): Promise<string> {
  const text = await readFile(
    path.join(REPO_ROOT, TRIVIAL_POLICY_SOURCE.file),
    'utf8'
  );
  const lines = text.split(/\r?\n/u);
  const start = lines.indexOf(TRIVIAL_POLICY_SOURCE.heading);

  if (start === -1) {
    throw new Error(
      `Heading not found in ${TRIVIAL_POLICY_SOURCE.file}: ${TRIVIAL_POLICY_SOURCE.heading}`
    );
  }

  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith('### ')
  );

  return lines
    .slice(start + 1, end === -1 ? lines.length : end)
    .join(' ')
    .replace(/\s+/gu, ' ');
}

describe('trivial-policy single source of truth', () => {
  it('keeps every denylist literal verbatim in the architecture TRIVIAL policy section', async () => {
    const section = await readTrivialPolicySection();

    for (const literal of TRIVIAL_POLICY_DENYLIST_LITERALS) {
      expect(section, `missing denylist literal: ${literal}`).toContain(
        literal
      );
    }
  });

  it('keeps every allowlist literal verbatim in the architecture TRIVIAL policy section', async () => {
    const section = await readTrivialPolicySection();

    for (const literal of TRIVIAL_POLICY_ALLOWLIST_LITERALS) {
      expect(section, `missing allowlist literal: ${literal}`).toContain(
        literal
      );
    }
  });

  it('maps every denylist path rule reason to a policy literal', () => {
    for (const rule of TRIVIAL_DENYLIST_PATH_RULES) {
      expect(
        TRIVIAL_POLICY_DENYLIST_LITERALS,
        `unmapped denylist reason: ${rule.reason}`
      ).toContain(rule.reason);
    }
  });
});

describe('trivial-policy path rules', () => {
  const denylistedSamples: Array<[string, string]> = [
    ['AGENTS.md', '`AGENTS.md`'],
    ['CLAUDE.md', '`CLAUDE.md`'],
    ['AI_WORKFLOW.md', '`AI_WORKFLOW.md`'],
    ['.claude/skills/feature-delivery/SKILL.md', 'workflow shims'],
    ['.codex/config.toml', 'workflow shims'],
    ['docs/architecture.md', '`docs/architecture.md`'],
    ['docs/architecture/AI_WORKFLOW_ARCHITECTURE.md', 'architecture'],
    ['docs/adr/0001-example.md', '`docs/adr/**`'],
    ['docs/roles/implementer.md', 'role contracts'],
    ['docs/CONTEXT_RULES.md', 'context rules'],
    ['docs/DOCUMENTATION_RULES.md', 'documentation rules'],
    ['docs/runbooks/claude-code.md', '`docs/runbooks/**`'],
    ['docs/PROJECT_CONTEXT.md', '`docs/PROJECT_CONTEXT.md`'],
    ['docs/plans/WORKFLOW-004C-Trivial-Tier-Token-Measurement.md', 'plans'],
    ['docs/handoffs/WORKFLOW-004B-implementation.md', 'handoffs'],
    ['docs/trace/trivial/20260719-abc.yaml', 'handoffs'],
    ['.github/workflows/ci.yml', 'CI'],
    ['scripts/gates.ts', 'scripts'],
    ['package.json', 'package files'],
    ['package-lock.json', 'package files'],
    ['src/App.tsx', 'application or test code'],
    ['tests/scripts/gates.test.ts', 'application or test code'],
    ['index.html', 'application or test code'],
    ['public/manifest.webmanifest', 'application or test code'],
    ['supabase/migrations/0001_init.sql', 'backend files'],
    ['tsconfig.json', 'build/test/lint configuration'],
    ['vite.config.ts', 'build/test/lint configuration'],
    ['playwright.config.ts', 'build/test/lint configuration'],
    ['content/units/unit-01.json', 'content schema/catalogue'],
    ['content/catalog.json', 'content schema/catalogue']
  ];

  it.each(denylistedSamples)(
    'denylists %s (%s)',
    (samplePath, expectedReason) => {
      const matched = TRIVIAL_DENYLIST_PATH_RULES.find((rule) =>
        rule.pattern.test(samplePath)
      );

      expect(
        matched,
        `expected a denylist match for ${samplePath}`
      ).toBeDefined();
      expect(matched?.reason).toBe(expectedReason);
    }
  );

  it('allowlists plain docs prose and root prose files only', () => {
    const allowlisted = (value: string): boolean =>
      TRIVIAL_ALLOWLIST_PATH_RULES.some((rule) => rule.pattern.test(value));

    expect(
      allowlisted('docs/measurements/WORKFLOW-004-token-baseline.md')
    ).toBe(true);
    expect(allowlisted('README.md')).toBe(true);
    expect(allowlisted('CHANGELOG.md')).toBe(true);
    expect(allowlisted('PROJECT_STORY.md')).toBe(true);
    expect(allowlisted('docs/guide.txt')).toBe(false);
    expect(allowlisted('docs/Guide.MD')).toBe(false);
    expect(allowlisted('readme.md')).toBe(false);
    expect(allowlisted('supabase/config.toml')).toBe(false);
  });
});

describe('trivial-policy content trigger patterns', () => {
  it('detects npm run command references', () => {
    expect(
      TRIVIAL_COMMAND_REFERENCE_PATTERN.test('run `npm run lint` now')
    ).toBe(true);
    expect(TRIVIAL_COMMAND_REFERENCE_PATTERN.test('plain prose line')).toBe(
      false
    );
  });

  it('detects repository path references', () => {
    expect(
      TRIVIAL_PATH_REFERENCE_PATTERN.test('see scripts/gates.ts for details')
    ).toBe(true);
    expect(
      TRIVIAL_PATH_REFERENCE_PATTERN.test('see docs/plans/WORKFLOW-004C.md')
    ).toBe(true);
    expect(TRIVIAL_PATH_REFERENCE_PATTERN.test('plain prose line')).toBe(false);
  });

  it('detects code fence delimiters and numeric table rows', () => {
    expect(TRIVIAL_CODE_FENCE_DELIMITER_PATTERN.test('```bash')).toBe(true);
    expect(TRIVIAL_NUMERIC_TABLE_ROW_PATTERN.test('| tokens | 1500 |')).toBe(
      true
    );
    expect(TRIVIAL_NUMERIC_TABLE_ROW_PATTERN.test('| name | value |')).toBe(
      false
    );
  });
});

describe('trivial gate selection', () => {
  it('matches the docs profile gates exactly', () => {
    expect([...TRIVIAL_GATE_IDS]).toEqual([...PROFILE_GATE_IDS.docs]);
  });
});
