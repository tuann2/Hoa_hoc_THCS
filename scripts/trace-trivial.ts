import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  classifyTrivial,
  type TrivialClassification
} from './classify-trivial';
import { isExecutedAsScript } from './cli';
import { computeSnapshot, getCandidateSha, type SnapshotId } from './evidence';
import type { GateId } from './gates-manifest';
import { runSelectedGates } from './gates';

export const TRACE_DIRECTORY = 'docs/trace/trivial';

export type TrivialTraceRecord = {
  request_class: 'change';
  risk_tier: 'TRIVIAL';
  base_sha: string;
  validated_snapshot: SnapshotId;
  changed_paths: string[];
  selected_gates: GateId[];
  result: 'PASS' | 'FAIL';
  timestamp_utc: string;
};

type Executor = Parameters<typeof runSelectedGates>[1]['executor'];

export function renderTraceYaml(record: TrivialTraceRecord): string {
  const lines = [
    `request_class: ${record.request_class}`,
    `risk_tier: ${record.risk_tier}`,
    `base_sha: ${record.base_sha}`,
    'validated_snapshot:',
    `  kind: ${record.validated_snapshot.kind}`,
    `  id: ${record.validated_snapshot.id}`,
    'changed_paths:',
    ...record.changed_paths.map((entry) => `  - ${entry}`),
    'selected_gates:',
    ...record.selected_gates.map((entry) => `  - ${entry}`),
    `result: ${record.result}`,
    `timestamp_utc: ${record.timestamp_utc}`
  ];

  return `${lines.join('\n')}\n`;
}

export function parseTraceYaml(content: string): TrivialTraceRecord {
  const lines = content.split(/\r?\n/u);
  const scalars = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const nested = new Map<string, Map<string, string>>();
  let currentList: string[] | null = null;
  let currentNested: Map<string, string> | null = null;

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const listItem = /^ {2}- (.+)$/u.exec(line);

    if (listItem && currentList) {
      currentList.push(listItem[1] ?? '');
      continue;
    }

    const nestedItem = /^ {2}([A-Za-z_]+): (.+)$/u.exec(line);

    if (nestedItem && currentNested) {
      currentNested.set(nestedItem[1] ?? '', nestedItem[2] ?? '');
      continue;
    }

    const key = /^([A-Za-z_]+):(?: (.*))?$/u.exec(line);

    if (!key) {
      throw new Error(`Invalid trace line: ${line}`);
    }

    const [, name, value] = key;

    currentList = null;
    currentNested = null;

    if (value === undefined || value.length === 0) {
      if (name === 'validated_snapshot') {
        currentNested = new Map();
        nested.set(name ?? '', currentNested);
      } else {
        currentList = [];
        lists.set(name ?? '', currentList);
      }
    } else {
      scalars.set(name ?? '', value);
    }
  }

  const required = (key: string): string => {
    const value = scalars.get(key);

    if (!value) {
      throw new Error(`Trace file is missing required field: ${key}`);
    }

    return value;
  };
  const snapshotFields = nested.get('validated_snapshot');
  const snapshotKind = snapshotFields?.get('kind');
  const snapshotId = snapshotFields?.get('id');

  if (
    !snapshotFields ||
    !snapshotId ||
    (snapshotKind !== 'git-tree' && snapshotKind !== 'manifest')
  ) {
    throw new Error(
      'Trace file is missing a valid validated_snapshot (kind, id).'
    );
  }

  const requestClass = required('request_class');
  const riskTier = required('risk_tier');
  const result = required('result');

  if (requestClass !== 'change') {
    throw new Error(`Invalid request_class in trace file: ${requestClass}`);
  }

  if (riskTier !== 'TRIVIAL') {
    throw new Error(`Invalid risk_tier in trace file: ${riskTier}`);
  }

  if (result !== 'PASS' && result !== 'FAIL') {
    throw new Error(`Invalid result in trace file: ${result}`);
  }

  const changedPaths = lists.get('changed_paths');
  const selectedGates = lists.get('selected_gates');

  if (!changedPaths || changedPaths.length === 0) {
    throw new Error('Trace file must list at least one changed path.');
  }

  if (!selectedGates || selectedGates.length === 0) {
    throw new Error('Trace file must list the selected gates.');
  }

  return {
    request_class: 'change',
    risk_tier: 'TRIVIAL',
    base_sha: required('base_sha'),
    validated_snapshot: { kind: snapshotKind, id: snapshotId } as SnapshotId,
    changed_paths: changedPaths,
    selected_gates: selectedGates as GateId[],
    result,
    timestamp_utc: required('timestamp_utc')
  };
}

