import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';
import {
  runGates,
  type GateExecutionResult,
  type GatesRunResult
} from './gates';
import { isProfileName, type ProfileName } from './gates-manifest';

const execFileAsync = promisify(execFile);

export type SnapshotId =
  | {
      id: string;
      kind: 'git-tree';
    }
  | {
      id: string;
      kind: 'manifest';
    };

export type EvidenceReport = {
  base_sha: string;
  candidate_sha: string;
  finished_at: string;
  gate_results: GateExecutionResult[];
  lockfile_sha256: string;
  node_version: string;
  npm_version: string;
  result: 'fail' | 'invalid' | 'pass';
  schema_version: 1;
  started_at: string;
  validated_snapshot: SnapshotId;
};

type EvidenceCliOptions = {
  changedFrom?: string;
  dryRun: boolean;
  profile?: ProfileName;
};

type GateRunner = (options: {
  changedFrom?: string;
  cwd?: string;
  dryRun?: boolean;
  profile?: ProfileName;
}) => Promise<GatesRunResult>;

type CreateEvidenceOptions = {
  changedFrom?: string;
  cwd?: string;
  dryRun?: boolean;
  gateRunner?: GateRunner;
  profile?: ProfileName;
};

type ManifestEntry = {
  content_hash: string | null;
  mode: number | null;
  path: string;
  status: 'present' | 'deleted';
  tracked: boolean;
};

function normalizeOutput(value: string): string {
  return value.trim();
}

async function execGit(
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8',
    env
  });

  return normalizeOutput(stdout);
}

async function execGitOrNull(
  args: readonly string[],
  cwd: string
): Promise<string | null> {
  try {
    return await execGit(args, cwd);
  } catch {
    return null;
  }
}

async function hasHeadCommit(cwd: string): Promise<boolean> {
  return (await execGitOrNull(['rev-parse', '--verify', 'HEAD'], cwd)) !== null;
}

export async function getBaseSha(cwd: string): Promise<string> {
  return (await execGitOrNull(['rev-parse', 'HEAD'], cwd)) ?? 'UNBORN';
}

export async function getCandidateSha(cwd: string): Promise<string> {
  const headSha = await execGitOrNull(['rev-parse', 'HEAD'], cwd);
  const status = await execGit(['status', '--short'], cwd);

  if (!headSha || status.length > 0) {
    return 'UNCOMMITTED';
  }

  return headSha;
}

async function getNpmVersion(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('npm', ['--version'], {
    cwd,
    encoding: 'utf8'
  });

  return normalizeOutput(stdout);
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(filePath));
  return hash.digest('hex');
}

async function computeGitTreeSnapshot(cwd: string): Promise<SnapshotId> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-004a-index-'));
  const indexFile = path.join(tempDir, 'index');

  await writeFile(indexFile, '', 'utf8');

  const env = {
    ...process.env,
    GIT_INDEX_FILE: indexFile
  };

  try {
    if (await hasHeadCommit(cwd)) {
      await execGit(['read-tree', 'HEAD'], cwd, env);
    } else {
      await execGit(['read-tree', '--empty'], cwd, env);
    }

    await execGit(['add', '-A'], cwd, env);
    const treeSha = await execGit(['write-tree'], cwd, env);

    return {
      id: treeSha,
      kind: 'git-tree'
    };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function hashFileContent(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(filePath));
  return hash.digest('hex');
}

