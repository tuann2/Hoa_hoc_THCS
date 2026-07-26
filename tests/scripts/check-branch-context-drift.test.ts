import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BRANCH_AGE_THRESHOLD_COMMITS,
  BRANCH_AGE_THRESHOLD_SECONDS,
  checkBranchContextDrift,
  formatBranchContextDriftWarning
} from '../../scripts/check-branch-context-drift';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];

async function git(
  cwd: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv
): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8',
    env
  });

  return stdout.trim();
}

async function commitAll(
  cwd: string,
  message: string,
  timestamp?: string
): Promise<void> {
  await git(cwd, ['add', '-A']);
  const env = timestamp
    ? {
        ...process.env,
        GIT_AUTHOR_DATE: timestamp,
        GIT_COMMITTER_DATE: timestamp
      }
    : undefined;

  await git(cwd, ['commit', '-m', message], env);
}

async function createRepo(initialTimestamp?: string): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'branch-context-drift-'));
  tempRoots.push(cwd);

  await git(cwd, ['init', '--initial-branch=main']);
  await git(cwd, ['config', 'user.email', 'test@example.com']);
  await git(cwd, ['config', 'user.name', 'Test']);
  await mkdir(path.join(cwd, 'docs'), { recursive: true });
  await writeFile(path.join(cwd, 'CLAUDE.md'), '# Detailed legacy context\n');
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Detailed legacy agents\n');
  await writeFile(path.join(cwd, 'work.md'), '# Work\n');
  await commitAll(cwd, 'legacy mandatory context', initialTimestamp);

  return cwd;
}

async function addNonContextCommits(
  cwd: string,
  count: number,
  timestamp?: string
): Promise<void> {
  for (let index = 1; index <= count; index += 1) {
    await writeFile(path.join(cwd, 'work.md'), `# Work ${index}\n`);
    await commitAll(cwd, `work ${index}`, timestamp);
  }
}

async function migrateMandatoryContext(
  cwd: string,
  timestamp?: string
): Promise<void> {
  await writeFile(path.join(cwd, 'CLAUDE.md'), '# Compact context\n');
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Compact agents\n');
  await writeFile(
    path.join(cwd, 'docs', 'CONTEXT_RULES.md'),
    '# Context rules\n'
  );
  await commitAll(cwd, 'shrink mandatory context', timestamp);
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();

    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('checkBranchContextDrift', () => {
  it('warns for an aged branch that kept the pre-migration context', async () => {
    const cwd = await createRepo();

    // Mirrors the real-world stale branches from WORKFLOW-006 Phase A, but
    // uses only synthetic commits so test stability does not depend on them.
    await git(cwd, ['switch', '-c', 'stale-context']);
    await addNonContextCommits(cwd, BRANCH_AGE_THRESHOLD_COMMITS);
    await git(cwd, ['switch', 'main']);
    await migrateMandatoryContext(cwd);

    const warning = await checkBranchContextDrift({
      baseRef: 'main',
      branchRef: 'stale-context',
      cwd
    });

    expect(warning).not.toBeNull();

    if (!warning) {
      throw new Error('expected an aged drift warning');
    }

    expect(warning.branchCommitsSinceMergeBase).toBe(
      BRANCH_AGE_THRESHOLD_COMMITS
    );
    expect(
      warning.differences.map(({ comparison, path: filePath }) => ({
        comparison,
        path: filePath
      }))
    ).toEqual([
      { path: 'CLAUDE.md', comparison: 'content' },
      { path: 'AGENTS.md', comparison: 'content' },
      { path: 'docs/CONTEXT_RULES.md', comparison: 'content' }
    ]);
    const contextRulesDifference = warning.differences.find(
      (difference) => difference.path === 'docs/CONTEXT_RULES.md'
    );

    expect(contextRulesDifference?.baseBytes).toBeGreaterThan(0);
    expect(contextRulesDifference?.branchBytes).toBeNull();
    expect(formatBranchContextDriftWarning(warning)).toContain(
      'suggested_fix: git merge main'
    );
  });

  it('stays silent for a branch created after the context migration', async () => {
    const cwd = await createRepo();

    await migrateMandatoryContext(cwd);
    await git(cwd, ['switch', '-c', 'in-sync-context']);
    await addNonContextCommits(cwd, BRANCH_AGE_THRESHOLD_COMMITS);

    await expect(
      checkBranchContextDrift({
        baseRef: 'main',
        branchRef: 'in-sync-context',
        cwd
      })
    ).resolves.toBeNull();
  });

  it('stays silent for a newly diverged branch with context drift', async () => {
    const cwd = await createRepo();

    await git(cwd, ['switch', '-c', 'newly-stale-context']);
    await addNonContextCommits(cwd, BRANCH_AGE_THRESHOLD_COMMITS - 1);
    await git(cwd, ['switch', 'main']);
    await migrateMandatoryContext(cwd);

    await expect(
      checkBranchContextDrift({
        baseRef: 'main',
        branchRef: 'newly-stale-context',
        cwd
      })
    ).resolves.toBeNull();
  });

  it('warns when base history is three days newer than a low-commit merge base', async () => {
    const mergeBaseTimestamp = '2026-01-01T00:00:00Z';
    const baseHeadTimestamp = '2026-01-05T00:00:00Z';
    const cwd = await createRepo(mergeBaseTimestamp);

    await git(cwd, ['switch', '-c', 'time-aged-context']);
    await addNonContextCommits(cwd, 1, '2026-01-02T00:00:00Z');
    await git(cwd, ['switch', 'main']);
    await migrateMandatoryContext(cwd, baseHeadTimestamp);

    const warning = await checkBranchContextDrift({
      baseRef: 'main',
      branchRef: 'time-aged-context',
      cwd
    });

    expect(warning?.branchCommitsSinceMergeBase).toBe(1);
    expect(warning?.baseSecondsSinceMergeBase).toBe(
      BRANCH_AGE_THRESHOLD_SECONDS + 24 * 60 * 60
    );
  });

  it('does not treat docs/CONTEXT_RULES.md being absent on both sides as drift', async () => {
    const cwd = await createRepo();
    const olderBase = await git(cwd, ['rev-parse', 'HEAD']);

    await git(cwd, ['switch', '-c', 'older-context']);
    await addNonContextCommits(cwd, BRANCH_AGE_THRESHOLD_COMMITS);

    await expect(
      checkBranchContextDrift({
        baseRef: olderBase,
        branchRef: 'older-context',
        cwd
      })
    ).resolves.toBeNull();
  });

  it('warns when docs/CONTEXT_RULES.md content differs on both sides', async () => {
    const cwd = await createRepo();

    await migrateMandatoryContext(cwd);
    await git(cwd, ['switch', '-c', 'diverged-context-rules']);
    await addNonContextCommits(cwd, BRANCH_AGE_THRESHOLD_COMMITS - 1);
    await writeFile(
      path.join(cwd, 'docs', 'CONTEXT_RULES.md'),
      '# Branch context rules\n'
    );
    await commitAll(cwd, 'diverge context rules');

    const warning = await checkBranchContextDrift({
      baseRef: 'main',
      branchRef: 'diverged-context-rules',
      cwd
    });

    expect(warning?.differences).toEqual([
      {
        baseBytes: Buffer.byteLength('# Context rules\n', 'utf8'),
        branchBytes: Buffer.byteLength('# Branch context rules\n', 'utf8'),
        comparison: 'content',
        path: 'docs/CONTEXT_RULES.md'
      }
    ]);
  });
});
