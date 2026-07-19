import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';
import type { GateId } from './gates-manifest';
import {
  TRIVIAL_ALLOWLIST_PATH_RULES,
  TRIVIAL_CODE_FENCE_DELIMITER_PATTERN,
  TRIVIAL_COMMAND_REFERENCE_PATTERN,
  TRIVIAL_DENYLIST_PATH_RULES,
  TRIVIAL_GATE_IDS,
  TRIVIAL_NUMERIC_TABLE_ROW_PATTERN,
  TRIVIAL_PATH_REFERENCE_PATTERN
} from './trivial-policy';

const execFileAsync = promisify(execFile);

export type ChangedFileStatus =
  | {
      path: string;
      status: 'added' | 'deleted' | 'modified' | 'type-changed' | 'unmerged';
    }
  | { path: string; status: 'renamed' | 'copied'; oldPath: string };

export type TrivialVerdict = 'TRIVIAL' | 'ESCALATE';

export type TrivialPathVerdict = {
  path: string;
  verdict: TrivialVerdict;
  reasons: string[];
};

export type TrivialClassification = {
  verdict: TrivialVerdict;
  paths: TrivialPathVerdict[];
  selectedGates: readonly GateId[];
  escalationGuidance: string | null;
};

const STATUS_BY_LETTER: Record<
  string,
  'added' | 'deleted' | 'modified' | 'type-changed' | 'unmerged'
> = {
  A: 'added',
  D: 'deleted',
  M: 'modified',
  T: 'type-changed',
  U: 'unmerged',
  X: 'unmerged',
  B: 'unmerged'
};

// Any status other than plain 'modified' wins when the same path appears with
// different statuses across the committed and dirty scans.
function statusSeverity(status: ChangedFileStatus['status']): number {
  return status === 'modified' ? 0 : 1;
}

function parseNameStatusOutput(stdout: string): ChangedFileStatus[] {
  const entries = stdout
    .split('\u0000')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const statuses: ChangedFileStatus[] = [];

  for (let index = 0; index < entries.length; ) {
    const status = entries[index];

    if (!status) {
      index += 1;
      continue;
    }

    if (/^[RC]/u.test(status)) {
      const oldPath = entries[index + 1];
      const newPath = entries[index + 2];

      if (oldPath && newPath) {
        statuses.push({
          path: newPath,
          status: status.startsWith('R') ? 'renamed' : 'copied',
          oldPath
        });
      }

      index += 3;
      continue;
    }

    const changedPath = entries[index + 1];
    const mapped = STATUS_BY_LETTER[status.charAt(0)];

    if (changedPath && mapped) {
      statuses.push({ path: changedPath, status: mapped });
    }

    index += 2;
  }

  return statuses;
}

export async function getChangedFileStatuses(
  baseSha: string,
  cwd = process.cwd()
): Promise<ChangedFileStatus[]> {
  const [committed, trackedDirty, untracked] = await Promise.all([
    execFileAsync(
      'git',
      [
        'diff',
        '--name-status',
        '-z',
        '--diff-filter=ACDMRTUXB',
        baseSha,
        'HEAD'
      ],
      { cwd, encoding: 'utf8' }
    ),
    execFileAsync(
      'git',
      ['diff', '--name-status', '-z', '--diff-filter=ACDMRTUXB', 'HEAD'],
      { cwd, encoding: 'utf8' }
    ),
    execFileAsync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
      cwd,
      encoding: 'utf8'
    })
  ]);

  const byPath = new Map<string, ChangedFileStatus>();
  const record = (entry: ChangedFileStatus) => {
    const existing = byPath.get(entry.path);

    if (
      !existing ||
      statusSeverity(entry.status) > statusSeverity(existing.status)
    ) {
      byPath.set(entry.path, entry);
    }
  };

  for (const entry of parseNameStatusOutput(committed.stdout)) {
    record(entry);
  }

  for (const entry of parseNameStatusOutput(trackedDirty.stdout)) {
    record(entry);
  }

  for (const line of untracked.stdout.split('\u0000')) {
    const trimmed = line.trim();

    if (trimmed.length > 0) {
      record({ path: trimmed, status: 'added' });
    }
  }

  return [...byPath.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

function isMalformedPath(changedPath: string, cwd: string): boolean {
  if (changedPath !== changedPath.normalize('NFC')) {
    return true;
  }

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/u.test(changedPath)) {
    return true;
  }

  if (path.isAbsolute(changedPath)) {
    return true;
  }

  const resolved = path.resolve(cwd, changedPath);
  const relative = path.relative(cwd, resolved);

  return relative.startsWith('..') || path.isAbsolute(relative);
}

async function readFileVersion(
  ref: string,
  filePath: string,
  cwd: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['show', `${ref}:${filePath}`],
      {
        cwd,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
      }
    );

    return stdout;
  } catch {
    return null;
  }
}

async function getUnifiedDiffChangedLines(
  baseSha: string,
  filePath: string,
  cwd: string
): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--unified=0', baseSha, '--', filePath],
    { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );

  return stdout
    .split('\n')
    .filter(
      (line) =>
        (line.startsWith('+') || line.startsWith('-')) &&
        !line.startsWith('+++') &&
        !line.startsWith('---')
    )
    .map((line) => line.slice(1));
}

function collectFenceLineRanges(content: string): Array<[number, number]> {
  const lines = content.split(/\r?\n/u);
  const ranges: Array<[number, number]> = [];
  let openAt: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    if (TRIVIAL_CODE_FENCE_DELIMITER_PATTERN.test(lines[index] ?? '')) {
      if (openAt === null) {
        openAt = index;
      } else {
        ranges.push([openAt, index]);
        openAt = null;
      }
    }
  }

  if (openAt !== null) {
    ranges.push([openAt, lines.length - 1]);
  }

  return ranges;
}

