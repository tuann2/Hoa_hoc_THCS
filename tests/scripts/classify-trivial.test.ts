import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyTrivial,
  getChangedFileStatuses
} from '../../scripts/classify-trivial';

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8'
  });

  return stdout.trim();
}

async function createRepoFixture(): Promise<{ cwd: string; baseSha: string }> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'classify-trivial-'));
  tempRoots.push(cwd);

  await git(cwd, ['init', '--initial-branch=main']);
  await git(cwd, ['config', 'user.email', 'test@example.com']);
  await git(cwd, ['config', 'user.name', 'Test']);
  await git(cwd, ['config', 'core.quotepath', 'false']);

  await mkdir(path.join(cwd, 'docs', 'adr'), { recursive: true });
  await writeFile(
    path.join(cwd, 'docs', 'guide.md'),
    [
      '# Guide',
      '',
      'This is a plain prose paragraph with a small tpyo inside.',
      '',
      'Run `npm run lint` before committing.',
      '',
      'See scripts/gates.ts for the runner.',
      '',
      '```bash',
      'echo inside a fence',
      '```',
      '',
      '| metric | value |',
      '| ------ | ----- |',
      '| tokens | 1500  |',
      '',
      'Closing prose line.',
      ''
    ].join('\n')
  );
  await writeFile(path.join(cwd, 'docs', 'other.md'), '# Other\n\nProse.\n');
  await writeFile(path.join(cwd, 'docs', 'old.md'), '# Old\n\nProse.\n');
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Agents\n\nGovernance.\n');
  await mkdir(path.join(cwd, 'content', 'units'), { recursive: true });
  await writeFile(
    path.join(cwd, 'content', 'units', 'unit-01.json'),
    JSON.stringify({ explanation: 'old prose', answer: 'A' }, null, 2)
  );
  await mkdir(path.join(cwd, 'supabase'), { recursive: true });
  await writeFile(path.join(cwd, 'supabase', 'config.toml'), 'a = 1\n');

  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '-m', 'base']);
  const baseSha = await git(cwd, ['rev-parse', 'HEAD']);

  return { cwd, baseSha };
}

async function commitAll(cwd: string, message: string): Promise<void> {
  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '-m', message]);
}

