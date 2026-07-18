import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';

const execFileAsync = promisify(execFile);

type PackageJson = {
  scripts?: Record<string, string>;
};

export type DocsIssue = {
  file: string;
  message: string;
  severity: 'error' | 'warning';
};

type CheckDocsOptions = {
  files?: readonly string[];
  all?: boolean;
  cwd?: string;
};

const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/gu;
const SCRIPT_REFERENCE_PATTERN = /\bnpm run\s+([a-z0-9:-]+)/giu;
const DOCUMENT_REFERENCE_PATTERN =
  /(?:^|[`(\s])((?:docs\/(?:(?:plans|handoffs|architecture|runbooks|adr)\/[A-Za-z0-9._/-]+)|scripts\/[A-Za-z0-9._/-]+\.ts|\.github\/workflows\/[A-Za-z0-9._/-]+|(?:README|AGENTS|AI_WORKFLOW)\.md))(?=[`)\s:,.]|$)/gmu;
const ARCHIVAL_MARKER_PATTERN =
  /\b(?:Status:\s*(?:STALE|SUPERSEDED)|ARCHIVED)\b/u;

function getRepoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/gu, '/');
}

function stripDelimiters(value: string): string {
  return value.replace(/^<|>$/gu, '').trim();
}

function stripAnchor(target: string): string {
  return target.split('#', 1)[0]?.split('?', 1)[0] ?? target;
}

function decodeTargetPath(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

function isExternalTarget(target: string): boolean {
  return /^(?:[a-z]+:)?\/\//iu.test(target) || /^mailto:/iu.test(target);
}

function isPlaceholderReference(value: string): boolean {
  return /(?:\.\.\.|FEATURE-0xx|FEATURE-XXX|WORKFLOW-XXX|<[^>]+>)/iu.test(
    value
  );
}

function isPlanOrHandoffArtifact(relativePath: string): boolean {
  return (
    relativePath.startsWith('docs/plans/') ||
    relativePath.startsWith('docs/handoffs/')
  );
}

function isArchivedDocument(content: string): boolean {
  const header = content.split(/\r?\n/u).slice(0, 40).join('\n');
  return ARCHIVAL_MARKER_PATTERN.test(header);
}

function isWithinRepoRoot(repoRoot: string, targetPath: string): boolean {
  const relativePath = path.relative(repoRoot, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getPackageScripts(repoRoot: string): Promise<Set<string>> {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, 'utf8')
  ) as PackageJson;

  return new Set(Object.keys(packageJson.scripts ?? {}));
}

export async function getChangedMarkdownFiles(
  cwd = process.cwd()
): Promise<string[]> {
  const tracked = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACDMRTUXB', 'HEAD', '--', '*.md'],
    {
      cwd,
      encoding: 'utf8'
    }
  );
  const untracked = await execFileAsync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', '*.md'],
    {
      cwd,
      encoding: 'utf8'
    }
  );

  return [...tracked.stdout.split('\n'), ...untracked.stdout.split('\n')]
    .map((line) => line.trim())
    .filter(
      (line, index, array) => line.length > 0 && array.indexOf(line) === index
    )
    .sort();
}

async function collectMarkdownFiles(repoRoot: string): Promise<string[]> {
  const [tracked, untracked] = await Promise.all([
    execFileAsync('git', ['ls-files', '*.md'], {
      cwd: repoRoot,
      encoding: 'utf8'
    }),
    execFileAsync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--', '*.md'],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )
  ]);

  return [...tracked.stdout.split('\n'), ...untracked.stdout.split('\n')]
    .map((line) => line.trim())
    .filter(
      (line, index, array) => line.length > 0 && array.indexOf(line) === index
    )
    .sort();
}

