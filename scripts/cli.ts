import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function isExecutedAsScript(
  metaUrl: string,
  argv: readonly string[] = process.argv
): boolean {
  const entryPath = argv[1];

  if (!entryPath) {
    return false;
  }

  const resolvedEntryPath = entryPath.startsWith('file://')
    ? fileURLToPath(entryPath)
    : path.resolve(entryPath);

  return path.resolve(fileURLToPath(metaUrl)) === resolvedEntryPath;
}
