import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';

const execFileAsync = promisify(execFile);

// Keep this list in sync with the mandatory-context files named by the
// Context Policy whenever that policy is amended.
export const MANDATORY_CONTEXT_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'docs/CONTEXT_RULES.md'
] as const;

type MandatoryContextFile = (typeof MANDATORY_CONTEXT_FILES)[number];

// A drifted branch warns when either it has at least five commits beyond its
// merge base, or base HEAD's committer timestamp is at least three days after
// the merge base's committer timestamp. Both values come only from Git commit
// objects, so this dual rule remains reproducible in CI without wall-clock time.
export const BRANCH_AGE_THRESHOLD_COMMITS = 5;
export const BRANCH_AGE_THRESHOLD_SECONDS = 3 * 24 * 60 * 60;

export type ContextFileDifference = {
  baseBytes: number | null;
  branchBytes: number | null;
  comparison: 'content';
  path: MandatoryContextFile;
};

export type BranchContextDriftWarning = {
  baseRef: string;
  baseSecondsSinceMergeBase: number;
  branchCommitsSinceMergeBase: number;
  branchRef: string;
  differences: ContextFileDifference[];
  mergeBase: string;
};

type CliOptions = {
  baseRef: string;
  branchRef?: string;
};

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });

  return stdout;
}