async function computeManifestEntries(cwd: string): Promise<ManifestEntry[]> {
  const trackedOutput = await execGitOrNull(['ls-files', '-z'], cwd);
  const untrackedOutput = await execGitOrNull(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    cwd
  );
  const trackedFiles = new Set(
    (trackedOutput ?? '').split('\u0000').filter((entry) => entry.length > 0)
  );
  const candidateFiles = new Set<string>(trackedFiles);

  for (const entry of (untrackedOutput ?? '').split('\u0000')) {
    if (entry) {
      candidateFiles.add(entry);
    }
  }

  const entries: ManifestEntry[] = [];

  for (const relativePath of [...candidateFiles].sort()) {
    const absolutePath = path.join(cwd, relativePath);
    const isTracked = trackedFiles.has(relativePath);

    try {
      const fileStat = await stat(absolutePath);

      if (!fileStat.isFile()) {
        continue;
      }

      entries.push({
        content_hash: await hashFileContent(absolutePath),
        mode: fileStat.mode,
        path: relativePath,
        status: 'present',
        tracked: isTracked
      });
    } catch {
      entries.push({
        content_hash: null,
        mode: null,
        path: relativePath,
        status: 'deleted',
        tracked: isTracked
      });
    }
  }

  return entries;
}

async function computeManifestSnapshot(cwd: string): Promise<SnapshotId> {
  const payload = {
    base_sha: await getBaseSha(cwd),
    entries: await computeManifestEntries(cwd)
  };
  const hash = createHash('sha256');
  hash.update(JSON.stringify(payload));

  return {
    id: hash.digest('hex'),
    kind: 'manifest'
  };
}

export async function computeSnapshot(cwd: string): Promise<SnapshotId> {
  if (process.env.EVIDENCE_FORCE_MANIFEST === '1') {
    return computeManifestSnapshot(cwd);
  }

  try {
    return await computeGitTreeSnapshot(cwd);
  } catch {
    return computeManifestSnapshot(cwd);
  }
}

export async function createEvidence(
  options: CreateEvidenceOptions = {}
): Promise<EvidenceReport> {
  const cwd = options.cwd ?? process.cwd();
  const gateRunner = options.gateRunner ?? runGates;
  const started_at = new Date().toISOString();
  const validatedSnapshot = await computeSnapshot(cwd);
  const gatesResult = await gateRunner({
    changedFrom: options.changedFrom,
    cwd,
    dryRun: options.dryRun,
    profile: options.profile
  });
  const completedSnapshot = await computeSnapshot(cwd);

  const result =
    completedSnapshot.kind !== validatedSnapshot.kind ||
    completedSnapshot.id !== validatedSnapshot.id
      ? 'invalid'
      : gatesResult.result === 'pass'
        ? 'pass'
        : 'fail';

  return {
    base_sha: await getBaseSha(cwd),
    candidate_sha: await getCandidateSha(cwd),
    finished_at: new Date().toISOString(),
    gate_results: gatesResult.gateResults,
    lockfile_sha256: await sha256File(path.join(cwd, 'package-lock.json')),
    node_version: process.version,
    npm_version: await getNpmVersion(cwd),
    result,
    schema_version: 1,
    started_at,
    validated_snapshot: validatedSnapshot
  };
}

function parseCliArgs(argv: readonly string[]): EvidenceCliOptions {
  const options: EvidenceCliOptions = {
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument === '--profile') {
      const profile = argv[index + 1];

      if (!profile || !isProfileName(profile)) {
        throw new Error('Invalid value for --profile.');
      }

      options.profile = profile;
      index += 1;
      continue;
    }

    if (argument.startsWith('--profile=')) {
      const profile = argument.slice('--profile='.length);

      if (!isProfileName(profile)) {
        throw new Error('Invalid value for --profile.');
      }

      options.profile = profile;
      continue;
    }

    if (argument === '--changed-from') {
      const changedFrom = argv[index + 1];

      if (!changedFrom) {
        throw new Error('Missing value for --changed-from');
      }

      options.changedFrom = changedFrom;
      index += 1;
      continue;
    }

    if (argument.startsWith('--changed-from=')) {
      options.changedFrom = argument.slice('--changed-from='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.profile && !options.changedFrom) {
    throw new Error('Pass --profile=<name> or --changed-from=<base_sha>.');
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseCliArgs(argv);
  const report = await createEvidence({
    changedFrom: options.changedFrom,
    dryRun: options.dryRun,
    profile: options.profile
  });

  console.log(JSON.stringify(report, null, 2));
  return report.result === 'pass' ? 0 : 1;
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
