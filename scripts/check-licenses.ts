import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isExecutedAsScript } from './cli';

type PackageLock = {
  packages?: Record<
    string,
    {
      name?: string;
      version?: string;
      license?: string;
      optional?: boolean;
    }
  >;
};

type PackageMetadata = {
  name?: string;
  version?: string;
  license?: unknown;
};

type LicenseIssue = {
  packageName: string;
  version: string;
  license: string;
};

export const ALLOWED_LICENSES = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense'
]);

function hasBalancedOuterParens(expression: string): boolean {
  let depth = 0;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];

    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }

    if (depth === 0 && index < expression.length - 1) {
      return false;
    }
  }

  return depth === 0;
}

function normalizeExpression(expression: string): string {
  let normalized = expression.trim();

  while (
    normalized.startsWith('(') &&
    normalized.endsWith(')') &&
    hasBalancedOuterParens(normalized)
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function splitOrExpression(expression: string): string[] {
  const normalized = normalizeExpression(expression);
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      current += char;
      continue;
    }

    if (
      depth === 0 &&
      normalized.slice(index, index + 4).toUpperCase() === ' OR '
    ) {
      parts.push(current.trim());
      current = '';
      index += 3;
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export function isLicenseAllowed(license: string): boolean {
  const normalized = normalizeExpression(license);

  if (ALLOWED_LICENSES.has(normalized)) {
    return true;
  }

  const branches = splitOrExpression(normalized);

  if (branches.length > 1) {
    return branches.some((branch) => isLicenseAllowed(branch));
  }

  return false;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

function getPackageNameFromPath(packagePath: string): string {
  return packagePath.replace(/^node_modules\//, '');
}

function resolvePackageJsonPath(
  rootDir: string,
  packagePath: string
): string | null {
  const nodeModulesDir = path.resolve(rootDir, 'node_modules');
  const packageJsonPath = path.resolve(rootDir, packagePath, 'package.json');
  const relativePath = path.relative(nodeModulesDir, packageJsonPath);

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    relativePath === 'package.json'
  ) {
    return null;
  }

  return packageJsonPath;
}

async function loadPackageMetadata(
  packageJsonPath: string
): Promise<PackageMetadata | null> {
  try {
    await access(packageJsonPath);
  } catch {
    return null;
  }

  return readJsonFile<PackageMetadata>(packageJsonPath);
}

export async function collectLicenseIssues(
  rootDir: string
): Promise<{ checkedPackages: number; issues: LicenseIssue[] }> {
  const lockfile = await readJsonFile<PackageLock>(
    path.join(rootDir, 'package-lock.json')
  );
  const issues: LicenseIssue[] = [];
  let checkedPackages = 0;

  for (const [packagePath, lockMetadata] of Object.entries(
    lockfile.packages ?? {}
  )) {
    if (!packagePath.startsWith('node_modules/')) {
      continue;
    }

    const packageName =
      lockMetadata.name ?? getPackageNameFromPath(packagePath);
    const version = lockMetadata.version ?? 'unknown';

    const packageJsonPath = resolvePackageJsonPath(rootDir, packagePath);

    if (!packageJsonPath) {
      checkedPackages += 1;
      issues.push({
        packageName,
        version,
        license: '<invalid path>'
      });
      continue;
    }

    const metadata = await loadPackageMetadata(packageJsonPath);

    const resolvedPackageName = metadata?.name ?? packageName;
    const resolvedVersion = metadata?.version ?? version;
    const license =
      typeof metadata?.license === 'string'
        ? metadata.license.trim()
        : typeof lockMetadata.license === 'string'
          ? lockMetadata.license.trim()
          : '';

    checkedPackages += 1;

    if (!license || !isLicenseAllowed(license)) {
      issues.push({
        packageName: resolvedPackageName,
        version: resolvedVersion,
        license: license || '<missing>'
      });
    }
  }

  issues.sort((left, right) => {
    const leftKey = `${left.packageName}@${left.version}`;
    const rightKey = `${right.packageName}@${right.version}`;
    return leftKey.localeCompare(rightKey);
  });

  return { checkedPackages, issues };
}

function formatIssues(issues: LicenseIssue[]): string {
  return issues
    .map(
      (issue) =>
        `- ${issue.packageName}@${issue.version}: license ${issue.license} is not allowlisted`
    )
    .join('\n');
}

function parseRootArg(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--root') {
      return path.resolve(argv[index + 1] ?? '.');
    }

    if (argument.startsWith('--root=')) {
      return path.resolve(argument.slice('--root='.length));
    }
  }

  return process.cwd();
}

export async function main(
  argv: string[] = process.argv.slice(2)
): Promise<void> {
  const rootDir = parseRootArg(argv);
  const { checkedPackages, issues } = await collectLicenseIssues(rootDir);

  if (issues.length > 0) {
    console.error('License allowlist check failed:');
    console.error(formatIssues(issues));
    process.exitCode = 1;
    return;
  }

  console.log(
    `License allowlist check passed for ${checkedPackages} packages.`
  );
}

if (isExecutedAsScript(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
