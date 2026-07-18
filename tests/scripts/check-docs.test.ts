import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDocs } from '../../scripts/check-docs';

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

async function createRepoFixture(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'check-docs-'));
  tempRoots.push(rootDir);

  await mkdir(path.join(rootDir, 'docs', 'adr'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'architecture'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'handoffs'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'plans'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'runbooks'), { recursive: true });
  await mkdir(path.join(rootDir, '.github', 'workflows'), { recursive: true });
  await mkdir(path.join(rootDir, 'scripts'), { recursive: true });

  await writeFile(
    path.join(rootDir, 'package.json'),
    JSON.stringify(
      {
        name: 'fixture',
        private: true,
        scripts: {
          lint: 'eslint .',
          'check:docs': 'tsx scripts/check-docs.ts'
        }
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(path.join(rootDir, 'README.md'), '# Fixture\n', 'utf8');
  await writeFile(
    path.join(rootDir, 'docs', 'plans', 'PLAN.md'),
    '# Plan\n',
    'utf8'
  );
  await writeFile(
    path.join(rootDir, 'docs', 'adr', '0001-test.md'),
    '# ADR\n',
    'utf8'
  );
  await writeFile(
    path.join(rootDir, 'docs', 'architecture', 'AI_WORKFLOW_ARCHITECTURE.md'),
    '# Architecture\n',
    'utf8'
  );
  await writeFile(
    path.join(rootDir, 'docs', 'runbooks', 'DEPLOYMENT.md'),
    '# Runbook\n',
    'utf8'
  );
  await writeFile(
    path.join(rootDir, '.github', 'workflows', 'ci.yml'),
    'name: CI\n',
    'utf8'
  );
  await writeFile(
    path.join(rootDir, 'scripts', 'check-docs.ts'),
    'export {};\n',
    'utf8'
  );
  await runCommand(rootDir, 'git', ['init']);
  await runCommand(rootDir, 'git', [
    'config',
    'user.email',
    'codex@example.com'
  ]);
  await runCommand(rootDir, 'git', ['config', 'user.name', 'Codex']);
  await runCommand(rootDir, 'git', ['add', '.']);
  await runCommand(rootDir, 'git', ['commit', '-m', 'initial']);

  return rootDir;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { force: true, recursive: true }))
  );
});