async function editLine(
  cwd: string,
  relativePath: string,
  search: string,
  replace: string
): Promise<void> {
  const absolute = path.join(cwd, relativePath);
  const { readFile: read } = await import('node:fs/promises');
  const content = await read(absolute, 'utf8');

  if (!content.includes(search)) {
    throw new Error(`fixture line not found in ${relativePath}: ${search}`);
  }

  await writeFile(absolute, content.replace(search, replace));
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();

    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('classifyTrivial', () => {
  it('accepts a plain prose typo fix in docs (case 1)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'docs/guide.md', 'tpyo', 'typo');
    await commitAll(cwd, 'fix typo');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('TRIVIAL');
    expect(result.selectedGates).toEqual([
      'git-diff-check',
      'format-check',
      'docs-check'
    ]);
    expect(result.escalationGuidance).toBeNull();
  });

  it('escalates a governance file edit (case 2)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'AGENTS.md', 'Governance.', 'Governance!');
    await commitAll(cwd, 'edit agents');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('denylist: `AGENTS.md`');
  });

  it('escalates a path outside the allowlist (case 3)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'supabase/config.toml', 'a = 1', 'a = 2');
    await commitAll(cwd, 'edit config');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.find((entry) => entry.path === 'supabase/config.toml')
        ?.reasons[0]
    ).toMatch(/denylist: backend files/u);
  });

  it('escalates an added markdown file (case 4)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await writeFile(path.join(cwd, 'docs', 'new-page.md'), '# New\n');
    await commitAll(cwd, 'add page');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('non-modified-status: added');
  });

  it('escalates a rename (case 5)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await rename(
      path.join(cwd, 'docs', 'other.md'),
      path.join(cwd, 'docs', 'renamed.md')
    );
    await commitAll(cwd, 'rename');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.some((entry) =>
        entry.reasons.some((reason) =>
          /non-modified-status: (?:renamed|added)/u.test(reason)
        )
      )
    ).toBe(true);
  });

  it('escalates a deletion (case 6)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await rm(path.join(cwd, 'docs', 'old.md'));
    await commitAll(cwd, 'delete');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('non-modified-status: deleted');
  });

  it('escalates a change to a line containing an npm run command (case 7)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(
      cwd,
      'docs/guide.md',
      'Run `npm run lint` before committing.',
      'Run `npm run lint:all` before committing.'
    );
    await commitAll(cwd, 'edit command');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain(
      'hard-trigger: command-reference'
    );
  });

  it('escalates a change to a line referencing a repo path (case 8)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(
      cwd,
      'docs/guide.md',
      'See scripts/gates.ts for the runner.',
      'See scripts/gates-v2.ts for the runner.'
    );
    await commitAll(cwd, 'edit path ref');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('hard-trigger: path-reference');
  });

  it('escalates an edit inside an existing code fence (case 9)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(
      cwd,
      'docs/guide.md',
      'echo inside a fence',
      'echo edited fence body'
    );
    await commitAll(cwd, 'edit fence body');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('hard-trigger: code-fence');
  });

  it('escalates a numeric change in a table row (case 10)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(
      cwd,
      'docs/guide.md',
      '| tokens | 1500  |',
      '| tokens | 2500  |'
    );
    await commitAll(cwd, 'edit number');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain(
      'hard-trigger: numeric-in-table'
    );
  });

  it('escalates a content unit prose edit (case 11)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'content/units/unit-01.json', 'old prose', 'new prose');
    await commitAll(cwd, 'edit unit');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain(
      'denylist: content schema/catalogue'
    );
  });

  it('escalates the whole changeset when one path violates (case 12)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'docs/guide.md', 'tpyo', 'typo');
    await editLine(cwd, 'AGENTS.md', 'Governance.', 'Governance!');
    await commitAll(cwd, 'mixed');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.find((entry) => entry.path === 'docs/guide.md')?.verdict
    ).toBe('TRIVIAL');
    expect(
      result.paths.find((entry) => entry.path === 'AGENTS.md')?.verdict
    ).toBe('ESCALATE');
    expect(result.selectedGates).toEqual([]);
  });

  it('escalates a non-NFC unicode path (case 13)', async () => {
    const { cwd, baseSha } = await createRepoFixture();
    // NFD form of "docs/guide\u0301.md" — decomposed accent must fail closed.
    const nfdName = 'guide\u0301.md';

    await writeFile(path.join(cwd, 'docs', nfdName), '# Accent\n');
    await commitAll(cwd, 'add nfd path');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');

    const entry = result.paths.find((item) => item.path.includes('guide'));

    expect(entry?.verdict).toBe('ESCALATE');
    expect(
      entry?.reasons.some(
        (reason) =>
          reason === 'malformed-or-non-normalized-path' ||
          reason.startsWith('non-modified-status')
      )
    ).toBe(true);
  });

  it('escalates unusual-case paths via the case-sensitive allowlist (case 14)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await writeFile(path.join(cwd, 'docs', 'Guide.MD'), '# Case\n');
    await commitAll(cwd, 'add cased file');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
  });

  it('escalates an added symlink targeting a governed directory (case 15)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await symlink(
      path.join(cwd, 'docs', 'adr'),
      path.join(cwd, 'docs', 'sneaky.md')
    );
    await commitAll(cwd, 'add symlink');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths[0]?.reasons).toContain('non-modified-status: added');
  });

  it('escalates an empty changeset (case 16)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(result.paths).toEqual([]);
    expect(result.escalationGuidance).toMatch(/no changed paths detected/u);
  });

  it('escalates when a wrapped command reference is repointed via its continuation line (case 17)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    // The reference is hand-wrapped in the base file so no single diff line
    // ever contains the full "npm run <name>" string.
    await writeFile(
      path.join(cwd, 'docs', 'wrapped.md'),
      '# Wrapped\n\nBefore committing validate the build with `npm\nrun test:pwa` and confirm it passes.\n'
    );
    await commitAll(cwd, 'add wrapped doc');
    const wrappedBase = await git(cwd, ['rev-parse', 'HEAD']);

    await editLine(cwd, 'docs/wrapped.md', 'run test:pwa`', 'run test:e2e`');
    await commitAll(cwd, 'repoint wrapped command');

    const result = await classifyTrivial({ changedFrom: wrappedBase, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.find((entry) => entry.path === 'docs/wrapped.md')?.reasons
    ).toContain('hard-trigger: command-reference');

    void baseSha;
  });

  it('escalates when two wrapped references are swapped (case 17b)', async () => {
    const { cwd } = await createRepoFixture();

    await writeFile(
      path.join(cwd, 'docs', 'swap.md'),
      '# Swap\n\nValidate the PWA build with `npm\nrun test:pwa` before pushing.\n\nRun the browser suite with `npm\nrun test:e2e` after that.\n'
    );
    await commitAll(cwd, 'add swap doc');
    const swapBase = await git(cwd, ['rev-parse', 'HEAD']);

    await editLine(cwd, 'docs/swap.md', 'run test:pwa`', 'run TEMP`');
    await editLine(cwd, 'docs/swap.md', 'run test:e2e`', 'run test:pwa`');
    await editLine(cwd, 'docs/swap.md', 'run TEMP`', 'run test:e2e`');
    await commitAll(cwd, 'swap wrapped commands');

    const result = await classifyTrivial({ changedFrom: swapBase, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.find((entry) => entry.path === 'docs/swap.md')?.reasons
    ).toContain('hard-trigger: command-reference');
  });

  it('escalates a modified (repointed) symlink under an allowlisted path (case 18)', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await symlink('other.md', path.join(cwd, 'docs', 'link.md'));
    await commitAll(cwd, 'add symlink');
    const symlinkBase = await git(cwd, ['rev-parse', 'HEAD']);

    await rm(path.join(cwd, 'docs', 'link.md'));
    await symlink('/etc/hostname', path.join(cwd, 'docs', 'link.md'));
    await commitAll(cwd, 'repoint symlink');

    const result = await classifyTrivial({ changedFrom: symlinkBase, cwd });

    expect(result.verdict).toBe('ESCALATE');
    expect(
      result.paths.find((entry) => entry.path === 'docs/link.md')?.reasons
    ).toContain('symlink-path');

    void baseSha;
  });

  it('treats uncommitted working-tree edits as part of the changeset', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'docs/guide.md', 'tpyo', 'typo');

    const result = await classifyTrivial({ changedFrom: baseSha, cwd });

    expect(result.verdict).toBe('TRIVIAL');
  });
});

