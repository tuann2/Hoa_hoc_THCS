import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultExecutor,
  resolveGateExecutionOrder,
  runGates,
  runSelectedGates
} from '../../scripts/gates';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8'
  });

  return stdout.trim();
}

async function createTrivialFixture(): Promise<{
  cwd: string;
  baseSha: string;
}> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'gates-trivial-'));
  tempRoots.push(cwd);

  await git(cwd, ['init', '--initial-branch=main']);
  await git(cwd, ['config', 'user.email', 'test@example.com']);
  await git(cwd, ['config', 'user.name', 'Test']);
  await mkdir(path.join(cwd, 'docs'), { recursive: true });
  await writeFile(
    path.join(cwd, 'docs', 'guide.md'),
    '# Guide\n\nProse with a tpyo here.\n'
  );
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Agents\n\nGovernance.\n');
  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '-m', 'base']);
  const baseSha = await git(cwd, ['rev-parse', 'HEAD']);

  return { cwd, baseSha };
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();

    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('gates runner', () => {
  it('resolves prerequisites before bundle-check', () => {
    expect(resolveGateExecutionOrder(['bundle-check'])).toEqual([
      'content-validation',
      'typecheck',
      'production-build',
      'bundle-check'
    ]);
  });

  it('keeps prerequisites ahead of dependents even when selected in reverse order', () => {
    expect(
      resolveGateExecutionOrder([
        'bundle-check',
        'production-build',
        'typecheck',
        'content-validation'
      ])
    ).toEqual([
      'content-validation',
      'typecheck',
      'production-build',
      'bundle-check'
    ]);
  });

  it('rejects unknown gate ids outside the allowlist', () => {
    expect(() => resolveGateExecutionOrder(['lint', 'not-a-gate'])).toThrow(
      /Unknown gate ID/
    );
  });

  it('propagates gate failures and stops after the failing gate', async () => {
    let invocationCount = 0;
    const executor = vi.fn((command: readonly [string, ...string[]]) => {
      void command;
      invocationCount += 1;
      return Promise.resolve(invocationCount === 1 ? 0 : 1);
    });

    const result = await runSelectedGates(['format-check', 'lint'], {
      executor
    });

    expect(result.result).toBe('fail');
    expect(result.gateResults).toHaveLength(2);
    expect(result.gateResults[1]).toMatchObject({
      id: 'lint',
      exitCode: 1
    });
    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('runs profile web in manifest order with a fake executor', async () => {
    const commands: string[][] = [];
    const executor = vi.fn((command: readonly [string, ...string[]]) => {
      commands.push([...command]);
      return Promise.resolve(0);
    });

    const result = await runGates({
      dryRun: false,
      executor,
      profile: 'web'
    });

    expect(result.result).toBe('pass');
    expect(result.gateResults.map((gate) => gate.id)).toEqual([
      'git-diff-check',
      'format-check',
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
    expect(commands[0]).toEqual(['git', 'diff', '--check']);
    expect(commands.at(2)).toEqual(['npm', 'run', 'check:content-catalog']);
    expect(commands.at(-4)).toEqual(['npm', 'run', 'build:app']);
    expect(commands.at(-3)).toEqual(['npm', 'run', 'check:bundle']);
    expect(commands.at(-1)).toEqual(['npm', 'run', 'check:licenses']);
  });

  it('runs profile browser without web prerequisites', async () => {
    const commands: string[][] = [];
    const executor = vi.fn((command: readonly [string, ...string[]]) => {
      commands.push([...command]);
      return Promise.resolve(0);
    });

    const result = await runGates({
      dryRun: false,
      executor,
      profile: 'browser'
    });

    expect(result.result).toBe('pass');
    expect(result.gateResults.map((gate) => gate.id)).toEqual([
      'e2e',
      'pwa',
      'pwa-subpath'
    ]);
    expect(commands).toEqual([
      ['npm', 'run', 'test:e2e'],
      ['npm', 'run', 'test:pwa'],
      ['npm', 'run', 'test:pwa:subpath']
    ]);
  });

  it('returns exit code 127 instead of crashing when a command cannot be spawned', async () => {
    const error = vi.fn();
    const executor = createDefaultExecutor(process.cwd(), { error });

    await expect(executor(['__missing_gate_command__'])).resolves.toBe(127);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to start gate command "__missing_gate_command__"'
      )
    );
  });
});

describe('gates --tier=trivial', () => {
  const quietLog = { error: vi.fn(), log: vi.fn() };

  it('requires --changed-from', async () => {
    await expect(runGates({ tier: 'trivial' })).rejects.toThrow(
      /--tier=trivial requires --changed-from/u
    );
  });

  it('rejects combining --tier=trivial with --profile', async () => {
    await expect(
      runGates({ tier: 'trivial', changedFrom: 'HEAD', profile: 'docs' })
    ).rejects.toThrow(/cannot be combined with --profile/u);
  });

  it('runs the minimal trivial gate set on a TRIVIAL verdict', async () => {
    const { cwd, baseSha } = await createTrivialFixture();

    await writeFile(
      path.join(cwd, 'docs', 'guide.md'),
      '# Guide\n\nProse with a typo here.\n'
    );
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'fix typo']);

    const executor = vi.fn(() => Promise.resolve(0));
    const result = await runGates({
      changedFrom: baseSha,
      cwd,
      executor,
      log: quietLog,
      tier: 'trivial'
    });

    expect(result.mode).toBe('tier-trivial');
    expect(result.result).toBe('pass');
    expect(result.trivialClassification?.verdict).toBe('TRIVIAL');
    expect(result.gateResults.map((gate) => gate.id)).toEqual([
      'git-diff-check',
      'format-check',
      'docs-check'
    ]);
  });

  it('fails without running gates on an ESCALATE verdict', async () => {
    const { cwd, baseSha } = await createTrivialFixture();

    await writeFile(
      path.join(cwd, 'AGENTS.md'),
      '# Agents\n\nGovernance edited.\n'
    );
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'governance edit']);

    const executor = vi.fn(() => Promise.resolve(0));
    const error = vi.fn();
    const result = await runGates({
      changedFrom: baseSha,
      cwd,
      executor,
      log: { error, log: vi.fn() },
      tier: 'trivial'
    });

    expect(result.mode).toBe('tier-trivial');
    expect(result.result).toBe('fail');
    expect(result.gateResults).toEqual([]);
    expect(executor).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Open a NORMAL+ plan')
    );
  });
});
