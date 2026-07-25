import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeSnapshot } from '../../scripts/evidence';
import {
  parseTraceYaml,
  renderTraceYaml,
  TRACE_DIRECTORY,
  traceTrivial,
  verifyTrace,
  type TrivialTraceRecord
} from '../../scripts/trace-trivial';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];
const passingExecutor = vi.fn(() => Promise.resolve(0));
const quietLog = { error: vi.fn(), log: vi.fn() };

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8'
  });

  return stdout.trim();
}

async function createRepoFixture(): Promise<{ cwd: string; baseSha: string }> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'trace-trivial-'));
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

async function applyTrivialEdit(cwd: string): Promise<void> {
  await writeFile(
    path.join(cwd, 'docs', 'guide.md'),
    '# Guide\n\nProse with a typo here.\n'
  );
  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '-m', 'fix typo']);
}

afterEach(async () => {
  vi.clearAllMocks();

  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();

    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('traceTrivial', () => {
  it('writes a schema-complete trace bound to the evidence snapshot', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);

    const { exitCode, filePath, record } = await traceTrivial({
      changedFrom: baseSha,
      cwd,
      executor: passingExecutor,
      log: quietLog
    });

    expect(exitCode).toBe(0);
    expect(record).not.toBeNull();
    expect(filePath).toMatch(
      new RegExp(`^${TRACE_DIRECTORY}/\\d{8}-[0-9a-f]{12}\\.yaml$`, 'u')
    );

    const written = await readFile(path.join(cwd, filePath ?? ''), 'utf8');
    const parsed = parseTraceYaml(written);

    expect(parsed.request_class).toBe('change');
    expect(parsed.risk_tier).toBe('TRIVIAL');
    expect(parsed.base_sha).toBe(baseSha);
    expect(parsed.changed_paths).toEqual(['docs/guide.md']);
    expect(parsed.selected_gates).toEqual([
      'git-diff-check',
      'format-check',
      'docs-check'
    ]);
    expect(parsed.result).toBe('PASS');

    const { snapshot } = await computeSnapshot(cwd);

    expect(parsed.validated_snapshot.kind).toBe(snapshot.kind);
  });

  it('writes no trace file and exits non-zero on ESCALATE', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await writeFile(
      path.join(cwd, 'AGENTS.md'),
      '# Agents\n\nGovernance edited.\n'
    );
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'governance edit']);

    const { exitCode, filePath, record } = await traceTrivial({
      changedFrom: baseSha,
      cwd,
      executor: passingExecutor,
      log: quietLog
    });

    expect(exitCode).toBe(1);
    expect(filePath).toBeNull();
    expect(record).toBeNull();
    expect(passingExecutor).not.toHaveBeenCalled();
    await expect(readdir(path.join(cwd, TRACE_DIRECTORY))).rejects.toThrow();
  });

  it('records FAIL and exits non-zero when a gate fails', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);

    const failingExecutor = vi.fn(() => Promise.resolve(1));
    const { exitCode, record } = await traceTrivial({
      changedFrom: baseSha,
      cwd,
      executor: failingExecutor,
      log: quietLog
    });

    expect(exitCode).toBe(1);
    expect(record?.result).toBe('FAIL');
  });
});

describe('parseTraceYaml', () => {
  it('round-trips a rendered record', () => {
    const record: TrivialTraceRecord = {
      request_class: 'change',
      risk_tier: 'TRIVIAL',
      base_sha: 'abc123',
      validated_snapshot: { kind: 'git-tree', id: 'deadbeef' },
      changed_paths: ['docs/a.md'],
      selected_gates: ['git-diff-check', 'format-check', 'docs-check'],
      result: 'PASS',
      timestamp_utc: '2026-07-19T00:00:00.000Z'
    };

    expect(parseTraceYaml(renderTraceYaml(record))).toEqual(record);
  });

  it('rejects a trace with missing fields', () => {
    expect(() => parseTraceYaml('request_class: change\n')).toThrow(
      /missing/iu
    );
  });

  it('rejects a trace with an invalid risk tier', () => {
    const record: TrivialTraceRecord = {
      request_class: 'change',
      risk_tier: 'TRIVIAL',
      base_sha: 'abc123',
      validated_snapshot: { kind: 'git-tree', id: 'deadbeef' },
      changed_paths: ['docs/a.md'],
      selected_gates: ['git-diff-check'],
      result: 'PASS',
      timestamp_utc: '2026-07-19T00:00:00.000Z'
    };
    const tampered = renderTraceYaml(record).replace(
      'risk_tier: TRIVIAL',
      'risk_tier: NORMAL'
    );

    expect(() => parseTraceYaml(tampered)).toThrow(/risk_tier/u);
  });
});

describe('verifyTrace', () => {
  async function writeCommittedTrace(
    cwd: string,
    baseSha: string
  ): Promise<string> {
    const { filePath } = await traceTrivial({
      changedFrom: baseSha,
      cwd,
      executor: passingExecutor,
      log: quietLog
    });

    if (!filePath) {
      throw new Error('expected a trace file');
    }

    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'add trace']);

    return filePath;
  }

  it('passes for an honest TRIVIAL claim', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);

    const tracePath = await writeCommittedTrace(cwd, baseSha);
    const exitCode = await verifyTrace({
      changedFrom: baseSha,
      cwd,
      tracePath,
      log: quietLog
    });

    expect(exitCode).toBe(0);
  });

  it('fails when the actual diff contains an undeclared violating change', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);

    const tracePath = await writeCommittedTrace(cwd, baseSha);

    // Smuggle a governance edit after the trace was generated.
    await writeFile(
      path.join(cwd, 'AGENTS.md'),
      '# Agents\n\nGovernance tampered.\n'
    );
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'smuggled edit']);

    const exitCode = await verifyTrace({
      changedFrom: baseSha,
      cwd,
      tracePath,
      log: quietLog
    });

    expect(exitCode).toBe(1);
  });

  it('fails when the trace under-reports the changed paths', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);

    const tracePath = await writeCommittedTrace(cwd, baseSha);

    // Add a second, allowlisted docs change not declared in the trace.
    await writeFile(
      path.join(cwd, 'docs', 'guide.md'),
      '# Guide\n\nProse with a typo here.\n\nExtra undeclared line.\n'
    );
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'undeclared extra edit']);

    const doctored = (
      await readFile(path.join(cwd, tracePath), 'utf8')
    ).replace('  - docs/guide.md', '  - docs/never-touched.md');

    await writeFile(path.join(cwd, tracePath), doctored);
    await git(cwd, ['add', '-A']);
    await git(cwd, ['commit', '-m', 'doctor trace']);

    const exitCode = await verifyTrace({
      changedFrom: baseSha,
      cwd,
      tracePath,
      log: quietLog
    });

    expect(exitCode).toBe(1);
  });

  it('rejects trace files outside the trace directory', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await applyTrivialEdit(cwd);
    await writeFile(
      path.join(cwd, 'docs', 'fake-trace.yaml'),
      'request_class: change\n'
    );

    const exitCode = await verifyTrace({
      changedFrom: baseSha,
      cwd,
      tracePath: 'docs/fake-trace.yaml',
      log: quietLog
    });

    expect(exitCode).toBe(1);
  });
});