export async function traceTrivial(options: {
  changedFrom: string;
  cwd?: string;
  dryRun?: boolean;
  executor?: Executor;
  log?: Pick<Console, 'error' | 'log'>;
}): Promise<{
  classification: TrivialClassification;
  exitCode: number;
  filePath: string | null;
  record: TrivialTraceRecord | null;
}> {
  const cwd = options.cwd ?? process.cwd();
  const log = options.log ?? console;
  const classification = await classifyTrivial({
    changedFrom: options.changedFrom,
    cwd
  });

  if (classification.verdict === 'ESCALATE') {
    log.error(classification.escalationGuidance ?? 'ESCALATE');

    return { classification, exitCode: 1, filePath: null, record: null };
  }

  const { result } = await runSelectedGates(classification.selectedGates, {
    cwd,
    dryRun: options.dryRun,
    executor: options.executor,
    log: options.log
  });
  const { snapshot } = await computeSnapshot(cwd);
  const candidateSha = await getCandidateSha(cwd);
  const shortSha =
    candidateSha === 'UNCOMMITTED'
      ? `uncommitted-${snapshot.id.slice(0, 12)}`
      : candidateSha.slice(0, 12);
  const timestamp = new Date().toISOString();
  const record: TrivialTraceRecord = {
    request_class: 'change',
    risk_tier: 'TRIVIAL',
    base_sha: options.changedFrom,
    validated_snapshot: snapshot,
    changed_paths: classification.paths.map((entry) => entry.path),
    selected_gates: [...classification.selectedGates],
    result: result === 'pass' ? 'PASS' : 'FAIL',
    timestamp_utc: timestamp
  };
  const fileName = `${timestamp.slice(0, 10).replace(/-/gu, '')}-${shortSha}.yaml`;
  const filePath = path.join(TRACE_DIRECTORY, fileName);

  if (!options.dryRun) {
    await mkdir(path.join(cwd, TRACE_DIRECTORY), { recursive: true });
    await writeFile(path.join(cwd, filePath), renderTraceYaml(record));
  }

  log.log(`trace=${filePath} result=${record.result}`);

  return {
    classification,
    exitCode: result === 'pass' ? 0 : 1,
    filePath,
    record
  };
}

export async function verifyTrace(options: {
  changedFrom: string;
  cwd?: string;
  tracePath: string;
  log?: Pick<Console, 'error' | 'log'>;
}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const log = options.log ?? console;
  const normalizedTracePath = path
    .relative(cwd, path.resolve(cwd, options.tracePath))
    .replaceAll('\\', '/');

  if (!normalizedTracePath.startsWith(`${TRACE_DIRECTORY}/`)) {
    log.error(
      `Trace verification failed: trace file must live under ${TRACE_DIRECTORY}/.`
    );

    return 1;
  }

  const record = parseTraceYaml(
    await readFile(path.resolve(cwd, options.tracePath), 'utf8')
  );

  // The verdict is recomputed from the actual git diff; the trace file's own
  // changed_paths are never trusted as the classification input. Only the
  // trace file under verification itself is excluded from the diff.
  const classification = await classifyTrivial({
    changedFrom: options.changedFrom,
    cwd,
    ignorePaths: [normalizedTracePath]
  });

  if (classification.verdict !== 'TRIVIAL') {
    log.error(
      `Trace verification failed: recomputed verdict is ESCALATE. ${classification.escalationGuidance ?? ''}`
    );

    return 1;
  }

  const actualPaths = classification.paths.map((entry) => entry.path).sort();
  const declaredPaths = [...record.changed_paths].sort();

  if (JSON.stringify(actualPaths) !== JSON.stringify(declaredPaths)) {
    log.error(
      'Trace verification failed: declared changed_paths do not match the ' +
        `actual diff. Declared: [${declaredPaths.join(', ')}]. ` +
        `Actual: [${actualPaths.join(', ')}]`
    );

    return 1;
  }

  if (record.result !== 'PASS') {
    log.error('Trace verification failed: recorded result is not PASS.');

    return 1;
  }

  log.log('Trace verification passed: machine verdict is TRIVIAL.');

  return 0;
}

type CliOptions = {
  changedFrom?: string;
  dryRun: boolean;
  verify?: string;
};

function parseCliArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
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

    if (argument === '--verify') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --verify');
      }

      options.verify = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--verify=')) {
      options.verify = argument.slice('--verify='.length);
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

  if (options.verify) {
    return verifyTrace({
      changedFrom: options.changedFrom,
      tracePath: options.verify
    });
  }

  const { exitCode } = await traceTrivial({
    changedFrom: options.changedFrom,
    dryRun: options.dryRun
  });

  return exitCode;
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
