import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { isExecutedAsScript } from './cli';

export const AUDIT_LEVEL = 'moderate' as const;

const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'] as const;

type Severity = (typeof SEVERITY_ORDER)[number];

type AuditAllowlistEntry = {
  advisoryId: string;
  package: string;
  reason: string;
  approvedBy: string;
  approvedDate: string;
  reviewAfter?: string | null;
};

type AuditReport = {
  metadata?: {
    vulnerabilities?: Record<string, unknown>;
  };
  vulnerabilities?: Record<string, unknown>;
};

type Advisory = {
  advisoryId: string;
  url: string;
  packageName: string;
};

type AuditCommand = (rootDir: string) => Promise<string>;

type AuditPackageResult = {
  packageName: string;
  severity: Severity;
  advisories: Advisory[];
  unrecognizedUrls: string[];
};

const execFileAsync = promisify(execFile);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSeverity(value: unknown): value is Severity {
  return (
    typeof value === 'string' && SEVERITY_ORDER.includes(value as Severity)
  );
}

function isAtLeastAuditLevel(severity: Severity): boolean {
  return (
    SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(AUDIT_LEVEL)
  );
}

function extractAdvisories(
  via: unknown[],
  vulnerabilities: Record<string, unknown>,
  packageName: string,
  visitedPackages: Set<string> = new Set([packageName])
): {
  advisories: Advisory[];
  unrecognizedUrls: string[];
} {
  const advisories: Advisory[] = [];
  const unrecognizedUrls: string[] = [];

  for (const item of via) {
    if (typeof item === 'string') {
      if (visitedPackages.has(item)) {
        continue;
      }

      const referencedPackage = vulnerabilities[item];
      if (
        !isRecord(referencedPackage) ||
        !Array.isArray(referencedPackage.via)
      ) {
        continue;
      }

      const referencedResult = extractAdvisories(
        referencedPackage.via,
        vulnerabilities,
        item,
        new Set([...visitedPackages, item])
      );
      advisories.push(...referencedResult.advisories);
      unrecognizedUrls.push(...referencedResult.unrecognizedUrls);
      continue;
    }

    if (!isRecord(item) || typeof item.url !== 'string') {
      unrecognizedUrls.push('<object không có URL advisory GitHub>');
      continue;
    }

    const match = item.url.match(
      /^https:\/\/github\.com\/advisories\/(GHSA-[A-Za-z0-9-]+)(?:\/)?(?:[?#].*)?$/u
    );

    if (!match) {
      unrecognizedUrls.push(item.url);
      continue;
    }

    const advisory = {
      advisoryId: match[1],
      url: item.url,
      packageName
    };

    if (
      !advisories.some(
        (existing) => existing.advisoryId === advisory.advisoryId
      )
    ) {
      advisories.push(advisory);
    }
  }

  return { advisories, unrecognizedUrls };
}

function parseAllowlist(value: unknown): AuditAllowlistEntry[] {
  if (!isRecord(value) || !Array.isArray(value.exceptions)) {
    throw new Error(
      'audit-allowlist.json không hợp lệ: cần object có mảng exceptions.'
    );
  }

  return value.exceptions.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(
        `audit-allowlist.json không hợp lệ: exceptions[${index}] phải là object.`
      );
    }

    const requiredStrings = [
      'advisoryId',
      'package',
      'reason',
      'approvedBy',
      'approvedDate'
    ];

    if (
      requiredStrings.some(
        (field) => typeof entry[field] !== 'string' || entry[field] === ''
      )
    ) {
      throw new Error(
        `audit-allowlist.json không hợp lệ: exceptions[${index}] thiếu trường bắt buộc dạng chuỗi.`
      );
    }

    if (
      entry.reviewAfter !== undefined &&
      entry.reviewAfter !== null &&
      typeof entry.reviewAfter !== 'string'
    ) {
      throw new Error(
        `audit-allowlist.json không hợp lệ: exceptions[${index}].reviewAfter phải là ISO date hoặc null.`
      );
    }

    return entry as unknown as AuditAllowlistEntry;
  });
}

