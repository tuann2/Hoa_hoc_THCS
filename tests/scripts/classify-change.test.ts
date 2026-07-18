import { describe, expect, it } from 'vitest';
import {
  classifyChangedPaths,
  inferMinimumProfile
} from '../../scripts/classify-change';

describe('classify-change', () => {
  it('returns docs profile for markdown-only changes', () => {
    const result = classifyChangedPaths({
      changedPaths: ['docs/handoffs/WORKFLOW-004A-implementation.md']
    });

    expect(result.minimumProfile).toBe('docs');
    expect(result.requiredGates).toEqual(['docs-check']);
    expect(result.fallbackToFull).toBe(false);
  });

  it('returns web profile for application source changes', () => {
    const result = classifyChangedPaths({
      changedPaths: ['src/main.tsx', 'tests/routes/auth-route.test.tsx']
    });

    expect(result.minimumProfile).toBe('web');
    expect(result.requiredGates).toEqual([
      'content-validation',
      'lint',
      'typecheck',
      'unit-tests',
      'dependency-audit',
      'license-check',
      'production-build'
    ]);
  });

  it('fails closed to full for unrecognized paths', () => {
    const result = classifyChangedPaths({
      changedPaths: ['supabase/migrations/20260718_add_table.sql']
    });

    expect(result.minimumProfile).toBe('full');
    expect(result.fallbackToFull).toBe(true);
    expect(result.unknownPaths).toEqual([
      'supabase/migrations/20260718_add_table.sql'
    ]);
    expect(result.requiredGates).toContain('docs-check');
  });

  it('rejects declared profiles that under-classify the change', () => {
    expect(() =>
      classifyChangedPaths({
        changedPaths: ['src/App.tsx', 'docs/architecture.md'],
        declaredProfile: 'web'
      })
    ).toThrow(/under-classifies/);
  });

  it('accepts declared profiles that cover the required gate union', () => {
    expect(() =>
      classifyChangedPaths({
        changedPaths: ['src/App.tsx', 'docs/architecture.md'],
        declaredProfile: 'full'
      })
    ).not.toThrow();
  });

  it('infers full when docs and web gates must run together', () => {
    expect(inferMinimumProfile(['content-validation', 'docs-check'])).toBe(
      'full'
    );
  });
});
