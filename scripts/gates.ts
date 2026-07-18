import { spawn } from 'node:child_process';
import {
  classifyChangedPaths,
  getChangedPathsFromBase,
  type ChangeClassification
} from './classify-change';
import { isExecutedAsScript } from './cli';
import {
  PROFILE_NAMES,
  getGateCommand,
  getGateDefinition,
  getProfileGateIds,
  isGateId,
  isProfileName,
  type GateId,
  type ProfileName
} from './gates-manifest';

export type GateExecutionResult = {
  id: GateId;
  command: string[];
  durationMs: number;
  exitCode: number;
};

export type GatesRunResult = {
  classification?: ChangeClassification;
  finishedAt: string;
  gateResults: GateExecutionResult[];
  mode: 'profile' | 'changed-from';
  profile?: ProfileName;
  result: 'pass' | 'fail';
  startedAt: string;
};

type Executor = (command: readonly [string, ...string[]]) => Promise<number>;

type RunGatesOptions = {
  changedFrom?: string;
  cwd?: string;
  dryRun?: boolean;
  executor?: Executor;
  log?: Pick<Console, 'error' | 'log'>;
  profile?: ProfileName;
};

type CliOptions = {
  changedFrom?: string;
  dryRun: boolean;
  json: boolean;
  profile?: ProfileName;
};

export function createDefaultExecutor(
  cwd: string,
  log: Pick<Console, 'error'>
): Executor {
  return async (command) =>
    new Promise<number>((resolve) => {
      const child = spawn(command[0], [...command.slice(1)], {
        cwd,
        env: process.env,
        stdio: 'inherit'
      });

      child.on('error', (error) => {
        log.error(
          `Failed to start gate command "${formatCommand(command)}": ${error.message}`
        );
        resolve(127);
      });
      child.on('exit', (code) => {
        resolve(code ?? 1);
      });
    });
}

function formatCommand(command: readonly string[]): string {
  return command.join(' ');
}

function normalizeGateSelection(gateIds: readonly string[]): GateId[] {
  const normalized: GateId[] = [];

  for (const gateId of gateIds) {
    if (!isGateId(gateId)) {
      throw new Error(`Unknown gate ID: ${gateId}`);
    }

    normalized.push(gateId);
  }

  return normalized;
}

export function resolveGateExecutionOrder(
  selectedGateIds: readonly string[]
): GateId[] {
  const indexByGateId = new Map(
    getProfileGateIds('full').map((gateId, index) => [gateId, index] as const)
  );
  const selection = [
    ...new Set(
      normalizeGateSelection(selectedGateIds).sort(
        (left, right) =>
          (indexByGateId.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (indexByGateId.get(right) ?? Number.MAX_SAFE_INTEGER)
      )
    )
  ];
  const ordered: GateId[] = [];
  const visiting = new Set<GateId>();
  const visited = new Set<GateId>();

  const visit = (gateId: GateId) => {
    if (visited.has(gateId)) {
      return;
    }

    if (visiting.has(gateId)) {
      throw new Error(`Circular gate prerequisite detected at ${gateId}`);
    }

    visiting.add(gateId);

    for (const prerequisite of getGateDefinition(gateId).prerequisites) {
      visit(prerequisite);
    }

    visiting.delete(gateId);
    visited.add(gateId);

    if (!ordered.includes(gateId)) {
      ordered.push(gateId);
    }
  };

  for (const gateId of selection) {
    visit(gateId);
  }

  return ordered;
}

function selectGateIdsFromClassification(
  classification: ChangeClassification
): GateId[] {
  return [...getProfileGateIds(classification.minimumProfile)];
}

export async function runSelectedGates(
  gateIds: readonly string[],
  options: Pick<RunGatesOptions, 'cwd' | 'dryRun' | 'executor' | 'log'>
): Promise<{ gateResults: GateExecutionResult[]; result: 'pass' | 'fail' }> {
  const log = options.log ?? console;
  const cwd = options.cwd ?? process.cwd();
  const executor = options.executor ?? createDefaultExecutor(cwd, log);
  const gateResults: GateExecutionResult[] = [];
  const executionOrder = resolveGateExecutionOrder(gateIds);

  for (const gateId of executionOrder) {
    const command = getGateCommand(gateId);
    const startedAt = Date.now();

    log.log(
      `gate=${gateId} command="${formatCommand(command)}" status=running`
    );

    const exitCode = options.dryRun ? 0 : await executor(command);
    const durationMs = Date.now() - startedAt;

    gateResults.push({
      id: gateId,
      command: [...command],
      durationMs,
      exitCode
    });

    log.log(
      `gate=${gateId} command="${formatCommand(command)}" exit_code=${exitCode} duration_ms=${durationMs}`
    );

    if (exitCode !== 0) {
      return {
        gateResults,
        result: 'fail'
      };
    }
  }

  return {
    gateResults,
    result: 'pass'
  };
}

export async function runGates(
  options: RunGatesOptions
): Promise<GatesRunResult> {
  if (!options.profile && !options.changedFrom) {
    throw new Error('Pass --profile=<name> or --changed-from=<base_sha>.');
  }

  const startedAt = new Date().toISOString();
  let selectedGateIds: GateId[];
  let classification: ChangeClassification | undefined;
  let mode: GatesRunResult['mode'];

  if (options.changedFrom) {
    const changedPaths = await getChangedPathsFromBase(
      options.changedFrom,
      options.cwd
    );

    if (changedPaths.length === 0) {
      throw new Error('No changed paths found for the requested base SHA.');
    }

    classification = classifyChangedPaths({
      changedPaths,
      declaredProfile: options.profile
    });
    selectedGateIds = selectGateIdsFromClassification(classification);
    mode = 'changed-from';
  } else {
    selectedGateIds = [...getProfileGateIds(options.profile as ProfileName)];
    mode = 'profile';
  }

  const { gateResults, result } = await runSelectedGates(selectedGateIds, {
    cwd: options.cwd,
    dryRun: options.dryRun,
    executor: options.executor,
    log: options.log
  });

  return {
    classification,
    finishedAt: new Date().toISOString(),
    gateResults,
    mode,
    profile: options.profile ?? classification?.minimumProfile,
    result,
    startedAt
  };
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--profile') {
      const profile = argv[index + 1];

      if (!profile || !isProfileName(profile)) {
        throw new Error(
          `Invalid value for --profile. Expected one of: ${PROFILE_NAMES.join(', ')}`
        );
      }

      options.profile = profile;
      index += 1;
      continue;
    }

    if (argument.startsWith('--profile=')) {
      const profile = argument.slice('--profile='.length);

      if (!isProfileName(profile)) {
        throw new Error(
          `Invalid value for --profile. Expected one of: ${PROFILE_NAMES.join(', ')}`
        );
      }

      options.profile = profile;
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
  const result = await runGates({
    changedFrom: options.changedFrom,
    dryRun: options.dryRun,
    profile: options.profile
  });

  console.log(JSON.stringify(result, null, 2));
  return result.result === 'pass' ? 0 : 1;
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
