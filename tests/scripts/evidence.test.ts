import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { computeSnapshot, createEvidence } from '../../scripts/evidence';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];
const originalForceManifest = process.env.EVIDENCE_FORCE_MANIFEST;
const originalVitest = process.env.VITEST;
const runIfNotRoot =
  typeof process.getuid === 'function' && process.getuid() === 0 ? it.skip : it;

type SnapshotMode = {
  expectedKind: 'git-tree' | 'manifest';
  forceManifest: boolean;
  name: string;
};

const SNAPSHOT_MODES: readonly SnapshotMode[] = [
  {
    expectedKind: 'git-tree',
    forceManifest: false,
    name: 'git-tree'
  },
  {
    expectedKind: 'manifest',
    forceManifest: true,
    name: 'manifest fallback'
  }
];

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

async function withSnapshotMode<T>(
  mode: SnapshotMode,
  run: () => Promise<T>
): Promise<T> {
  if (mode.forceManifest) {
    process.env.EVIDENCE_FORCE_MANIFEST = '1';
  } else {
    delete process.env.EVIDENCE_FORCE_MANIFEST;
  }

  try {
    return await run();
  } finally {
    if (originalForceManifest === undefined) {
      delete process.env.EVIDENCE_FORCE_MANIFEST;
    } else {
      process.env.EVIDENCE_FORCE_MANIFEST = originalForceManifest;
    }
  }
}

async function createPassingEvidence(rootDir: string, mode: SnapshotMode) {
  return withSnapshotMode(mode, () =>
    createEvidence({
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
    })
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

afterEach(async () => {
  if (originalForceManifest === undefined) {
    delete process.env.EVIDENCE_FORCE_MANIFEST;
  } else {
    process.env.EVIDENCE_FORCE_MANIFEST = originalForceManifest;
  }

  if (originalVitest === undefined) {
    delete process.env.VITEST;
  } else {
    process.env.VITEST = originalVitest;
  }

  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { force: true, recursive: true }))
  );
});

