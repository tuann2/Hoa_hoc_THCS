import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';
import {
  PATH_GATE_RULES,
  PROFILE_GATE_IDS,
  PROFILE_NAMES,
  type GateId,
  type ProfileName,
  isProfileName
} from './gates-manifest';

const execFileAsync = promisify(execFile);

export type ClassifiedPath = {
  path: string;
  matched: boolean;
  reason: string;
  gates: GateId[];
};

export type ChangeClassification = {
  classifiedPaths: ClassifiedPath[];
  fallbackToFull: boolean;
  minimumProfile: ProfileName;
  requiredGates: GateId[];
  unknownPaths: string[];
};

type ClassifyOptions = {
  changedPaths: readonly string[];
  declaredProfile?: ProfileName;
};

function sortGateIds(gateIds: Iterable<GateId>): GateId[] {
  const indexByGateId = new Map(
    PROFILE_GATE_IDS.full.map((gateId, index) => [gateId, index] as const)
  );

  return [...new Set(gateIds)].sort(
    (left, right) =>
      (indexByGateId.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (indexByGateId.get(right) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function inferMinimumProfile(
  requiredGates: readonly GateId[]
): ProfileName {
  const requiredGateSet = new Set(requiredGates);

  if (
    requiredGates.length > 0 &&
    PROFILE_GATE_IDS.docs.every(
      (gateId) =>
        !requiredGateSet.has(gateId) || PROFILE_GATE_IDS.docs.includes(gateId)
    ) &&
    requiredGates.every((gateId) => PROFILE_GATE_IDS.docs.includes(gateId))
  ) {
    return 'docs';
  }

  if (requiredGates.every((gateId) => PROFILE_GATE_IDS.web.includes(gateId))) {
    return 'web';
  }

  return 'full';
}

export function classifyChangedPaths(
  options: ClassifyOptions
): ChangeClassification {
  const classifiedPaths: ClassifiedPath[] = [];
  const requiredGates = new Set<GateId>();
  const unknownPaths: string[] = [];

  for (const changedPath of options.changedPaths) {
    const matchedRule = PATH_GATE_RULES.find((rule) =>
      rule.pattern.test(changedPath)
    );

    if (!matchedRule) {
      const gates = [...PROFILE_GATE_IDS.full];

      gates.forEach((gateId) => requiredGates.add(gateId));
      unknownPaths.push(changedPath);
      classifiedPaths.push({
        path: changedPath,
        matched: false,
        reason: 'unrecognized path; fail closed to full',
        gates
      });
      continue;
    }

    matchedRule.gates.forEach((gateId) => requiredGates.add(gateId));
    classifiedPaths.push({
      path: changedPath,
      matched: true,
      reason: matchedRule.reason,
      gates: [...matchedRule.gates]
    });
  }

  const orderedRequiredGates = sortGateIds(requiredGates);
  const minimumProfile = inferMinimumProfile(orderedRequiredGates);

  if (options.declaredProfile) {
    const declaredProfileGates = new Set(
      PROFILE_GATE_IDS[options.declaredProfile]
    );
    const missingGates = orderedRequiredGates.filter(
      (gateId) => !declaredProfileGates.has(gateId)
    );

    if (missingGates.length > 0) {
      throw new Error(
        `Declared profile "${options.declaredProfile}" under-classifies this change. Required profile: ${minimumProfile}. Missing gates: ${missingGates.join(', ')}`
      );
    }
  }

  return {
    classifiedPaths,
    fallbackToFull: unknownPaths.length > 0,
    minimumProfile,
    requiredGates: orderedRequiredGates,
    unknownPaths
  };
}

export async function getChangedPathsFromBase(
  baseSha: string,
  cwd = process.cwd()
): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACDMRTUXB', baseSha, 'HEAD'],
    {
      cwd,
      encoding: 'utf8'
    }
  );

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

type CliOptions = {
  baseSha?: string;
  changedPaths: string[];
  declaredProfile?: ProfileName;
  json: boolean;
};

function parseCliArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    changedPaths: [],
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--changed-path') {
      const path = argv[index + 1];

      if (!path) {
        throw new Error('Missing value for --changed-path');
      }

      options.changedPaths.push(path);
      index += 1;
      continue;
    }

    if (argument.startsWith('--changed-path=')) {
      options.changedPaths.push(argument.slice('--changed-path='.length));
      continue;
    }

    if (argument === '--changed-from') {
      const baseSha = argv[index + 1];

      if (!baseSha) {
        throw new Error('Missing value for --changed-from');
      }

      options.baseSha = baseSha;
      index += 1;
      continue;
    }

    if (argument.startsWith('--changed-from=')) {
      options.baseSha = argument.slice('--changed-from='.length);
      continue;
    }

    if (argument === '--declared-profile') {
      const profile = argv[index + 1];

      if (!profile || !isProfileName(profile)) {
        throw new Error(
          `Invalid value for --declared-profile. Expected one of: ${PROFILE_NAMES.join(', ')}`
        );
      }

      options.declaredProfile = profile;
      index += 1;
      continue;
    }

    if (argument.startsWith('--declared-profile=')) {
      const profile = argument.slice('--declared-profile='.length);

      if (!isProfileName(profile)) {
        throw new Error(
          `Invalid value for --declared-profile. Expected one of: ${PROFILE_NAMES.join(', ')}`
        );
      }

      options.declaredProfile = profile;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseCliArgs(argv);
  const changedPaths =
    options.baseSha && options.changedPaths.length === 0
      ? await getChangedPathsFromBase(options.baseSha)
      : options.changedPaths;

  if (changedPaths.length === 0) {
    throw new Error(
      'No changed paths found. Pass --changed-path or --changed-from=<base_sha>.'
    );
  }

  const result = classifyChangedPaths({
    changedPaths,
    declaredProfile: options.declaredProfile
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Minimum profile: ${result.minimumProfile}`);
    console.log(`Required gates: ${result.requiredGates.join(', ')}`);

    if (result.unknownPaths.length > 0) {
      console.warn(`Unknown paths: ${result.unknownPaths.join(', ')}`);
    }
  }

  return 0;
}

if (isExecutedAsScript(import.meta.url)) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