function contentLinesInsideFences(content: string | null): Set<string> {
  if (content === null) {
    return new Set();
  }

  const lines = content.split(/\r?\n/u);
  const inside = new Set<string>();

  for (const [start, end] of collectFenceLineRanges(content)) {
    for (let index = start; index <= end; index += 1) {
      const line = lines[index];

      if (line !== undefined) {
        inside.add(line);
      }
    }
  }

  return inside;
}

async function findHardTriggers(
  baseSha: string,
  filePath: string,
  cwd: string
): Promise<string[]> {
  const triggers = new Set<string>();
  const changedLines = await getUnifiedDiffChangedLines(baseSha, filePath, cwd);
  const [oldContent, newContent] = await Promise.all([
    readFileVersion(baseSha, filePath, cwd),
    readFile(path.join(cwd, filePath), 'utf8').catch(() => null)
  ]);
  const fencedOld = contentLinesInsideFences(oldContent);
  const fencedNew = contentLinesInsideFences(newContent);

  for (const line of changedLines) {
    if (TRIVIAL_COMMAND_REFERENCE_PATTERN.test(line)) {
      triggers.add('hard-trigger: command-reference');
    }

    if (TRIVIAL_PATH_REFERENCE_PATTERN.test(line)) {
      triggers.add('hard-trigger: path-reference');
    }

    if (
      TRIVIAL_CODE_FENCE_DELIMITER_PATTERN.test(line) ||
      fencedOld.has(line) ||
      fencedNew.has(line)
    ) {
      triggers.add('hard-trigger: code-fence');
    }

    if (TRIVIAL_NUMERIC_TABLE_ROW_PATTERN.test(line)) {
      triggers.add('hard-trigger: numeric-in-table');
    }
  }

  return [...triggers].sort();
}

function buildEscalationGuidance(paths: TrivialPathVerdict[]): string {
  const details = paths
    .filter((entry) => entry.verdict === 'ESCALATE')
    .map((entry) => `${entry.path}: ${entry.reasons.join(', ')}`)
    .join('; ');

  return (
    'ESCALATE: this change does not qualify for TRIVIAL. ' +
    'Open a NORMAL+ plan (see docs/plans/_TEMPLATE.md) and follow the ' +
    `standard workflow. Reasons: ${details || 'no changed paths detected'}`
  );
}

export async function classifyTrivial(options: {
  changedFrom: string;
  cwd?: string;
  // Exact paths to exclude from classification. Used only by trace
  // verification to exclude the single trace file under verification; never
  // pass user-controlled lists here.
  ignorePaths?: readonly string[];
}): Promise<TrivialClassification> {
  const cwd = options.cwd ?? process.cwd();
  const ignored = new Set(options.ignorePaths ?? []);
  const statuses = (
    await getChangedFileStatuses(options.changedFrom, cwd)
  ).filter((entry) => !ignored.has(entry.path));
  const paths: TrivialPathVerdict[] = [];

  for (const entry of statuses) {
    const reasons: string[] = [];

    if (isMalformedPath(entry.path, cwd)) {
      reasons.push('malformed-or-non-normalized-path');
    } else {
      const denyMatch = TRIVIAL_DENYLIST_PATH_RULES.find((rule) =>
        rule.pattern.test(entry.path)
      );

      if (denyMatch) {
        reasons.push(`denylist: ${denyMatch.reason}`);
      }

      if (entry.status !== 'modified') {
        reasons.push(`non-modified-status: ${entry.status}`);
      }

      if (
        reasons.length === 0 &&
        !TRIVIAL_ALLOWLIST_PATH_RULES.some((rule) =>
          rule.pattern.test(entry.path)
        )
      ) {
        reasons.push('outside-allowlist');
      }

      if (reasons.length === 0) {
        reasons.push(
          ...(await findHardTriggers(options.changedFrom, entry.path, cwd))
        );
      }
    }

    paths.push({
      path: entry.path,
      verdict: reasons.length === 0 ? 'TRIVIAL' : 'ESCALATE',
      reasons
    });
  }

  const verdict: TrivialVerdict =
    paths.length > 0 && paths.every((entry) => entry.verdict === 'TRIVIAL')
      ? 'TRIVIAL'
      : 'ESCALATE';

  return {
    verdict,
    paths,
    selectedGates: verdict === 'TRIVIAL' ? TRIVIAL_GATE_IDS : [],
    escalationGuidance:
      verdict === 'ESCALATE' ? buildEscalationGuidance(paths) : null
  };
}

type CliOptions = {
  changedFrom?: string;
  json: boolean;
};

function parseCliArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--changed-from') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --changed-from');
      }

      options.changedFrom = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--changed-from=')) {
      options.changedFrom = argument.slice('--changed-from='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseCliArgs(argv);

  if (!options.changedFrom) {
    throw new Error('Pass --changed-from=<base_sha>.');
  }

  const classification = await classifyTrivial({
    changedFrom: options.changedFrom
  });

  if (options.json) {
    console.log(JSON.stringify(classification, null, 2));
  } else {
    console.log(`Verdict: ${classification.verdict}`);

    for (const entry of classification.paths) {
      console.log(
        `  ${entry.path}: ${entry.verdict}${
          entry.reasons.length > 0 ? ` (${entry.reasons.join(', ')})` : ''
        }`
      );
    }

    if (classification.escalationGuidance) {
      console.error(classification.escalationGuidance);
    }
  }

  return classification.verdict === 'TRIVIAL' ? 0 : 1;
}

if (isExecutedAsScript(import.meta.url)) {
  runCli().then(
    (exitCode) => {
      process.exit(exitCode);
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  );
}