describe('evidence', () => {
  for (const mode of SNAPSHOT_MODES) {
    describe(mode.name, () => {
      it('captures a clean committed snapshot as pass', async () => {
        const rootDir = await createRepoFixture();
        await writeFile(
          path.join(rootDir, '.env.local'),
          'TOKEN=test\n',
          'utf8'
        );
        await runCommand(rootDir, 'git', ['add', '.env.local']);
        await runCommand(rootDir, 'git', ['commit', '-m', 'add env']);
        const headSha = await runCommand(rootDir, 'git', ['rev-parse', 'HEAD']);
        const report = await createPassingEvidence(rootDir, mode);

        expect(report.result).toBe('pass');
        expect(report.base_sha).toBe(headSha);
        expect(report.candidate_sha).toBe(headSha);
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
        expect(report.build_inputs).toEqual([
          {
            path: '.env.local',
            sha256: sha256('TOKEN=test\n')
          }
        ]);

        if (mode.forceManifest) {
          expect(report.snapshot_fallback_reason).toBe(
            'Forced by EVIDENCE_FORCE_MANIFEST under Vitest.'
          );
        } else {
          expect(report.snapshot_fallback_reason).toBeNull();
        }
      });

      it('marks dirty tracked changes as UNCOMMITTED while keeping evidence valid', async () => {
        const rootDir = await createRepoFixture();
        await writeFile(
          path.join(rootDir, 'tracked.txt'),
          'modified\n',
          'utf8'
        );

        const report = await createPassingEvidence(rootDir, mode);

        expect(report.result).toBe('pass');
        expect(report.candidate_sha).toBe('UNCOMMITTED');
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
      });

      it('marks dirty untracked files as UNCOMMITTED', async () => {
        const rootDir = await createRepoFixture();
        await writeFile(path.join(rootDir, 'new-file.txt'), 'new\n', 'utf8');

        const report = await createPassingEvidence(rootDir, mode);

        expect(report.result).toBe('pass');
        expect(report.candidate_sha).toBe('UNCOMMITTED');
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
      });

      it('captures deleted tracked files in the snapshot', async () => {
        const rootDir = await createRepoFixture();
        await unlink(path.join(rootDir, 'tracked.txt'));

        const report = await createPassingEvidence(rootDir, mode);

        expect(report.result).toBe('pass');
        expect(report.candidate_sha).toBe('UNCOMMITTED');
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
      });

      it('reports UNCOMMITTED when no candidate commit exists yet', async () => {
        const rootDir = await createRepoFixture(false);

        const report = await createPassingEvidence(rootDir, mode);

        expect(report.base_sha).toBe('UNBORN');
        expect(report.candidate_sha).toBe('UNCOMMITTED');
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
      });

      it('marks evidence invalid when content changes between before and after snapshots', async () => {
        const rootDir = await createRepoFixture();

        const report = await withSnapshotMode(mode, () =>
          createEvidence({
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
          })
        );

        expect(report.result).toBe('invalid');
        expect(report.validated_snapshot.kind).toBe(mode.expectedKind);
      });

      it('marks evidence invalid when HEAD moves between before and after capture', async () => {
        const rootDir = await createRepoFixture();

        const report = await withSnapshotMode(mode, () =>
          createEvidence({
            cwd: rootDir,
            gateRunner: async () => {
              await runCommand(rootDir, 'git', [
                'commit',
                '--allow-empty',
                '-m',
                'move head'
              ]);

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
          })
        );

        expect(report.result).toBe('invalid');
      });
    });
  }

  it('ignores EVIDENCE_FORCE_MANIFEST outside Vitest', async () => {
    const rootDir = await createRepoFixture();
    process.env.EVIDENCE_FORCE_MANIFEST = '1';
    delete process.env.VITEST;

    const report = await createEvidence({
      cwd: rootDir,
      gateRunner: () =>
        Promise.resolve({
          finishedAt: new Date().toISOString(),
          gateResults: [],
          mode: 'profile',
          profile: 'web',
          result: 'pass',
          startedAt: new Date().toISOString()
        }),
      profile: 'web'
    });

    expect(report.validated_snapshot.kind).toBe('git-tree');
    expect(report.snapshot_fallback_reason).toBeNull();
  });

  it('throws when manifest fallback cannot read git metadata', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-no-git-'));
    tempRoots.push(rootDir);

    process.env.EVIDENCE_FORCE_MANIFEST = '1';
    process.env.VITEST = '1';

    await expect(computeSnapshot(rootDir)).rejects.toThrow(
      /git metadata is unavailable/
    );
  });

  it('propagates the manifest fallback error when git-tree capture also fails', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-no-git-'));
    tempRoots.push(rootDir);

    await expect(computeSnapshot(rootDir)).rejects.toThrow(
      /git metadata is unavailable/
    );
  });

  runIfNotRoot(
    'rejects manifest-mode evidence when a tracked file exists but is unreadable',
    async () => {
      const rootDir = await createRepoFixture();
      const trackedPath = path.join(rootDir, 'tracked.txt');

      process.env.EVIDENCE_FORCE_MANIFEST = '1';
      process.env.VITEST = '1';

      await chmod(trackedPath, 0o000);

      try {
        await expect(
          createEvidence({
            cwd: rootDir,
            gateRunner: () =>
              Promise.resolve({
                finishedAt: new Date().toISOString(),
                gateResults: [],
                mode: 'profile',
                profile: 'web',
                result: 'pass',
                startedAt: new Date().toISOString()
              }),
            profile: 'web'
          })
        ).rejects.toThrow(/EACCES|permission/i);
      } finally {
        await chmod(trackedPath, 0o644);
      }
    }
  );

  it('marks evidence invalid when .env build inputs change during gate execution', async () => {
    const rootDir = await createRepoFixture();
    const envPath = path.join(rootDir, '.env.local');

    await writeFile(envPath, 'TOKEN=before\n', 'utf8');

    const report = await createEvidence({
      cwd: rootDir,
      gateRunner: async () => {
        await writeFile(envPath, 'TOKEN=after\n', 'utf8');

        return {
          finishedAt: new Date().toISOString(),
          gateResults: [],
          mode: 'profile',
          profile: 'web',
          result: 'pass',
          startedAt: new Date().toISOString()
        };
      },
      profile: 'web'
    });

    expect(report.result).toBe('invalid');
    expect(report.build_inputs).toEqual([
      {
        path: '.env.local',
        sha256: sha256('TOKEN=before\n')
      }
    ]);
  });

  it('marks evidence invalid when a .env symlink target outside the repo changes', async () => {
    const rootDir = await createRepoFixture();
    const externalDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-env-'));
    const externalEnvPath = path.join(externalDir, 'external.env');
    tempRoots.push(externalDir);

    await writeFile(externalEnvPath, 'TOKEN=before\n', 'utf8');
    await symlink(externalEnvPath, path.join(rootDir, '.env.local'));

    const report = await createEvidence({
      cwd: rootDir,
      gateRunner: async () => {
        await writeFile(externalEnvPath, 'TOKEN=after\n', 'utf8');

        return {
          finishedAt: new Date().toISOString(),
          gateResults: [],
          mode: 'profile',
          profile: 'web',
          result: 'pass',
          startedAt: new Date().toISOString()
        };
      },
      profile: 'web'
    });

    expect(report.result).toBe('invalid');
    expect(report.build_inputs).toEqual([
      {
        path: '.env.local',
        sha256: sha256('TOKEN=before\n')
      }
    ]);
  });

  it('changes the manifest snapshot when a symlink target changes', async () => {
    const rootDir = await createRepoFixture();

    process.env.EVIDENCE_FORCE_MANIFEST = '1';
    process.env.VITEST = '1';

    await writeFile(path.join(rootDir, 'target-a.txt'), 'A\n', 'utf8');
    await writeFile(path.join(rootDir, 'target-b.txt'), 'B\n', 'utf8');
    await symlink('target-a.txt', path.join(rootDir, 'linked.txt'));

    const before = await computeSnapshot(rootDir);

    expect(before.snapshot.kind).toBe('manifest');

    await unlink(path.join(rootDir, 'linked.txt'));
    await symlink('target-b.txt', path.join(rootDir, 'linked.txt'));

    const after = await computeSnapshot(rootDir);

    expect(after.snapshot.kind).toBe('manifest');
    expect(after.snapshot.id).not.toBe(before.snapshot.id);
  });
});
