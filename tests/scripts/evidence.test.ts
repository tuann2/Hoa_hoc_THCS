import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { createEvidence } from '../../scripts/evidence';

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

async function createRepoFixture(withCommit = true): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-'));
  tempRoots.push(rootDir);

  await runCommand(rootDir, 'git', ['init']);
  await runCommand(rootDir, 'git', [
    'config',
    'user.email',
    'codex@example.com'
  ]);
  await runCommand(rootDir, 'git', ['config', 'user.name', 'Codex']);

  await writeFile(
    path.join(rootDir, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      private: true
    }),
    'utf8'
  );
  await writeFile(
    path.join(rootDir, 'package-lock.json'),
    '{\n  "lockfileVersion": 3\n}\n',
    'utf8'
  );
  await writeFile(path.join(rootDir, 'tracked.txt'), 'initial\n', 'utf8');

  if (withCommit) {
    await runCommand(rootDir, 'git', ['add', '.']);
    await runCommand(rootDir, 'git', ['commit', '-m', 'initial']);
  }

  return rootDir;
}

async function createPassingEvidence(rootDir: string) {
  return createEvidence({
    cwd: rootDir,
    gateRunner: () =>
      Promise.resolve({
        finishedAt: new Date().toISOString(),
        gateResults: [
          {
            command: ['npm', 'run', 'lint'],
            durationMs: 1,
            exitCode: 0,
            id: 'lint'
          }
        ],
        mode: 'profile',
        profile: 'web',
        result: 'pass',
        startedAt: new Date().toISOString()
      }),
    profile: 'web'
  });
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { force: true, recursive: true }))
  );
});

describe('evidence', () => {
  it('captures a clean committed snapshot as pass', async () => {
    const rootDir = await createRepoFixture();
    const headSha = await runCommand(rootDir, 'git', ['rev-parse', 'HEAD']);

    const report = await createPassingEvidence(rootDir);

    expect(report.result).toBe('pass');
    expect(report.base_sha).toBe(headSha);
    expect(report.candidate_sha).toBe(headSha);
    expect(report.validated_snapshot.kind).toBe('git-tree');
  });

  it('marks dirty tracked changes as UNCOMMITTED while keeping evidence valid', async () => {
    const rootDir = await createRepoFixture();
    await writeFile(path.join(rootDir, 'tracked.txt'), 'modified\n', 'utf8');

    const report = await createPassingEvidence(rootDir);

    expect(report.result).toBe('pass');
    expect(report.candidate_sha).toBe('UNCOMMITTED');
  });

  it('marks dirty untracked files as UNCOMMITTED', async () => {
    const rootDir = await createRepoFixture();
    await writeFile(path.join(rootDir, 'new-file.txt'), 'new\n', 'utf8');

    const report = await createPassingEvidence(rootDir);

    expect(report.result).toBe('pass');
    expect(report.candidate_sha).toBe('UNCOMMITTED');
  });

  it('captures deleted tracked files in the snapshot', async () => {
    const rootDir = await createRepoFixture();
    await unlink(path.join(rootDir, 'tracked.txt'));

    const report = await createPassingEvidence(rootDir);

    expect(report.result).toBe('pass');
    expect(report.candidate_sha).toBe('UNCOMMITTED');
  });

  it('reports UNCOMMITTED when no candidate commit exists yet', async () => {
    const rootDir = await createRepoFixture(false);

    const report = await createPassingEvidence(rootDir);

    expect(report.base_sha).toBe('UNBORN');
    expect(report.candidate_sha).toBe('UNCOMMITTED');
  });

  it('marks evidence invalid when content changes between before and after snapshots', async () => {
    const rootDir = await createRepoFixture();

    const report = await createEvidence({
      cwd: rootDir,
      gateRunner: async () => {
        const current = await readFile(
          path.join(rootDir, 'tracked.txt'),
          'utf8'
        );
        await writeFile(
          path.join(rootDir, 'tracked.txt'),
          `${current}mutated\n`,
          'utf8'
        );

        return {
          finishedAt: new Date().toISOString(),
          gateResults: [
            {
              command: ['npm', 'run', 'lint'],
              durationMs: 1,
              exitCode: 0,
              id: 'lint'
            }
          ],
          mode: 'profile',
          profile: 'web',
          result: 'pass',
          startedAt: new Date().toISOString()
        };
      },
      profile: 'web'
    });

    expect(report.result).toBe('invalid');
  });
});
