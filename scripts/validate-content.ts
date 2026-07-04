import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateUnits } from '../src/lib/contentValidation';
import type { UnitContent } from '../src/types/content';

async function main() {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  );
  const unitsDir = path.join(rootDir, 'content', 'units');
  const files = (await readdir(unitsDir))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const units = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(unitsDir, file), 'utf8');
      return JSON.parse(raw) as UnitContent;
    })
  );
  const errors = validateUnits(units);

  if (errors.length > 0) {
    console.error('Phát hiện lỗi nội dung:');

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }

  console.log(
    `Đã kiểm tra ${units.length} unit, không phát hiện lỗi schema/nội dung.`
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
