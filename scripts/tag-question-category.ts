import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Question,
  QuestionCategory,
  UnitContent
} from '../src/types/content';

const CATEGORY_ARG = '--force';

// Intentionally conservative:
// - catches numeric prompts with common chemistry units;
// - treats a few strongly quantitative keywords as calculation signals;
// - leaves borderline prompts as theory for later human review.
const NUMBER_WITH_CHEMISTRY_UNIT_PATTERN =
  /\d+(?:[,.]\d+)?\s*(?:gam|g\b|kg\b|tấn\b|lít\b|lit\b|ml\b|dm3\b|cm3\b|m3\b|mol\/l\b|mol\b|M\b|%|đvC\b|amu\b|atm\b|kJ\b)/iu;
const QUANTITATIVE_KEYWORD_PATTERN = /\b(?:đktc|đkc|hiệu suất|nồng độ)\b/iu;
const NUMBER_PATTERN = /\d/u;
const MASS_OR_VOLUME_WITH_NUMBER_PATTERN =
  /(?:khối lượng|thể tích)[\s\S]{0,24}\d|\d[\s\S]{0,24}(?:khối lượng|thể tích)/iu;

type UnitReport = {
  file: string;
  unitId: string;
  unitCode: string;
  totalQuestions: number;
  theoryCount: number;
  calculationCount: number;
  lessons: LessonReport[];
  zeroCalculationLessons: LessonReport[];
};

type LessonReport = {
  lessonId: string;
  lessonTitle: string;
  totalQuestions: number;
  theoryCount: number;
  calculationCount: number;
};

function inferQuestionCategory(
  question: Pick<Question, 'type' | 'prompt'>
): QuestionCategory {
  if (question.type === 'balance') {
    return 'theory';
  }

  if (NUMBER_WITH_CHEMISTRY_UNIT_PATTERN.test(question.prompt)) {
    return 'calculation';
  }

  if (QUANTITATIVE_KEYWORD_PATTERN.test(question.prompt)) {
    return 'calculation';
  }

  if (NUMBER_PATTERN.test(question.prompt)) {
    if (MASS_OR_VOLUME_WITH_NUMBER_PATTERN.test(question.prompt)) {
      return 'calculation';
    }
  }

  return 'theory';
}

function upsertCategory(
  question: Question,
  category: QuestionCategory
): Question {
  const entries = Object.entries(question);
  const nextEntries: Array<[string, unknown]> = [];
  let inserted = false;

  for (const [key, value] of entries) {
    if (key === 'category') {
      continue;
    }

    nextEntries.push([key, value]);

    if (key === 'level') {
      nextEntries.push(['category', category]);
      inserted = true;
    }
  }

  if (!inserted) {
    nextEntries.push(['category', category]);
  }

  return Object.fromEntries(nextEntries) as unknown as Question;
}

export function tagQuestion(
  question: Question,
  options?: { force?: boolean }
): Question {
  if (question.category && !options?.force) {
    return question;
  }

  return upsertCategory(question, inferQuestionCategory(question));
}

export function tagUnitContent(
  unit: UnitContent,
  options?: { force?: boolean }
): { unit: UnitContent; report: UnitReport } {
  let unitTheoryCount = 0;
  let unitCalculationCount = 0;
  let unitTotalQuestions = 0;

  const lessons = unit.lessons.map((lesson) => {
    let theoryCount = 0;
    let calculationCount = 0;

    const questions = lesson.questions.map((question) => {
      const taggedQuestion = tagQuestion(question, options);

      if (taggedQuestion.category === 'calculation') {
        calculationCount += 1;
      } else {
        theoryCount += 1;
      }

      return taggedQuestion;
    });

    const totalQuestions = questions.length;
    unitTheoryCount += theoryCount;
    unitCalculationCount += calculationCount;
    unitTotalQuestions += totalQuestions;

    return {
      lesson: {
        ...lesson,
        questions
      },
      report: {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        totalQuestions,
        theoryCount,
        calculationCount
      }
    };
  });

  const lessonReports = lessons.map((entry) => entry.report);

  return {
    unit: {
      ...unit,
      lessons: lessons.map((entry) => entry.lesson)
    },
    report: {
      file: '',
      unitId: unit.id,
      unitCode: unit.code,
      totalQuestions: unitTotalQuestions,
      theoryCount: unitTheoryCount,
      calculationCount: unitCalculationCount,
      lessons: lessonReports,
      zeroCalculationLessons: lessonReports.filter(
        (lesson) => lesson.calculationCount === 0
      )
    }
  };
}