async function readAllowlist(rootDir: string): Promise<AuditAllowlistEntry[]> {
  const allowlistPath = path.join(
    rootDir,
    'docs/security/audit-allowlist.json'
  );

  try {
    const content = await readFile(allowlistPath, 'utf8');
    return parseAllowlist(JSON.parse(content) as unknown);
  } catch (error) {
    throw new Error(
      `Không đọc được docs/security/audit-allowlist.json: ${getErrorMessage(error)}`,
      { cause: error }
    );
  }
}

async function runNpmAudit(rootDir: string): Promise<string> {
  try {
    const result = await execFileAsync('npm', ['audit', '--json'], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024
    });

    return result.stdout;
  } catch (error: unknown) {
    if (
      isRecord(error) &&
      typeof error.stdout === 'string' &&
      error.stdout.trim() !== ''
    ) {
      return error.stdout;
    }

    const stderr =
      isRecord(error) && typeof error.stderr === 'string'
        ? error.stderr.trim()
        : '';
    const detail = stderr || getErrorMessage(error);

    throw new Error(`Không chạy được npm audit --json: ${detail}`, {
      cause: error
    });
  }
}

function parseAuditReport(stdout: string): AuditReport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch (error) {
    throw new Error(
      `npm audit --json trả về JSON không hợp lệ: ${getErrorMessage(error)}`,
      { cause: error }
    );
  }

  if (!isRecord(parsed)) {
    throw new Error('npm audit --json trả về dữ liệu không phải object JSON.');
  }

  const metadata = parsed.metadata;
  const vulnerabilities = parsed.vulnerabilities;

  if (
    !isRecord(metadata) ||
    !isRecord(metadata.vulnerabilities) ||
    !isRecord(vulnerabilities)
  ) {
    throw new Error(
      'npm audit --json thiếu metadata.vulnerabilities hoặc vulnerabilities; không thể xác minh an toàn.'
    );
  }

  return {
    metadata: {
      vulnerabilities: metadata.vulnerabilities
    },
    vulnerabilities
  };
}

function parseMetadataTotal(report: AuditReport): number {
  const counts = report.metadata?.vulnerabilities;

  if (!counts) {
    throw new Error('npm audit --json thiếu metadata.vulnerabilities.');
  }

  let total = 0;

  for (const [severity, count] of Object.entries(counts)) {
    if (severity === 'total') {
      if (typeof count !== 'number' || count < 0) {
        throw new Error(
          'npm audit --json có metadata.vulnerabilities.total không hợp lệ.'
        );
      }
      continue;
    }

    if (!isSeverity(severity) || typeof count !== 'number' || count < 0) {
      throw new Error(
        `npm audit --json có metadata.vulnerabilities không hợp lệ tại ${severity}.`
      );
    }

    total += count;
  }

  return total;
}

function inspectPackages(report: AuditReport): AuditPackageResult[] {
  const packages = report.vulnerabilities ?? {};

  return Object.entries(packages).map(([packageName, value]) => {
    if (
      !isRecord(value) ||
      !isSeverity(value.severity) ||
      !Array.isArray(value.via)
    ) {
      throw new Error(
        `npm audit --json có dữ liệu vulnerabilities không hợp lệ tại package ${packageName}.`
      );
    }

    const { advisories, unrecognizedUrls } = extractAdvisories(
      value.via,
      packages,
      packageName
    );

    return {
      packageName,
      severity: value.severity,
      advisories,
      unrecognizedUrls
    };
  });
}

function findAllowlistEntry(
  entries: AuditAllowlistEntry[],
  packageName: string,
  advisoryId: string
): AuditAllowlistEntry | undefined {
  return entries.find(
    (entry) => entry.package === packageName && entry.advisoryId === advisoryId
  );
}

