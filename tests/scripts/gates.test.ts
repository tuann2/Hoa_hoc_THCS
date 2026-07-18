import { describe, expect, it, vi } from 'vitest';
import {
  resolveGateExecutionOrder,
  runGates,
  runSelectedGates
} from '../../scripts/gates';

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
});