describe('check-docs', () => {
  it('fails for broken relative markdown links', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      '[Broken](./missing.md)\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message: 'Broken relative Markdown link: ./missing.md',
        severity: 'error'
      }
    ]);
  });

  it('fails for missing repository paths mentioned in prose', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      'See `docs/handoffs/MISSING.md` for details.\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message:
          'Referenced repository path does not exist: docs/handoffs/MISSING.md',
        severity: 'error'
      }
    ]);
  });

  it('fails when npm run references a missing package script', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      'Run `npm run typecheck` before merge.\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message: 'Referenced npm script does not exist: npm run typecheck',
        severity: 'error'
      }
    ]);
  });

  it('warns for external URLs without failing', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      '[Example](https://example.com)\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message: 'External URL not verified: https://example.com',
        severity: 'warning'
      }
    ]);
  });

  it('passes when links, repo paths, and scripts exist', async () => {
    const rootDir = await createRepoFixture();

    await mkdir(path.join(rootDir, 'docs', 'handoffs'), { recursive: true });
    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'HANDOFF.md'),
      '# Handoff\n',
      'utf8'
    );
    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      [
        '[Plan](./plans/PLAN.md)',
        'See `.github/workflows/ci.yml`.',
        'Run `npm run lint` before merge.',
        'Then update `docs/handoffs/HANDOFF.md`.',
        'Review `docs/architecture/AI_WORKFLOW_ARCHITECTURE.md`.',
        'Follow `docs/runbooks/DEPLOYMENT.md` and `docs/adr/0001-test.md`.',
        'Keep `scripts/check-docs.ts` aligned.'
      ].join('\n'),
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([]);
  });

  it('ignores shorthand prose that is not a full repository path', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      'See architecture.md and DEPLOYMENT.md for context.\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([]);
  });

  it('keeps broken markdown links as errors in active plans without archival markers', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'plans', 'HISTORICAL.md'),
      '[Missing](./removed.md)\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/plans/HISTORICAL.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/plans/HISTORICAL.md',
        message: 'Broken relative Markdown link: ./removed.md',
        severity: 'error'
      }
    ]);
  });

  it('downgrades broken markdown links to warnings for mixed-case status markers', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'ARCHIVED.md'),
      [
        '# Old handoff',
        '',
        'Status: Archived',
        '',
        '[Missing](./removed.md)'
      ].join('\n'),
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/handoffs/ARCHIVED.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/handoffs/ARCHIVED.md',
        message: 'Broken relative Markdown link: ./removed.md',
        severity: 'warning'
      }
    ]);
  });

  it('accepts archival status markers without a space after the colon', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'ARCHIVED.md'),
      ['# Old handoff', '', 'status:stale', '', '[Missing](./removed.md)'].join(
        '\n'
      ),
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/handoffs/ARCHIVED.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/handoffs/ARCHIVED.md',
        message: 'Broken relative Markdown link: ./removed.md',
        severity: 'warning'
      }
    ]);
  });

  it('does not treat bare ARCHIVED prose as an archival marker', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'ARCHIVED.md'),
      [
        '# Old handoff',
        '',
        'This is ARCHIVED material for reference only.',
        '',
        '[Missing](./removed.md)'
      ].join('\n'),
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/handoffs/ARCHIVED.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/handoffs/ARCHIVED.md',
        message: 'Broken relative Markdown link: ./removed.md',
        severity: 'error'
      }
    ]);
  });

  it('matches archival markers on line 40 but not on line 41', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'LINE-40.md'),
      [
        ...Array.from({ length: 39 }, (_, index) => `Line ${index + 1}`),
        'Status: Archived',
        '',
        '[Missing](./removed-40.md)'
      ].join('\n'),
      'utf8'
    );
    await writeFile(
      path.join(rootDir, 'docs', 'handoffs', 'LINE-41.md'),
      [
        ...Array.from({ length: 40 }, (_, index) => `Line ${index + 1}`),
        'Status: Archived',
        '',
        '[Missing](./removed-41.md)'
      ].join('\n'),
      'utf8'
    );

    const line40Result = await checkDocs({
      cwd: rootDir,
      files: ['docs/handoffs/LINE-40.md']
    });
    const line41Result = await checkDocs({
      cwd: rootDir,
      files: ['docs/handoffs/LINE-41.md']
    });

    expect(line40Result.issues).toEqual([
      {
        file: 'docs/handoffs/LINE-40.md',
        message: 'Broken relative Markdown link: ./removed-40.md',
        severity: 'warning'
      }
    ]);
    expect(line41Result.issues).toEqual([
      {
        file: 'docs/handoffs/LINE-41.md',
        message: 'Broken relative Markdown link: ./removed-41.md',
        severity: 'error'
      }
    ]);
  });

  it('decodes escaped markdown targets before resolving paths', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'space name.md'),
      '# Space\n',
      'utf8'
    );
    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      '[Space](./space%20name.md)\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([]);
  });

  it('accepts npm run references with multiple spaces', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      'Run `npm run    lint` before merge.\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([]);
  });

  it('checks untracked markdown files with --all', async () => {
    const rootDir = await createRepoFixture();

    await writeFile(
      path.join(rootDir, 'docs', 'draft.md'),
      '[Broken](./missing.md)\n',
      'utf8'
    );

    const result = await checkDocs({
      all: true,
      cwd: rootDir
    });

    expect(result.files).toContain('docs/draft.md');
    expect(result.issues).toContainEqual({
      file: 'docs/draft.md',
      message: 'Broken relative Markdown link: ./missing.md',
      severity: 'error'
    });
  });

  it('fails when a relative markdown link resolves outside the repository root', async () => {
    const rootDir = await createRepoFixture();
    const outsideDir = await mkdtemp(
      path.join(os.tmpdir(), 'check-docs-outside-')
    );
    const outsideFile = path.join(outsideDir, 'outside.md');
    const outsideTarget = path.relative(
      path.join(rootDir, 'docs'),
      outsideFile
    );
    tempRoots.push(outsideDir);

    await writeFile(outsideFile, '# Outside\n', 'utf8');

    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      `[Outside](${outsideTarget})\n`,
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message: `Relative Markdown link points outside repository scope: ${outsideFile}`,
        severity: 'error'
      }
    ]);
  });

  it('fails when a relative markdown link traverses a symlink outside the repository root', async () => {
    const rootDir = await createRepoFixture();
    const outsideDir = await mkdtemp(
      path.join(os.tmpdir(), 'check-docs-outside-')
    );
    const outsideFile = path.join(outsideDir, 'outside.md');
    tempRoots.push(outsideDir);

    await writeFile(outsideFile, '# Outside\n', 'utf8');
    await symlink(outsideFile, path.join(rootDir, 'docs', 'escape.md'));
    await writeFile(
      path.join(rootDir, 'docs', 'guide.md'),
      '[Escape](./escape.md)\n',
      'utf8'
    );

    const result = await checkDocs({
      cwd: rootDir,
      files: ['docs/guide.md']
    });

    expect(result.issues).toEqual([
      {
        file: 'docs/guide.md',
        message: `Relative Markdown link points outside repository scope: ${outsideFile}`,
        severity: 'error'
      }
    ]);
  });
});
