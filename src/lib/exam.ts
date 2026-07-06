import { isQuestionCorrect } from './chemistry';
import type {
  Lesson,
  PartId,
  Question,
  QuestionLevel,
  UnitContent
} from '../types/content';

export type ExamResponse = string | number[] | number;

export interface ExamScope {
  mode: 'all' | 'part' | 'units';
  part?: PartId;
  unitIds?: string[];
}

export interface ExamPoolItem {
  unit: UnitContent;
  lesson: Lesson;
  question: Question;
}

export type ExamBreakdown = Record<
  QuestionLevel,
  {
    correct: number;
    total: number;
  }
>;

export interface ExamGradeResult {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  breakdown: ExamBreakdown;
}

const LEVELS: QuestionLevel[] = ['basic', 'applied', 'hsg'];
const FILL_PRIORITY: QuestionLevel[] = ['applied', 'basic', 'hsg'];

function shuffleItems<T>(items: T[], random: () => number): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }

  return next;
}

function createEmptyBreakdown(): ExamBreakdown {
  return {
    basic: { correct: 0, total: 0 },
    applied: { correct: 0, total: 0 },
    hsg: { correct: 0, total: 0 }
  };
}

function matchesScope(unit: UnitContent, scope: ExamScope): boolean {
  switch (scope.mode) {
    case 'all':
      return true;
    case 'part':
      return unit.part === scope.part;
    case 'units':
      return scope.unitIds?.includes(unit.id) ?? false;
    default:
      return false;
  }
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = Math.imul(state ^ (state >>> 15), state | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function getExamItemKey(item: ExamPoolItem): string {
  return `${item.unit.id}::${item.lesson.id}::${item.question.id}`;
}

export function buildExamQuestionPool(
  units: UnitContent[],
  scope: ExamScope
): ExamPoolItem[] {
  const unitIds =
    scope.mode === 'units' && scope.unitIds
      ? Array.from(new Set(scope.unitIds))
      : scope.unitIds;
  const normalizedScope =
    scope.mode === 'units' ? { ...scope, unitIds } : scope;

  return units
    .filter((unit) => unit.status === 'available')
    .filter((unit) => matchesScope(unit, normalizedScope))
    .flatMap((unit) =>
      unit.lessons
        .filter((lesson) => lesson.status === 'available')
        .flatMap((lesson) =>
          lesson.questions.map((question) => ({
            unit,
            lesson,
            question
          }))
        )
    );
}

export function pickExamQuestions(
  pool: ExamPoolItem[],
  totalQuestions: number,
  random: () => number
): { items: ExamPoolItem[]; actualTotal: number } {
  if (totalQuestions <= 0 || pool.length === 0) {
    return { items: [], actualTotal: 0 };
  }

  const actualTotal = Math.min(totalQuestions, pool.length);
  const grouped = {
    basic: shuffleItems(
      pool.filter((item) => item.question.level === 'basic'),
      random
    ),
    applied: shuffleItems(
      pool.filter((item) => item.question.level === 'applied'),
      random
    ),
    hsg: shuffleItems(
      pool.filter((item) => item.question.level === 'hsg'),
      random
    )
  };
  const allocations: Record<QuestionLevel, number> = {
    basic: Math.min(grouped.basic.length, Math.round(actualTotal * 0.4)),
    applied: Math.min(grouped.applied.length, Math.round(actualTotal * 0.4)),
    hsg: 0
  };

  allocations.hsg = Math.min(
    grouped.hsg.length,
    Math.max(0, actualTotal - allocations.basic - allocations.applied)
  );

  let selectedCount = allocations.basic + allocations.applied + allocations.hsg;
  let shortage = actualTotal - selectedCount;

  if (shortage > 0) {
    for (const level of FILL_PRIORITY) {
      if (shortage === 0) {
        break;
      }

      const remaining = grouped[level].length - allocations[level];

      if (remaining <= 0) {
        continue;
      }

      const extra = Math.min(shortage, remaining);
      allocations[level] += extra;
      shortage -= extra;
    }
  }

  selectedCount = allocations.basic + allocations.applied + allocations.hsg;

  const items = shuffleItems(
    LEVELS.flatMap((level) => grouped[level].slice(0, allocations[level])),
    random
  );

  return {
    items,
    actualTotal: selectedCount
  };
}

export function gradeExamAttempt(
  items: ExamPoolItem[],
  responses: Record<string, ExamResponse | undefined>
): ExamGradeResult {
  const breakdown = createEmptyBreakdown();
  let correctCount = 0;

  for (const item of items) {
    const level = item.question.level;
    const response = responses[getExamItemKey(item)];
    const correct =
      response !== undefined && isQuestionCorrect(item.question, response);

    breakdown[level].total += 1;

    if (correct) {
      breakdown[level].correct += 1;
      correctCount += 1;
    }
  }

  return {
    correctCount,
    totalQuestions: items.length,
    accuracy:
      items.length === 0 ? 0 : Math.round((correctCount / items.length) * 100),
    breakdown
  };
}
