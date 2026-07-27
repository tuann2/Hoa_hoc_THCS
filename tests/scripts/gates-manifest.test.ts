import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  PATH_GATE_RULES,
  PROFILE_GATE_IDS,
  getGateCommand,
  getGateDefinition
} from '../../scripts/gates-manifest';

function getFirstMatchingRule(path: string) {
  return PATH_GATE_RULES.find((rule) => rule.pattern.test(path));
}

describe('gates-manifest', () => {
  it('maps TRIVIAL enforcement scripts and tests to the full profile', () => {
    const samples = [
      'scripts/classify-trivial.ts',
      'scripts/trace-trivial.ts',
      'scripts/trivial-policy.ts',
      'tests/scripts/classify-trivial.test.ts',
      'tests/scripts/trace-trivial.test.ts',
      'tests/scripts/trivial-policy.test.ts'
    ];

    for (const sample of samples) {
      const rule = PATH_GATE_RULES.find((candidate) =>
        candidate.pattern.test(sample)
      );

      expect(rule?.gates, sample).toEqual(PROFILE_GATE_IDS.full);
    }
  });

  it('maps docs-only markdown files to docs-check', () => {
    const docsRule = PATH_GATE_RULES.find((rule) =>
      rule.pattern.test('docs/plans/WORKFLOW-004A-Gates-Evidence-Deployment.md')
    );

    expect(docsRule?.gates).toEqual(['docs-check']);
  });

  it('maps application source changes to web validation gates', () => {
    const sourceRule = PATH_GATE_RULES.find((rule) =>
      rule.pattern.test('src/App.tsx')
    );

    expect(sourceRule?.gates).toEqual(
      PROFILE_GATE_IDS.web.filter(
        (gateId) => gateId !== 'git-diff-check' && gateId !== 'format-check'
      )
    );
  });

  it('maps Playwright specs to the browser profile gates', () => {
    const e2eRule = PATH_GATE_RULES.find((rule) =>
      rule.pattern.test('tests/e2e/app-shell.spec.ts')
    );

    expect(e2eRule?.gates).toEqual(PROFILE_GATE_IDS.browser);
  });

  it('maps non-infrastructure script tests to the web validation union', () => {
    const scriptTestRule = PATH_GATE_RULES.find((rule) =>
      rule.pattern.test('tests/scripts/tag-question-category.test.ts')
    );

    expect(scriptTestRule?.gates).toEqual(
      PROFILE_GATE_IDS.web.filter(
        (gateId) => gateId !== 'git-diff-check' && gateId !== 'format-check'
      )
    );
  });

  it('classifies every tracked file with an explicit PATH_GATE_RULES rule', () => {
    const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
      encoding: 'buffer'
    })
      .toString('utf8')
      .split('\0')
      .filter(Boolean);
    const unmatchedFiles = trackedFiles.filter(
      (path) => !getFirstMatchingRule(path)
    );

    expect(
      unmatchedFiles,
      `Tracked files without PATH_GATE_RULES classification; write an explicit PATH_GATE_RULES rule for:\n${unmatchedFiles.join('\n')}`
    ).toEqual([]);
  });

  it('maps explicit full-profile paths to the full profile', () => {
    const samples = [
      'supabase/migrations/20260727000000_example.sql',
      'docs/security/audit-allowlist.json',
      'scripts/cli.ts',
      'tests/security/admin-migration.test.ts',
      'CLAUDE.md',
      '.claude/skills/feature-delivery/SKILL.md'
    ];

    for (const sample of samples) {
      expect(getFirstMatchingRule(sample)?.gates, sample).toEqual(
        PROFILE_GATE_IDS.full
      );
    }
  });

  it('maps explicit application test paths to the web profile', () => {
    for (const sample of [
      'tests/hooks/use-example.test.ts',
      'tests/fixtures/check-licenses/example.json'
    ]) {
      expect(getFirstMatchingRule(sample)?.gates, sample).toEqual(
        PROFILE_GATE_IDS.web.filter(
          (gateId) => gateId !== 'git-diff-check' && gateId !== 'format-check'
        )
      );
    }
  });

  it('maps approved historical records to the docs profile', () => {
    for (const sample of ['CHANGELOG.md', 'PROJECT_STORY.md']) {
      expect(getFirstMatchingRule(sample)?.gates, sample).toEqual([
        'docs-check'
      ]);
    }
  });

  it('uses the first matching rule for every explicit coverage regex', () => {
    const expectedRules = [
      {
        path: 'scripts/cli.ts',
        reason:
          'explicit elevated-risk and toolchain paths retain the full profile'
      },
      {
        path: 'tests/hooks/use-example.test.ts',
        reason:
          'application and supporting-script test fixtures require web validation'
      },
      {
        path: 'CHANGELOG.md',
        reason: 'approved historical records require documentation validation'
      }
    ];

    for (const { path, reason } of expectedRules) {
      const firstMatch = getFirstMatchingRule(path);

      expect(firstMatch?.reason, path).toBe(reason);
      expect(PATH_GATE_RULES.filter((rule) => rule.pattern.test(path))[0]).toBe(
        firstMatch
      );
    }
  });

  it('keeps the browser profile aligned with CI browser job order', () => {
    expect(PROFILE_GATE_IDS.browser).toEqual(['e2e', 'pwa', 'pwa-subpath']);
  });

  it('runs docs-check deterministically against the full docs set', () => {
    expect(getGateCommand('docs-check')).toEqual([
      'npm',
      'run',
      'check:docs',
      '--',
      '--all'
    ]);
  });

  it('pins production-build to build:app instead of aggregate build', () => {
    expect(getGateCommand('production-build')).toEqual([
      'npm',
      'run',
      'build:app'
    ]);
  });

  it('runs bundle-check after production-build', () => {
    expect(getGateCommand('bundle-check')).toEqual([
      'npm',
      'run',
      'check:bundle'
    ]);
    expect(getGateDefinition('bundle-check').prerequisites).toEqual([
      'production-build'
    ]);
  });
});
