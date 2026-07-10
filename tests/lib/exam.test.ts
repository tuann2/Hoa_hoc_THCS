import { describe, expect, it } from 'vitest';
import {
  buildExamQuestionPool,
  createSeededRandom,
  getExamItemKey,
  gradeExamAttempt,
  pickExamQuestions,
  type ExamPoolItem
} from '../../src/lib/exam';
import type { QuestionLevel, UnitContent } from '../../src/types/content';

function createQuestion(level: QuestionLevel, id: string) {
  return {
    id,
    type: 'single-choice' as const,
    level,
    category: 'theory' as const,
    prompt: `Question ${id}`,
    options: ['Sai', 'Đúng'],
    answer: 1,
    explanation: `Explanation ${id}`
  };
}

function createPool(
  levelCounts: Record<QuestionLevel, number>
): ExamPoolItem[] {
  const questions = (
    Object.entries(levelCounts) as Array<[QuestionLevel, number]>
  ).flatMap(([level, count]) =>
    Array.from({ length: count }, (_, index) =>
      createQuestion(level, `${level}-${index + 1}`)
    )
  );

  const units: UnitContent[] = [
    {
      id: 'unit-1',
      part: 'inorganic',
      code: 'A1',
      title: 'Unit 1',
      order: 1,
      description: '...',
      status: 'available',
      lessons: [
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          order: 1,
          summary: '...',
          status: 'available',
          cards: [],
          questions
        }
      ]
    }
  ];

  return units.flatMap((unit) =>
    unit.lessons[0].questions.map((question) => ({
      unit,
      lesson: unit.lessons[0],
      question
    }))
  );
}

describe('exam library', () => {
  it('createSeededRandom tạo chuỗi số xác định cho cùng seed', () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);

    expect([first(), first(), first(), first()]).toEqual([
      second(),
      second(),
      second(),
      second()
    ]);
  });

  it('buildExamQuestionPool lọc theo phạm vi và chỉ lấy lesson khả dụng', () => {
    const units: UnitContent[] = [
      {
        id: 'u1',
        part: 'inorganic',
        code: 'A1',
        title: 'Vô cơ',
        order: 1,
        description: '...',
        status: 'available',
        lessons: [
          {
            id: 'u1-l1',
            title: 'Bài mở',
            order: 1,
            summary: '...',
            status: 'available',
            cards: [],
            questions: [createQuestion('basic', 'u1-q1')]
          },
          {
            id: 'u1-l2',
            title: 'Bài khoá',
            order: 2,
            summary: '...',
            status: 'coming-soon',
            cards: [],
            questions: [createQuestion('applied', 'u1-q2')]
          }
        ]
      },
      {
        id: 'u2',
        part: 'organic',
        code: 'B1',
        title: 'Hữu cơ',
        order: 1,
        description: '...',
        status: 'available',
        lessons: [
          {
            id: 'u2-l1',
            title: 'Bài mở',
            order: 1,
            summary: '...',
            status: 'available',
            cards: [],
            questions: [createQuestion('hsg', 'u2-q1')]
          }
        ]
      }
    ];

    expect(
      buildExamQuestionPool(units, { mode: 'part', part: 'inorganic' }).map(
        (item) => item.question.id
      )
    ).toEqual(['u1-q1']);
    expect(
      buildExamQuestionPool(units, {
        mode: 'units',
        unitIds: ['u2']
      }).map((item) => item.question.id)
    ).toEqual(['u2-q1']);
  });

  it('pickExamQuestions chọn theo tỉ lệ 40/40/20 và không trùng câu', () => {
    const pool = createPool({ basic: 12, applied: 12, hsg: 12 });
    const random = createSeededRandom(100);
    const result = pickExamQuestions(pool, 20, random);
    const counts = result.items.reduce<Record<QuestionLevel, number>>(
      (acc, item) => ({
        ...acc,
        [item.question.level]: acc[item.question.level] + 1
      }),
      { basic: 0, applied: 0, hsg: 0 }
    );

    expect(result.actualTotal).toBe(20);
    expect(counts).toEqual({ basic: 8, applied: 8, hsg: 4 });
    expect(new Set(result.items.map(getExamItemKey)).size).toBe(20);
  });

  it('pickExamQuestions bù thiếu hụt theo ưu tiên applied rồi basic', () => {
    const pool = createPool({ basic: 10, applied: 10, hsg: 1 });
    const result = pickExamQuestions(pool, 10, createSeededRandom(8));
    const counts = result.items.reduce<Record<QuestionLevel, number>>(
      (acc, item) => ({
        ...acc,
        [item.question.level]: acc[item.question.level] + 1
      }),
      { basic: 0, applied: 0, hsg: 0 }
    );

    expect(counts).toEqual({ basic: 4, applied: 5, hsg: 1 });
  });

  it('pickExamQuestions giảm actualTotal khi pool nhỏ hơn số câu yêu cầu', () => {
    const pool = createPool({ basic: 2, applied: 2, hsg: 1 });
    const result = pickExamQuestions(pool, 20, createSeededRandom(9));

    expect(result.actualTotal).toBe(5);
    expect(result.items).toHaveLength(5);
    expect(new Set(result.items.map(getExamItemKey)).size).toBe(5);
  });

  it('gradeExamAttempt chấm đúng breakdown cho câu đúng, sai và bỏ trống', () => {
    const items = createPool({ basic: 1, applied: 1, hsg: 1 });
    const responses = {
      [getExamItemKey(items[0])]: 1,
      [getExamItemKey(items[1])]: 0
    };

    expect(gradeExamAttempt(items, responses)).toEqual({
      correctCount: 1,
      totalQuestions: 3,
      accuracy: 33,
      breakdown: {
        basic: { correct: 1, total: 1 },
        applied: { correct: 0, total: 1 },
        hsg: { correct: 0, total: 1 }
      }
    });
  });
});
