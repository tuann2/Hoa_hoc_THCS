import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const distDir = path.join(rootDir, 'dist');
const unitIds = [
  'a1-nen-tang-hoa-hoc',
  'a2-oxi-khong-khi',
  'a3-hidro-nuoc',
  'a4-dung-dich',
  'a5-oxit',
  'a6-axit',
  'a7-bazo',
  'a8-muoi-phan-bon',
  'a9-moi-quan-he-hop-chat-vo-co',
  'a10-kim-loai',
  'a11-phi-kim',
  'a12-tong-hop-vo-co',
  'b1-dai-cuong-huu-co',
  'b2-hidrocacbon-nhien-lieu',
  'b3-dan-xuat-chua-oxi',
  'b4-gluxit-protein-polime',
  'b5-tong-hop-huu-co'
];

interface ManifestEntry {
  file: string;
  isEntry?: boolean;
  imports?: string[];
}

async function main() {
  const manifestPaths = [
    path.join(distDir, '.vite', 'manifest.json'),
    path.join(distDir, 'manifest.json')
  ];
  let manifestFile = manifestPaths[0];
  for (const candidate of manifestPaths) {
    try {
      await stat(candidate);
      manifestFile = candidate;
      break;
    } catch {
      /* try next */
    }
  }

  const rawManifest = JSON.parse(
    await readFile(manifestFile, 'utf8')
  ) as Record<string, ManifestEntry>;
  const entries = Object.values(rawManifest);
  const entry = entries.find((item) => item.isEntry);
  if (!entry) throw new Error('Không tìm thấy Vite entry trong manifest.');

  const jsFiles = (await readdir(path.join(distDir, 'assets'))).filter((file) =>
    file.endsWith('.js')
  );
  const oversized: string[] = [];
  for (const file of jsFiles) {
    const size = (await stat(path.join(distDir, 'assets', file))).size;
    if (size > 500_000) oversized.push(`${file} (${size} bytes)`);
  }
  if (oversized.length > 0)
    throw new Error(`Chunk vượt 500 kB: ${oversized.join(', ')}`);

  const initialFiles = [entry.file, ...(entry.imports ?? [])];
  let initialGzip = 0;
  const initialSource = [] as Buffer[];
  for (const file of initialFiles) {
    const source = await readFile(path.join(distDir, file));
    initialSource.push(source);
    initialGzip += gzipSync(source).byteLength;
  }
  if (initialGzip > 250_000) {
    throw new Error(
      `Initial JavaScript gzip ${initialGzip} bytes vượt ngân sách 250 kB.`
    );
  }

  const initialText = Buffer.concat(initialSource).toString('utf8');
  // Catalog ids are intentionally in the initial shell. A question id is a
  // stable marker that only full unit JSON can contribute.
  const eagerUnits = unitIds.filter((unitId) =>
    initialText.includes(`${unitId}-l1-q1`)
  );
  if (eagerUnits.length > 0) {
    throw new Error(`Unit bị eager-load vào entry: ${eagerUnits.join(', ')}`);
  }

  const assetFiles = await readdir(path.join(distDir, 'assets'));
  const contentChunks = unitIds.filter((unitId) =>
    assetFiles.some((file) => file.includes(unitId))
  );
  if (contentChunks.length < unitIds.length) {
    throw new Error(
      `Chỉ tìm thấy ${contentChunks.length}/${unitIds.length} content chunks độc lập.`
    );
  }

  console.log(
    `Bundle budget đạt: ${jsFiles.length} JS chunks, initial gzip ${initialGzip} bytes, ${contentChunks.length} content chunks.`
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
