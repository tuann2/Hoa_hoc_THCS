import type {
  BalanceQuestion,
  FillBlankQuestion,
  Lesson,
  Question,
  QuestionLevel,
  UnitContent
} from '../types/content';

const LEVEL_ORDER: QuestionLevel[] = ['basic', 'applied', 'hsg'];

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isFillBlankCorrect(
  question: FillBlankQuestion,
  response: string
): boolean {
  const normalized = normalizeText(response);
  const accepted = [question.answer, ...(question.acceptedAnswers ?? [])].map(
    normalizeText
  );

  return accepted.includes(normalized);
}

export function isQuestionCorrect(
  question: Question,
  response: string | number[] | number
): boolean {
  switch (question.type) {
    case 'single-choice':
      return response === question.answer;
    case 'multi-choice':
      return (
        Array.isArray(response) &&
        response.length === question.answers.length &&
        [...response]
          .sort()
          .every(
            (value, index) => value === [...question.answers].sort()[index]
          )
      );
    case 'fill-blank':
      return (
        typeof response === 'string' && isFillBlankCorrect(question, response)
      );
    case 'balance':
      return (
        Array.isArray(response) &&
        response.length === question.answer.length &&
        response.every((value, index) => value === question.answer[index])
      );
    default:
      return false;
  }
}

export function calculateStars(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 90) {
    return 3;
  }
  if (accuracy >= 70) {
    return 2;
  }
  if (accuracy > 0) {
    return 1;
  }
  return 0;
}

export function calculateXp(correctCount: number): number {
  return correctCount * 10;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function buildReactionString(question: BalanceQuestion): string {
  return [...question.left, '->', ...question.right].join(' ');
}

export function groupQuestionsByLevel(questions: Question[]) {
  return LEVEL_ORDER.map((level) => ({
    level,
    label:
      level === 'basic' ? 'Cơ bản' : level === 'applied' ? 'Vận dụng' : 'HSG',
    questions: questions.filter((question) => question.level === level)
  }));
}

export function availableLessons(units: UnitContent[]): Lesson[] {
  return units.flatMap((unit) =>
    unit.lessons.filter((lesson) => lesson.status === 'available')
  );
}

type AtomCount = Record<string, number>;

function mergeAtomCount(
  target: AtomCount,
  source: AtomCount,
  multiplier: number
): void {
  for (const [atom, count] of Object.entries(source)) {
    target[atom] = (target[atom] ?? 0) + count * multiplier;
  }
}

function parseNumber(formula: string, startIndex: number): [number, number] {
  let index = startIndex;
  let digits = '';

  while (index < formula.length && /\d/.test(formula[index])) {
    digits += formula[index];
    index += 1;
  }

  return [digits === '' ? 1 : Number(digits), index];
}

export function parseFormula(formula: string): AtomCount {
  const stack: AtomCount[] = [{}];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];

    if (char === '(') {
      stack.push({});
      index += 1;
      continue;
    }

    if (char === ')') {
      const group = stack.pop();

      if (!group) {
        throw new Error(`Ngoặc đóng dư trong công thức: ${formula}`);
      }

      const [multiplier, nextIndex] = parseNumber(formula, index + 1);
      mergeAtomCount(stack[stack.length - 1], group, multiplier);
      index = nextIndex;
      continue;
    }

    if (/[A-Z]/.test(char)) {
      let symbol = char;
      index += 1;

      while (index < formula.length && /[a-z]/.test(formula[index])) {
        symbol += formula[index];
        index += 1;
      }

      const [count, nextIndex] = parseNumber(formula, index);
      stack[stack.length - 1][symbol] =
        (stack[stack.length - 1][symbol] ?? 0) + count;
      index = nextIndex;
      continue;
    }

    if (char === '·') {
      index += 1;
      const [multiplier, nextIndex] = parseNumber(formula, index);
      const remaining = parseFormula(formula.slice(nextIndex));
      mergeAtomCount(stack[stack.length - 1], remaining, multiplier);
      return stack[0];
    }

    if (char === '^' || char === '+' || char === '-') {
      break;
    }

    throw new Error(`Ký tự không hỗ trợ "${char}" trong công thức: ${formula}`);
  }

  if (stack.length !== 1) {
    throw new Error(`Thiếu ngoặc đóng trong công thức: ${formula}`);
  }

  return stack[0];
}

function countSide(formulas: string[], coefficients: number[]): AtomCount {
  const total: AtomCount = {};

  formulas.forEach((formula, index) => {
    mergeAtomCount(total, parseFormula(formula), coefficients[index] ?? 1);
  });

  return total;
}

export function isBalancedEquation(question: BalanceQuestion): boolean {
  if (question.answer.length !== question.left.length + question.right.length) {
    return false;
  }

  const leftCoefficients = question.answer.slice(0, question.left.length);
  const rightCoefficients = question.answer.slice(question.left.length);
  const leftCount = countSide(question.left, leftCoefficients);
  const rightCount = countSide(question.right, rightCoefficients);
  const atoms = new Set([
    ...Object.keys(leftCount),
    ...Object.keys(rightCount)
  ]);

  for (const atom of atoms) {
    if ((leftCount[atom] ?? 0) !== (rightCount[atom] ?? 0)) {
      return false;
    }
  }

  return true;
}

export function validateLessonLevels(lesson: Lesson): boolean {
  return LEVEL_ORDER.every((level) =>
    lesson.questions.some((question) => question.level === level)
  );
}
