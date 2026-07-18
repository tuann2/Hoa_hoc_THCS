import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDocs } from '../../scripts/check-docs';

const tempRoots: string[] = [];

async function createRepoFixture(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'check-docs-'));
  tempRoots.push(rootDir);

  await mkdir(path.join(rootDir, 'docs', 'adr'), { recursive: true });
  await mkdir(path.join(rootDir, 'docs', 'architecture'), { recursive: true });
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
});