async function inspectMarkdownFile(
  repoRoot: string,
  relativePath: string,
  knownScripts: Set<string>
): Promise<DocsIssue[]> {
  const absolutePath = path.join(repoRoot, relativePath);
  const fileDir = path.dirname(absolutePath);
  const content = await readFile(absolutePath, 'utf8');
  const isPlanOrHandoff = isPlanOrHandoffArtifact(relativePath);
  const isArchived = isArchivedDocument(content);
  const issues: DocsIssue[] = [];

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const rawTarget = stripDelimiters(match[1] ?? '');

    if (!rawTarget || rawTarget.startsWith('#')) {
      continue;
    }

    if (isExternalTarget(rawTarget)) {
      issues.push({
        file: relativePath,
        message: `External URL not verified: ${rawTarget}`,
        severity: 'warning'
      });
      continue;
    }

    const targetWithoutAnchor = stripAnchor(rawTarget);

    if (!targetWithoutAnchor) {
      continue;
    }

    const resolvedPath = path.resolve(
      fileDir,
      decodeTargetPath(targetWithoutAnchor)
    );

    if (!isWithinRepoRoot(repoRoot, resolvedPath)) {
      issues.push({
        file: relativePath,
        message: `Relative Markdown link points outside repository scope: ${rawTarget}`,
        severity: 'error'
      });
      continue;
    }

    if (!(await pathExists(resolvedPath))) {
      issues.push({
        file: relativePath,
        message: `Broken relative Markdown link: ${rawTarget}`,
        severity: isArchived ? 'warning' : 'error'
      });
    }
  }

  if (!isPlanOrHandoff) {
    for (const match of content.matchAll(DOCUMENT_REFERENCE_PATTERN)) {
      const rawPath = match[1];

      if (!rawPath || isPlaceholderReference(rawPath)) {
        continue;
      }

      const normalizedPath = normalizeRepoPath(rawPath);

      if (!(await pathExists(path.join(repoRoot, normalizedPath)))) {
        issues.push({
          file: relativePath,
          message: `Referenced repository path does not exist: ${normalizedPath}`,
          severity: 'error'
        });
      }
    }
  }

  if (!isPlanOrHandoff) {
    for (const match of content.matchAll(SCRIPT_REFERENCE_PATTERN)) {
      const scriptName = match[1]?.trim();

      if (!scriptName) {
        continue;
      }

      if (!knownScripts.has(scriptName)) {
        issues.push({
          file: relativePath,
          message: `Referenced npm script does not exist: npm run ${scriptName}`,
          severity: 'error'
        });
      }
    }
  }

  return issues;
}

export async function checkDocs(
  options: CheckDocsOptions = {}
): Promise<{ files: string[]; issues: DocsIssue[] }> {
  const repoRoot = options.cwd ? path.resolve(options.cwd) : getRepoRoot();
  const files = options.all
    ? await collectMarkdownFiles(repoRoot)
    : options.files
      ? [...options.files]
      : await getChangedMarkdownFiles(repoRoot);
  const knownScripts = await getPackageScripts(repoRoot);
  const issues: DocsIssue[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }

    issues.push(...(await inspectMarkdownFile(repoRoot, file, knownScripts)));
  }

  return { files, issues };
}

type CliOptions = {
  all: boolean;
  files: string[];
  json: boolean;
};

function parseCliArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    all: false,
    files: [],
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--all') {
      options.all = true;
      continue;
    }

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--file') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --file');
      }

      options.files.push(value);
      index += 1;
      continue;
    }

    if (argument.startsWith('--file=')) {
      options.files.push(argument.slice('--file='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseCliArgs(argv);
  const result = await checkDocs({
    all: options.all,
    files: options.files.length > 0 ? options.files : undefined
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.files.length === 0) {
    console.log('No Markdown files selected for validation.');
  } else {
    console.log(`Checked ${result.files.length} Markdown file(s).`);

    for (const issue of result.issues) {
      const writer =
        issue.severity === 'warning' ? console.warn : console.error;
      writer(
        `${issue.severity.toUpperCase()}: ${issue.file}: ${issue.message}`
      );
    }
  }

  return result.issues.some((issue) => issue.severity === 'error') ? 1 : 0;
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
