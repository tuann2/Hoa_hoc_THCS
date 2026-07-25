import { describe, expect, it } from 'vitest';
import {
  PATH_GATE_RULES,
  PROFILE_GATE_IDS,
  getGateCommand,
  getGateDefinition
} from '../../scripts/gates-manifest';

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
