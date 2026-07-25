import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyChangedPaths,
  getChangedPathsFromBase,
  inferMinimumProfile
} from '../../scripts/classify-change';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];

async function runCommand(
  cwd: string,
  command: string,
  args: readonly string[]
): Promise<string> {
  const { stdout } = await execFileAsync(command, [...args], {
    cwd,
    encoding: 'utf8'
  });

  return stdout.trim();
}

async function createGitFixture(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'classify-change-'));
  tempRoots.push(rootDir);

  await runCommand(rootDir, 'git', ['init']);
  await runCommand(rootDir, 'git', [
    'config',
    'user.email',
    'codex@example.com'
  ]);
  await runCommand(rootDir, 'git', ['config', 'user.name', 'Codex']);

  await writeFile(path.join(rootDir, 'tracked.txt'), 'base\n', 'utf8');
  await writeFile(path.join(rootDir, 'dirty.txt'), 'clean\n', 'utf8');
  await runCommand(rootDir, 'git', ['add', '.']);
  await runCommand(rootDir, 'git', ['commit', '-m', 'base']);

  return rootDir;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { force: true, recursive: true }))
  );
});

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
      'content-catalog',
      'content-validation',
      'lint',
      'typecheck',
      'unit-tests',
      'production-build',
      'bundle-check',
      'dependency-audit',
      'license-check'
    ]);
  });

  it('returns browser profile for Playwright spec changes', () => {
    const result = classifyChangedPaths({
      changedPaths: ['tests/e2e/pwa-offline.spec.ts']
    });

    expect(result.minimumProfile).toBe('browser');
    expect(result.requiredGates).toEqual(['e2e', 'pwa', 'pwa-subpath']);
    expect(result.fallbackToFull).toBe(false);
  });

  it('returns full when Playwright config changes require web and browser gates', () => {
    const result = classifyChangedPaths({
      changedPaths: ['playwright.config.ts']
    });

    expect(result.minimumProfile).toBe('full');
    expect(result.requiredGates).toEqual([
      'content-catalog',
      'content-validation',
      'lint',
      'typecheck',
      'unit-tests',
      'production-build',
      'bundle-check',
      'dependency-audit',
      'license-check',
      'e2e',
      'pwa',
      'pwa-subpath'
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

  it('infers browser when only browser gates are required', () => {
    expect(inferMinimumProfile(['e2e', 'pwa'])).toBe('browser');
  });

  it('includes committed changes, tracked dirty paths, and untracked paths from the base SHA', async () => {
    const rootDir = await createGitFixture();
    const baseSha = await runCommand(rootDir, 'git', ['rev-parse', 'HEAD']);

    await writeFile(path.join(rootDir, 'tracked.txt'), 'committed\n', 'utf8');
    await runCommand(rootDir, 'git', ['add', 'tracked.txt']);
    await runCommand(rootDir, 'git', ['commit', '-m', 'committed change']);
    await writeFile(path.join(rootDir, 'dirty.txt'), 'dirty\n', 'utf8');
    await writeFile(path.join(rootDir, 'untracked.txt'), 'new\n', 'utf8');

    await expect(getChangedPathsFromBase(baseSha, rootDir)).resolves.toEqual([
      'dirty.txt',
      'tracked.txt',
      'untracked.txt'
    ]);
  });

  it('includes both old and new paths for committed renames when classifying from a base SHA', async () => {
    const rootDir = await createGitFixture();
    const srcDir = path.join(rootDir, 'src');
    const docsDir = path.join(rootDir, 'docs');

    await rm(path.join(rootDir, 'tracked.txt'));
    await rm(path.join(rootDir, 'dirty.txt'));
    await mkdir(srcDir, { recursive: true });
    await writeFile(path.join(srcDir, 'guide.ts'), 'export const guide = 1;\n');
    await runCommand(rootDir, 'git', ['add', '.']);
    await runCommand(rootDir, 'git', ['commit', '-m', 'replace fixture files']);

    const baseSha = await runCommand(rootDir, 'git', ['rev-parse', 'HEAD']);

    await rm(srcDir, { force: true, recursive: true });
    await mkdir(docsDir, { recursive: true });
    await writeFile(path.join(docsDir, 'guide.md'), '# Guide\n', 'utf8');
    await runCommand(rootDir, 'git', ['add', '-A']);
    await runCommand(rootDir, 'git', [
      'commit',
      '-m',
      'rename src guide to docs'
    ]);

    const changedPaths = await getChangedPathsFromBase(baseSha, rootDir);

    expect(changedPaths).toEqual(['docs/guide.md', 'src/guide.ts']);
    expect(
      classifyChangedPaths({
        changedPaths
      }).minimumProfile
    ).toBe('full');
  });
});
