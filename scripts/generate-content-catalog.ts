import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnitContent, UnitSummary } from '../src/types/content';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const unitsDir = path.join(rootDir, 'content', 'units');
const catalogPath = path.join(rootDir, 'content', 'catalog.json');

async function readCatalogFromSource(): Promise<UnitSummary[]> {
  const files = (await readdir(unitsDir))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const units = await Promise.all(
    files.map(
      async (file) =>
        JSON.parse(
          await readFile(path.join(unitsDir, file), 'utf8')
        ) as UnitContent
    )
  );

  return units
    .map((unit) => ({
      id: unit.id,
      part: unit.part,
      code: unit.code,
      title: unit.title,
      order: unit.order,
      description: unit.description,
      status: unit.status,
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        summary: lesson.summary,
        status: lesson.status,
        theoryQuestionCount: lesson.questions.filter(
          (question) => question.category === 'theory'
        ).length,
        calculationQuestionCount: lesson.questions.filter(
          (question) => question.category === 'calculation'
        ).length
      }))
    }))
    .sort((left, right) => {
      if (left.part === right.part) return left.order - right.order;
      return left.part === 'inorganic' ? -1 : 1;
    });
}

function serializeCatalog(catalog: UnitSummary[]): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

async function main() {
  const expected = serializeCatalog(await readCatalogFromSource());
  const checkOnly = process.argv.includes('--check');

  if (checkOnly) {
    let current: string;
    try {
      current = await readFile(catalogPath, 'utf8');
    } catch {
      console.error('content/catalog.json chưa tồn tại; hãy chạy generate.');
      process.exitCode = 1;
      return;
    }

    if (current !== expected) {
      console.error(
        'content/catalog.json đã cũ. Chạy npm run generate:content-catalog rồi kiểm tra lại.'
      );
      process.exitCode = 1;
      return;
    }

    console.log('Content catalog khớp với content/units/*.json.');
    return;
  }

  await writeFile(catalogPath, expected, 'utf8');
  const generatedCatalog = JSON.parse(expected) as UnitSummary[];
  console.log(`Đã tạo catalog cho ${generatedCatalog.length} unit.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
