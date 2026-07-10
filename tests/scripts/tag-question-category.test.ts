import { describe, expect, it } from 'vitest';
import {
  inferQuestionCategory,
  tagQuestion,
  tagUnitContent
} from '../../scripts/tag-question-category';
import type { Question, UnitContent } from '../../src/types/content';

describe('tag-question-category', () => {
  it('gắn balance thành theory', () => {
    expect(
      inferQuestionCategory({
        type: 'balance',
        prompt: 'Cân bằng phương trình Fe + O2 -> Fe3O4'
      })
    ).toBe('theory');
  });

  it('giữ nguyên category hiện có nếu không dùng --force', () => {
    const question: Question = {
      id: 'q1',
      type: 'fill-blank',
      level: 'applied',
      category: 'theory',
      prompt: 'Tính số mol của 2 mol khí H2',
      answer: '2',
      explanation: '...'
    };

    expect(tagQuestion(question)).toBe(question);
  });

  it('force cho phép gắn lại category theo heuristic', () => {
    const question: Question = {
      id: 'q2',
      type: 'fill-blank',
      level: 'applied',
      category: 'theory',
      prompt: 'Tính khối lượng 5 gam NaCl trong dung dịch',
      answer: '5',
      explanation: '...'
    };

    expect(tagQuestion(question, { force: true })).toMatchObject({
      category: 'calculation'
    });
  });

  it('báo cáo lesson không có câu calculation', () => {
    const unit = {
      id: 'u1',
      part: 'inorganic',
      code: 'A1',
      title: 'Unit 1',
      order: 1,
      description: '...',
      status: 'available',
      lessons: [
        {
          id: 'u1-l1',
          title: 'Bài 1',
          order: 1,
          summary: '...',
          status: 'available',
          cards: [],
          questions: [
            {
              id: 'q1',
              type: 'single-choice',
              level: 'basic',
              prompt: 'Khái niệm chất tinh khiết là gì?',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            } as Question
          ]
        }
      ]
    } as UnitContent;

    const result = tagUnitContent(unit, { force: true });

    expect(result.report.zeroCalculationLessons).toEqual([
      {
        lessonId: 'u1-l1',
        lessonTitle: 'Bài 1',
        totalQuestions: 1,
        theoryCount: 1,
        calculationCount: 0
      }
    ]);
  });
});