async function resolveCommit(ref: string, cwd: string): Promise<string> {
  return (
    await git(cwd, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${ref}^{commit}`
    ])
  ).trim();
}

async function getCurrentBranchRef(cwd: string): Promise<string> {
  try {
    const branch = (
      await git(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
    ).trim();

    return branch || 'HEAD';
  } catch {
    return 'HEAD';
  }
}

async function readGitFile(
  commit: string,
  filePath: MandatoryContextFile,
  cwd: string
): Promise<string | null> {
  try {
    return await git(cwd, ['show', `${commit}:${filePath}`]);
  } catch {
    return null;
  }
}

async function getCommitTimestamp(
  commit: string,
  cwd: string
): Promise<number> {
  const timestamp = Number.parseInt(
    (await git(cwd, ['show', '-s', '--format=%ct', commit])).trim(),
    10
  );

  if (!Number.isSafeInteger(timestamp)) {
    throw new Error(
      `Git did not return a valid committer timestamp for ${commit}`
    );
  }

  return timestamp;
}

function byteSize(content: string | null): number | null {
  return content === null ? null : Buffer.byteLength(content, 'utf8');
}

function collectDifferences(
  baseContents: ReadonlyMap<MandatoryContextFile, string | null>,
  branchContents: ReadonlyMap<MandatoryContextFile, string | null>
): ContextFileDifference[] {
  const differences: ContextFileDifference[] = [];

  for (const filePath of MANDATORY_CONTEXT_FILES) {
    const baseContent = baseContents.get(filePath) ?? null;
    const branchContent = branchContents.get(filePath) ?? null;
    const comparison: ContextFileDifference['comparison'] = 'content';
    const differs = baseContent !== branchContent;

    if (differs) {
      differences.push({
        baseBytes: byteSize(baseContent),
        branchBytes: byteSize(branchContent),
        comparison,
        path: filePath
      });
    }
  }

  return differences;
}

export async function checkBranchContextDrift(options: {
  baseRef?: string;
  branchRef?: string;
  cwd?: string;
}): Promise<BranchContextDriftWarning | null> {
  const cwd = options.cwd ?? process.cwd();
  const baseRef = options.baseRef ?? 'origin/main';
  const branchRef = options.branchRef ?? (await getCurrentBranchRef(cwd));
  const [baseCommit, branchCommit] = await Promise.all([
    resolveCommit(baseRef, cwd),
    resolveCommit(branchRef, cwd)
  ]);
  const versions = await Promise.all(
    MANDATORY_CONTEXT_FILES.map(async (filePath) => ({
      baseContent: await readGitFile(baseCommit, filePath, cwd),
      branchContent: await readGitFile(branchCommit, filePath, cwd),
      filePath
    }))
  );
  const baseContents = new Map<MandatoryContextFile, string | null>();
  const branchContents = new Map<MandatoryContextFile, string | null>();

  for (const version of versions) {
    baseContents.set(version.filePath, version.baseContent);
    branchContents.set(version.filePath, version.branchContent);
  }

  const differences = collectDifferences(baseContents, branchContents);

  if (differences.length === 0) {
    return null;
  }

  const mergeBase = (
    await git(cwd, ['merge-base', baseCommit, branchCommit])
  ).trim();
  const commitsSinceMergeBase = Number.parseInt(
    (
      await git(cwd, ['rev-list', '--count', `${mergeBase}..${branchCommit}`])
    ).trim(),
    10
  );
  const [baseTimestamp, mergeBaseTimestamp] = await Promise.all([
    getCommitTimestamp(baseCommit, cwd),
    getCommitTimestamp(mergeBase, cwd)
  ]);
  const baseSecondsSinceMergeBase = baseTimestamp - mergeBaseTimestamp;

  if (
    commitsSinceMergeBase < BRANCH_AGE_THRESHOLD_COMMITS &&
    baseSecondsSinceMergeBase < BRANCH_AGE_THRESHOLD_SECONDS
  ) {
    return null;
  }

  return {
    baseRef,
    baseSecondsSinceMergeBase,
    branchCommitsSinceMergeBase: commitsSinceMergeBase,
    branchRef,
    differences,
    mergeBase
  };
}

function formatByteSize(size: number | null): string {
  return size === null ? 'missing' : `${size} bytes`;
}

export function formatBranchContextDriftWarning(
  warning: BranchContextDriftWarning
): string {
  const files = warning.differences.map((difference) => {
    const kind = 'content differs';

    return `- ${difference.path}: ${kind}; base=${formatByteSize(
      difference.baseBytes
    )}; branch=${formatByteSize(difference.branchBytes)}`;
  });

  return [
    'WARNING: mandatory context drift detected',
    `branch: ${warning.branchRef}`,
    `base: ${warning.baseRef}`,
    `merge_base: ${warning.mergeBase}`,
    `branch_commits_since_merge_base: ${warning.branchCommitsSinceMergeBase} (threshold: ${BRANCH_AGE_THRESHOLD_COMMITS})`,
    `base_seconds_since_merge_base: ${warning.baseSecondsSinceMergeBase} (threshold: ${BRANCH_AGE_THRESHOLD_SECONDS})`,
    'drifted_files:',
    ...files,
    `suggested_fix: git merge ${warning.baseRef}`,
    `alternative_fix: git rebase ${warning.baseRef}`
  ].join('\n');
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  const positional: string[] = [];
  let baseRef: string | undefined;
  let branchRef: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--base' || argument === '--branch') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error(`Missing value for ${argument}`);
      }

      if (argument === '--base') {
        baseRef = value;
      } else {
        branchRef = value;
      }

      index += 1;
      continue;
    }

    if (argument.startsWith('--base=')) {
      baseRef = argument.slice('--base='.length);
      continue;
    }

    if (argument.startsWith('--branch=')) {
      branchRef = argument.slice('--branch='.length);
      continue;
    }

    if (argument.startsWith('--')) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    positional.push(argument);
  }

  if (positional.length > 2) {
    throw new Error(
      'Expected at most two positional arguments: [base-ref] [branch-ref]'
    );
  }

  if (baseRef !== undefined && positional[0] !== undefined) {
    throw new Error(
      'Specify the base ref with either --base or a positional argument, not both'
    );
  }

  if (branchRef !== undefined && positional[1] !== undefined) {
    throw new Error(
      'Specify the branch ref with either --branch or a positional argument, not both'
    );
  }

  return {
    baseRef: baseRef ?? positional[0] ?? 'origin/main',
    branchRef: branchRef ?? positional[1]
  };
}

export async function runCli(
  argv = process.argv.slice(2),
  log: Pick<Console, 'error' | 'log'> = console
): Promise<number> {
  try {
    const options = parseCliArgs(argv);
    const warning = await checkBranchContextDrift(options);

    if (warning) {
      log.log(formatBranchContextDriftWarning(warning));
    }
  } catch (error) {
    // This phase is deliberately warn-only. Operational failures are visible
    // in CI logs, but cannot block a pull request while the check matures.
    const message = error instanceof Error ? error.message : String(error);
    log.error(`WARNING: branch context drift check could not run: ${message}`);
  }

  return 0;
}

if (isExecutedAsScript(import.meta.url)) {
  void runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
