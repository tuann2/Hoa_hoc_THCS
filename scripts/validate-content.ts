import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateUnits } from '../src/lib/contentValidation';
import { validateReferenceData } from '../src/lib/referenceValidation';
import type { UnitContent } from '../src/types/content';
import type { ReferenceData } from '../src/types/reference';

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
  const referenceDirectory = path.join(rootDir, 'content', 'reference');
  const referenceFiles: Record<keyof ReferenceData, string> = {
    elements: 'elements.json',
    solubility: 'solubility.json',
    valences: 'valences.json',
    activitySeries: 'activity-series.json',
    constants: 'constants.json',
    precipitates: 'precipitates.json'
  };
  const referenceEntries = await Promise.all(
    Object.entries(referenceFiles).map(async ([key, file]) => [
      key,
      JSON.parse(
        await readFile(path.join(referenceDirectory, file), 'utf8')
      ) as unknown
    ])
  );
  errors.push(...validateReferenceData(Object.fromEntries(referenceEntries)));

  if (errors.length > 0) {
    console.error('Phát hiện lỗi nội dung:');

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }

  console.log(
    `Đã kiểm tra ${units.length} unit và 6 bảng tra cứu, không phát hiện lỗi schema/nội dung.`
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
