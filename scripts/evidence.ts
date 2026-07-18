import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
  lstat,
  mkdtemp,
  readdir,
  readlink,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
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

export type BuildInputDigest = {
  path: string;
  sha256: string;
};

export type EvidenceReport = {
  base_sha: string;
  build_inputs: BuildInputDigest[];
  candidate_sha: string;
  finished_at: string;
  gate_results: GateExecutionResult[];
  lockfile_sha256: string;
  node_version: string;
  npm_version: string;
  result: 'fail' | 'invalid' | 'pass';
  snapshot_fallback_reason: string | null;
  // schema_version remains 1 because these fields are additive only.
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
  kind: 'file' | 'symlink';
  mode: number | null;
  path: string;
  status: 'present' | 'deleted';
  tracked: boolean;
};

type SnapshotComputation = {
  snapshot: SnapshotId;
  snapshotFallbackReason: string | null;
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

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
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

async function collectBuildInputs(cwd: string): Promise<BuildInputDigest[]> {
  const entries = await readdir(cwd, { withFileTypes: true });
  const buildInputs = entries
    .filter(
      (entry) =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        entry.name.startsWith('.env')
    )
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    buildInputs.map(async (entry) => ({
      path: entry,
      sha256: await sha256File(path.join(cwd, entry))
    }))
  );
}

function areBuildInputsEqual(
  left: readonly BuildInputDigest[],
  right: readonly BuildInputDigest[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (entry, index) =>
      entry.path === right[index]?.path && entry.sha256 === right[index]?.sha256
  );
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

  if (trackedOutput === null || untrackedOutput === null) {
    throw new Error(
      'Manifest snapshot requires git ls-files output, but git metadata is unavailable.'
    );
  }

  const trackedFiles = new Set(
    trackedOutput.split('\u0000').filter((entry) => entry.length > 0)
  );
  const candidateFiles = new Set<string>(trackedFiles);

  for (const entry of untrackedOutput.split('\u0000')) {
    if (entry) {
      candidateFiles.add(entry);
    }
  }

  const entries: ManifestEntry[] = [];

  for (const relativePath of [...candidateFiles].sort()) {
    const absolutePath = path.join(cwd, relativePath);
    const isTracked = trackedFiles.has(relativePath);

    try {
      const fileStat = await lstat(absolutePath);

      if (fileStat.isSymbolicLink()) {
        entries.push({
          content_hash: createHash('sha256')
            .update(await readlink(absolutePath))
            .digest('hex'),
          kind: 'symlink',
          mode: fileStat.mode,
          path: relativePath,
          status: 'present',
          tracked: isTracked
        });
        continue;
      }

      if (!fileStat.isFile()) {
        continue;
      }

      entries.push({
        content_hash: await hashFileContent(absolutePath),
        kind: 'file',
        mode: fileStat.mode,
        path: relativePath,
        status: 'present',
        tracked: isTracked
      });
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }

      entries.push({
        content_hash: null,
        kind: 'file',
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

export async function computeSnapshot(
  cwd: string
): Promise<SnapshotComputation> {
  if (process.env.VITEST && process.env.EVIDENCE_FORCE_MANIFEST === '1') {
    return {
      snapshot: await computeManifestSnapshot(cwd),
      snapshotFallbackReason: 'Forced by EVIDENCE_FORCE_MANIFEST under Vitest.'
    };
  }

  try {
    return {
      snapshot: await computeGitTreeSnapshot(cwd),
      snapshotFallbackReason: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      snapshot: await computeManifestSnapshot(cwd),
      snapshotFallbackReason: message
    };
  }
}

export async function createEvidence(
  options: CreateEvidenceOptions = {}
): Promise<EvidenceReport> {
  const cwd = options.cwd ?? process.cwd();
  const gateRunner = options.gateRunner ?? runGates;
  const started_at = new Date().toISOString();
  const baseShaBefore = await getBaseSha(cwd);
  const candidateShaBefore = await getCandidateSha(cwd);
  const validatedSnapshot = await computeSnapshot(cwd);
  const buildInputs = await collectBuildInputs(cwd);
  const gatesResult = await gateRunner({
    changedFrom: options.changedFrom,
    cwd,
    dryRun: options.dryRun,
    profile: options.profile
  });
  const baseShaAfter = await getBaseSha(cwd);
  const candidateShaAfter = await getCandidateSha(cwd);
  const completedSnapshot = await computeSnapshot(cwd);
  const buildInputsAfter = await collectBuildInputs(cwd);

  const result =
    baseShaBefore !== baseShaAfter ||
    candidateShaBefore !== candidateShaAfter ||
    !areBuildInputsEqual(buildInputs, buildInputsAfter) ||
    completedSnapshot.snapshot.kind !== validatedSnapshot.snapshot.kind ||
    completedSnapshot.snapshot.id !== validatedSnapshot.snapshot.id
      ? 'invalid'
      : gatesResult.result === 'pass'
        ? 'pass'
        : 'fail';

  return {
    base_sha: baseShaBefore,
    build_inputs: buildInputs,
    candidate_sha: candidateShaBefore,
    finished_at: new Date().toISOString(),
    gate_results: gatesResult.gateResults,
    lockfile_sha256: await sha256File(path.join(cwd, 'package-lock.json')),
    node_version: process.version,
    npm_version: await getNpmVersion(cwd),
    result,
    snapshot_fallback_reason: validatedSnapshot.snapshotFallbackReason,
    schema_version: 1,
    started_at,
    validated_snapshot: validatedSnapshot.snapshot
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