function formatAllowlistEntry(entry: AuditAllowlistEntry): string {
  return `lý do: ${entry.reason}; người duyệt: ${entry.approvedBy}; ngày duyệt: ${entry.approvedDate}`;
}

function printStaleAllowlistWarnings(
  entries: AuditAllowlistEntry[],
  allReportedAdvisoryIds: Set<string>
): void {
  for (const entry of entries) {
    if (!allReportedAdvisoryIds.has(entry.advisoryId)) {
      console.warn(
        `CẢNH BÁO: advisory ${entry.advisoryId} (${entry.package}) trong allowlist không còn được npm audit báo; nên rà soát và dọn entry nếu không còn cần thiết.`
      );
    }
  }
}

export async function main(
  argv: string[] = process.argv.slice(2),
  auditCommand: AuditCommand = runNpmAudit
): Promise<void> {
  const rootDir = parseRootArg(argv);

  try {
    const [allowlistEntries, stdout] = await Promise.all([
      readAllowlist(rootDir),
      auditCommand(rootDir)
    ]);
    const report = parseAuditReport(stdout);
    const metadataTotal = parseMetadataTotal(report);
    const packages = inspectPackages(report);
    const allReportedAdvisoryIds = new Set(
      packages.flatMap((item) =>
        item.advisories.map((advisory) => advisory.advisoryId)
      )
    );

    printStaleAllowlistWarnings(allowlistEntries, allReportedAdvisoryIds);

    const relevantPackages = packages.filter((item) =>
      isAtLeastAuditLevel(item.severity)
    );
    const approvedPackages: AuditPackageResult[] = [];
    const unapprovedPackages: AuditPackageResult[] = [];

    for (const packageResult of relevantPackages) {
      const isApproved =
        packageResult.unrecognizedUrls.length === 0 &&
        packageResult.advisories.length > 0 &&
        packageResult.advisories.every((advisory) =>
          findAllowlistEntry(
            allowlistEntries,
            advisory.packageName,
            advisory.advisoryId
          )
        );

      if (isApproved) {
        approvedPackages.push(packageResult);
        for (const advisory of packageResult.advisories) {
          const entry = findAllowlistEntry(
            allowlistEntries,
            advisory.packageName,
            advisory.advisoryId
          );
          console.warn(
            `ĐÃ ĐƯỢC DUYỆT: package ${packageResult.packageName}, severity ${packageResult.severity}, advisory ${advisory.advisoryId}, URL ${advisory.url}; ${formatAllowlistEntry(entry!)}`
          );
        }
      } else {
        unapprovedPackages.push(packageResult);
        const reportedAdvisories = packageResult.advisories.length
          ? packageResult.advisories
              .map((advisory) => `${advisory.advisoryId} (${advisory.url})`)
              .join(', ')
          : '<không tìm thấy GHSA ID trực tiếp>';
        const unrecognized = packageResult.unrecognizedUrls.length
          ? `; URL chưa nhận diện: ${packageResult.unrecognizedUrls.join(', ')}`
          : '';
        console.error(
          `CHƯA ĐƯỢC DUYỆT: package ${packageResult.packageName}, severity ${packageResult.severity}, advisory ${reportedAdvisories}${unrecognized}`
        );
      }
    }

    if (metadataTotal === 0 && packages.length > 0) {
      throw new Error(
        'npm audit --json không nhất quán: metadata báo không có vulnerability nhưng vulnerabilities vẫn có package.'
      );
    }

    console.log(
      `Tóm tắt dependency-audit: đã duyệt ${approvedPackages.length} / chưa được duyệt ${unapprovedPackages.length} / tổng ${relevantPackages.length} package có severity >= ${AUDIT_LEVEL}.`
    );

    if (unapprovedPackages.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Dependency audit thất bại: ${getErrorMessage(error)}`);
    process.exitCode = 1;
  }
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

if (isExecutedAsScript(import.meta.url)) {
  void main();
}