describe('getChangedFileStatuses', () => {
  it('reports rename status with the old path', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await rename(
      path.join(cwd, 'docs', 'other.md'),
      path.join(cwd, 'docs', 'renamed.md')
    );
    await commitAll(cwd, 'rename');

    const statuses = await getChangedFileStatuses(baseSha, cwd);
    const renamed = statuses.find((entry) => entry.status === 'renamed');

    if (renamed && renamed.status === 'renamed') {
      expect(renamed.oldPath).toBe('docs/other.md');
      expect(renamed.path).toBe('docs/renamed.md');
    } else {
      // Without rename detection thresholds met, git reports delete+add;
      // both statuses still fail closed.
      expect(statuses.every((entry) => entry.status !== 'modified')).toBe(true);
    }
  });

  it('prefers the non-modified status when committed and dirty scans disagree', async () => {
    const { cwd, baseSha } = await createRepoFixture();

    await editLine(cwd, 'docs/guide.md', 'tpyo', 'typo');
    await commitAll(cwd, 'typo fix');
    await rm(path.join(cwd, 'docs', 'guide.md'));

    const statuses = await getChangedFileStatuses(baseSha, cwd);
    const entry = statuses.find((item) => item.path === 'docs/guide.md');

    expect(entry?.status).toBe('deleted');
  });
});
