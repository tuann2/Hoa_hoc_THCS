import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectLicenseIssues,
  isLicenseAllowed,
  main
} from '../../scripts/check-licenses';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const tempRoots: string[] = [];

async function createFixtureRoot(name: string): Promise<string> {
  const sourceRoot = path.resolve(
    repoRoot,
    'tests/fixtures/check-licenses',
    name
  );
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'check-licenses-'));

  tempRoots.push(tempRoot);
  await cp(sourceRoot, tempRoot, { recursive: true });

  return tempRoot;
}

async function writePackageMetadata(
  rootDir: string,
  packageJsonPath: string,
  metadata: Record<string, string>
): Promise<void> {
  const absolutePath = path.resolve(rootDir, packageJsonPath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8'
  );
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { force: true, recursive: true }))
  );
});

describe('check-licenses', () => {
  it('cho phep bieu thuc OR neu co it nhat mot nhanh hop le', () => {
    expect(isLicenseAllowed('(LicenseRef-Proprietary OR MIT)')).toBe(true);
  });

  it('fail dung package khi gap license ngoai allowlist', async () => {
    const fixtureRoot = await createFixtureRoot('invalid-license');

    await writePackageMetadata(
      fixtureRoot,
      'node_modules/bad-package/package.json',
      {
        name: 'bad-package',
        version: '1.0.0',
        license: 'LicenseRef-Proprietary'
      }
    );

    await expect(collectLicenseIssues(fixtureRoot)).resolves.toEqual({
      checkedPackages: 1,
      issues: [
        {
          packageName: 'bad-package',
          version: '1.0.0',
          license: 'LicenseRef-Proprietary'
        }
      ]
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;

    await main(['--root', fixtureRoot]);

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(process.exitCode).toBe(1);
    expect(output).toContain('bad-package@1.0.0');
    expect(output).toContain('LicenseRef-Proprietary');
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('bao loi lockfile entry traversal ra ngoai node_modules thay vi bo qua im lang', async () => {
    const fixtureRoot = await createFixtureRoot('path-traversal');

    await writePackageMetadata(
      fixtureRoot,
      'node_modules/good-package/package.json',
      {
        name: 'good-package',
        version: '1.0.0',
        license: 'MIT'
      }
    );
    await writePackageMetadata(fixtureRoot, 'escaped-package/package.json', {
      name: 'escaped-package',
      version: '9.9.9',
      license: 'LicenseRef-Proprietary'
    });

    await expect(collectLicenseIssues(fixtureRoot)).resolves.toEqual({
      checkedPackages: 2,
      issues: [
        {
          packageName: 'escaped-package',
          version: '9.9.9',
          license: '<invalid path>'
        }
      ]
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;

    await main(['--root', fixtureRoot]);

    const output = errorSpy.mock.calls.flat().join('\n');
    expect(process.exitCode).toBe(1);
    expect(output).toContain('escaped-package@9.9.9');
    expect(output).toContain('<invalid path>');
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('dung lockfile license cho optional package khong duoc cai tren OS hien tai', async () => {
    const fixtureRoot = await createFixtureRoot('optional-lockfile-license');

    await expect(collectLicenseIssues(fixtureRoot)).resolves.toEqual({
      checkedPackages: 1,
      issues: []
    });
  });

  it('report <missing> cho optional package khong duoc cai neu lockfile cung thieu license', async () => {
    const fixtureRoot = await createFixtureRoot('optional-missing-license');

    await expect(collectLicenseIssues(fixtureRoot)).resolves.toEqual({
      checkedPackages: 1,
      issues: [
        {
          packageName: 'platform-package',
          version: '1.0.0',
          license: '<missing>'
        }
      ]
    });
  });
});