function rewriteUnitContent(
  raw: string,
  categories: QuestionCategory[],
  options?: { force?: boolean }
): string {
  const lines = raw.split('\n');
  const nextLines: string[] = [];
  let inQuestionsArray = false;
  let questionDepth = 0;
  let questionIndex = -1;
  let currentCategory: QuestionCategory | null = null;
  let insertedCategory = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inQuestionsArray && trimmed === '"questions": [') {
      inQuestionsArray = true;
      nextLines.push(line);
      continue;
    }

    if (inQuestionsArray && questionDepth === 0 && trimmed === ']') {
      inQuestionsArray = false;
      nextLines.push(line);
      continue;
    }

    if (inQuestionsArray && questionDepth === 0 && trimmed === '{') {
      questionIndex += 1;
      currentCategory = categories[questionIndex] ?? null;
      insertedCategory = false;
      questionDepth = 1;
      nextLines.push(line);
      continue;
    }

    if (inQuestionsArray && questionDepth > 0) {
      if (trimmed.startsWith('"category":')) {
        if (options?.force) {
          continue;
        }

        insertedCategory = true;
        nextLines.push(line);
        questionDepth += countBraceDelta(trimmed);
        continue;
      }

      nextLines.push(line);

      if (
        trimmed.startsWith('"level":') &&
        currentCategory &&
        (!insertedCategory || options?.force)
      ) {
        const indentation = line.match(/^\s*/)![0];
        nextLines.push(`${indentation}"category": "${currentCategory}",`);
        insertedCategory = true;
      }

      questionDepth += countBraceDelta(trimmed);
      continue;
    }

    nextLines.push(line);
  }

  return `${nextLines.join('\n').replace(/\n?$/, '\n')}`;
}

function countBraceDelta(line: string): number {
  const openCount = [...line].filter((char) => char === '{').length;
  const closeCount = [...line].filter((char) => char === '}').length;
  return openCount - closeCount;
}

function formatUnitReport(report: UnitReport): string[] {
  const lines = [
    `${report.file} (${report.unitCode})`,
    `  total ${report.totalQuestions} | theory ${report.theoryCount} | calculation ${report.calculationCount}`
  ];

  for (const lesson of report.lessons) {
    lines.push(
      `  - ${lesson.lessonId}: total ${lesson.totalQuestions} | theory ${lesson.theoryCount} | calculation ${lesson.calculationCount}`
    );
  }

  if (report.zeroCalculationLessons.length === 0) {
    lines.push('  zero-calculation lessons: none');
  } else {
    lines.push(
      `  zero-calculation lessons: ${report.zeroCalculationLessons
        .map((lesson) => `${lesson.lessonId} (${lesson.lessonTitle})`)
        .join(', ')}`
    );
  }

  return lines;
}

async function main() {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  );
  const unitsDir = path.join(rootDir, 'content', 'units');
  const files = (await readdir(unitsDir))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const force = process.argv.includes(CATEGORY_ARG);
  const reports: UnitReport[] = [];

  for (const file of files) {
    const filePath = path.join(unitsDir, file);
    const raw = await readFile(filePath, 'utf8');
    const unit = JSON.parse(raw) as UnitContent;
    const { unit: taggedUnit, report } = tagUnitContent(unit, { force });
    const taggedCategories = taggedUnit.lessons.flatMap((lesson) =>
      lesson.questions.map((question) => question.category)
    );
    const formatted = rewriteUnitContent(raw, taggedCategories, { force });

    await writeFile(filePath, formatted, 'utf8');
    reports.push({
      ...report,
      file
    });
  }

  const grandTotals = reports.reduce(
    (acc, report) => ({
      totalQuestions: acc.totalQuestions + report.totalQuestions,
      theoryCount: acc.theoryCount + report.theoryCount,
      calculationCount: acc.calculationCount + report.calculationCount
    }),
    { totalQuestions: 0, theoryCount: 0, calculationCount: 0 }
  );

  console.log(
    `Tagged ${files.length} unit files${force ? ' with --force' : ''}.`
  );
  console.log(
    `Overall: total ${grandTotals.totalQuestions} | theory ${grandTotals.theoryCount} | calculation ${grandTotals.calculationCount}`
  );

  for (const report of reports) {
    for (const line of formatUnitReport(report)) {
      console.log(line);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

export { inferQuestionCategory };
