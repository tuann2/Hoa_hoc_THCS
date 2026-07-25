import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/check-audit';

const tempRoots: string[] = [];

type AuditReport = {
  metadata: {
    vulnerabilities: Record<string, number>;
  };
  vulnerabilities: Record<string, unknown>;
};

async function createFixtureRoot(exceptions: unknown[] = []): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'check-audit-'));
  const allowlistDir = path.join(rootDir, 'docs/security');

  tempRoots.push(rootDir);
  await mkdir(allowlistDir, { recursive: true });
  await writeFile(
    path.join(allowlistDir, 'audit-allowlist.json'),
    `${JSON.stringify({ exceptions }, null, 2)}\n`,
    'utf8'
  );

  return rootDir;
}

function reportFor(
  vulnerabilities: Record<string, unknown>,
  counts: Record<string, number>
): AuditReport {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    metadata: { vulnerabilities: { ...counts, total } },
    vulnerabilities
  };
}

function packageVulnerability(severity: string, via: unknown[]): unknown {
  return { severity, via };
}

function advisory(advisoryId: string): Record<string, string> {
  return {
    url: `https://github.com/advisories/${advisoryId}`
  };
}

const approvedException = {
  advisoryId: 'GHSA-qwww-vcr4-c8h2',
  package: 'react-router',
  reason: 'RSC APIs không được sử dụng trong app.',
  approvedBy: 'Human Project Owner (tuann2)',
  approvedDate: '2026-07-25',
  reviewAfter: null
};

afterEach(async () => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  await Promise.all(
    tempRoots
      .splice(0)
      .map((rootDir) => rm(rootDir, { force: true, recursive: true }))
  );
});

describe('check-audit', () => {
  it('pass khi không có vulnerability', async () => {
    const rootDir = await createFixtureRoot();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['--root', rootDir], () =>
      Promise.resolve(
        JSON.stringify(
          reportFor(
            {},
            {
              info: 0,
              low: 0,
              moderate: 0,
              high: 0,
              critical: 0
            }
          )
        )
      )
    );

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      'Tóm tắt dependency-audit: đã duyệt 0 / chưa được duyệt 0 / tổng 0 package có severity >= moderate.'
    );
  });

  it('pass và ghi log khi advisory moderate trở lên có trong allowlist', async () => {
    const report = reportFor(
      {
        'react-router': packageVulnerability('high', [
          advisory('GHSA-qwww-vcr4-c8h2')
        ])
      },
      { info: 0, low: 0, moderate: 0, high: 1, critical: 0 }
    );
    const rootDir = await createFixtureRoot([approvedException]);
    const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await main(['--root', rootDir], () =>
      Promise.resolve(JSON.stringify(report))
    );

    expect(process.exitCode).toBeUndefined();
    expect(logSpy.mock.calls.flat().join('\n')).toContain(
      'GHSA-qwww-vcr4-c8h2'
    );
    expect(logSpy.mock.calls.flat().join('\n')).toContain(
      'Human Project Owner (tuann2)'
    );
  });

  it('duyệt cả package via string theo advisory của package được tham chiếu', async () => {
    const report = reportFor(
      {
        'react-router': packageVulnerability('high', [
          advisory('GHSA-qwww-vcr4-c8h2')
        ]),
        'react-router-dom': packageVulnerability('high', ['react-router'])
      },
      { info: 0, low: 0, moderate: 0, high: 2, critical: 0 }
    );
    const rootDir = await createFixtureRoot([approvedException]);
    const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await main(['--root', rootDir], () =>
      Promise.resolve(JSON.stringify(report))
    );

    expect(process.exitCode).toBeUndefined();
    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain(
      'ĐÃ ĐƯỢC DUYỆT: package react-router, severity high, advisory GHSA-qwww-vcr4-c8h2'
    );
    expect(output).toContain(
      'ĐÃ ĐƯỢC DUYỆT: package react-router-dom, severity high, advisory GHSA-qwww-vcr4-c8h2'
    );
  });

  it('fail khi advisory moderate trở lên chưa có trong allowlist', async () => {
    const report = reportFor(
      {
        'react-router': packageVulnerability('high', [
          advisory('GHSA-0000-0000-0000')
        ])
      },
      { info: 0, low: 0, moderate: 0, high: 1, critical: 0 }
    );
    const rootDir = await createFixtureRoot();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await main(['--root', rootDir], () =>
      Promise.resolve(JSON.stringify(report))
    );

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls.flat().join('\n')).toContain(
      'GHSA-0000-0000-0000'
    );
  });

  it('không chặn vulnerability dưới ngưỡng moderate', async () => {
    const report = reportFor(
      {
        'low-package': packageVulnerability('low', [
          advisory('GHSA-1111-1111-1111')
        ]),
        'info-package': packageVulnerability('info', [
          advisory('GHSA-2222-2222-2222')
        ])
      },
      { info: 1, low: 1, moderate: 0, high: 0, critical: 0 }
    );
    const rootDir = await createFixtureRoot();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main(['--root', rootDir], () =>
      Promise.resolve(JSON.stringify(report))
    );

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(
      'Tóm tắt dependency-audit: đã duyệt 0 / chưa được duyệt 0 / tổng 0 package có severity >= moderate.'
    );
  });
});
