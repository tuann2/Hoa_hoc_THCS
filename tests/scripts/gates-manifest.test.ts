import { describe, expect, it } from 'vitest';
import {
  PATH_GATE_RULES,
  PROFILE_GATE_IDS,
  getGateCommand
} from '../../scripts/gates-manifest';

describe('gates-manifest', () => {
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

  it('pins production-build to build:app instead of aggregate build', () => {
    expect(getGateCommand('production-build')).toEqual([
      'npm',
      'run',
      'build:app'
    ]);
  });
});
