import { describe, expect, it } from 'vitest';
import { validateUnits } from '../../src/lib/contentValidation';
import type { UnitContent } from '../../src/types/content';

const validUnit: UnitContent = {
  id: 'a1-nen-tang-hoa-hoc',
  part: 'inorganic',
  code: 'A1',
  title: 'Unit hợp lệ',
  order: 1,
  description: 'Mô tả',
  status: 'available',
  lessons: [
    {
      id: 'lesson-1',
      title: 'Bài 1',
      order: 1,
      summary: 'Tóm tắt',
      status: 'available',
      cards: [{ id: 'c1', heading: 'Lý thuyết', body: 'Nội dung' }],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          level: 'basic',
          category: 'theory',
          prompt: '...',
          options: ['A', 'B', 'C', 'D', 'E'],
          answer: 0,
          explanation: 'B1. ...'
        },
        {
          id: 'q2',
          type: 'single-choice',
          level: 'basic',
          category: 'theory',
          prompt: '...',
          options: ['A', 'B', 'C', 'D', 'E'],
          answer: 1,
          explanation: 'B1. ...'
        },
        {
          id: 'q3',
          type: 'single-choice',
          level: 'basic',
          category: 'theory',
          prompt: '...',
          options: ['A', 'B', 'C', 'D', 'E'],
          answer: 2,
          explanation: 'B1. ...'
        },
        {
          id: 'q4',
          type: 'single-choice',
          level: 'basic',
          category: 'theory',
          prompt: '...',
          options: ['A', 'B', 'C', 'D', 'E'],
          answer: 3,
          explanation: 'B1. ...'
        },
        {
          id: 'q5',
          type: 'single-choice',
          level: 'basic',
          category: 'theory',
          prompt: '...',
          options: ['A', 'B', 'C', 'D', 'E'],
          answer: 4,
          explanation: 'B1. ...'
        },
        {
          id: 'q6',
          type: 'fill-blank',
          level: 'applied',
          category: 'calculation',
          prompt: '...',
          answer: '1',
          explanation: 'B1. ...'
        },
        {
          id: 'q7',
          type: 'fill-blank',
          level: 'applied',
          category: 'calculation',
          prompt: '...',
          answer: '1',
          explanation: 'B1. ...'
        },
        {
          id: 'q8',
          type: 'fill-blank',
          level: 'applied',
          category: 'calculation',
          prompt: '...',
          answer: '1',
          explanation: 'B1. ...'
        },
        {
          id: 'q9',
          type: 'fill-blank',
          level: 'applied',
          category: 'calculation',
          prompt: '...',
          answer: '1',
          explanation: 'B1. ...'
        },
        {
          id: 'q10',
          type: 'fill-blank',
          level: 'applied',
          category: 'calculation',
          prompt: '...',
          answer: '1',
          explanation: 'B1. ...'
        },
        {
          id: 'q11',
          type: 'balance',
          level: 'hsg',
          category: 'theory',
          prompt: '...',
          left: ['H2', 'O2'],
          right: ['H2O'],
          answer: [2, 1, 2],
          explanation: 'B1. ...'
        },
        {
          id: 'q12',
          type: 'balance',
          level: 'hsg',
          category: 'theory',
          prompt: '...',
          left: ['H2', 'Cl2'],
          right: ['HCl'],
          answer: [1, 1, 2],
          explanation: 'B1. ...'
        },
        {
          id: 'q13',
          type: 'balance',
          level: 'hsg',
          category: 'theory',
          prompt: '...',
          left: ['N2', 'H2'],
          right: ['NH3'],
          answer: [1, 3, 2],
          explanation: 'B1. ...'
        }
      ]
    }
  ]
};

describe('validate-content', () => {
  it('bắt đáp án ngoài options', () => {
    const invalid = structuredClone(validUnit);
    const question = invalid.lessons[0].questions[0];

    if (question.type === 'single-choice') {
      question.answer = 9;
    }

    expect(validateUnits([invalid]).join('\n')).toContain(
      'đáp án ngoài phạm vi options'
    );
  });

  it('bắt câu thiếu lời giải', () => {
    const invalid = structuredClone(validUnit);
    invalid.lessons[0].questions[1].explanation = '';

    expect(validateUnits([invalid]).join('\n')).toContain(
      'thiếu lời giải chi tiết'
    );
  });

  it('bắt phương trình cân bằng sai', () => {
    const invalid = structuredClone(validUnit);
    const balanceQuestion = invalid.lessons[0].questions[10];

    if (balanceQuestion.type === 'balance') {
      balanceQuestion.answer = [1, 1, 1];
    }

    expect(validateUnits([invalid]).join('\n')).toContain(
      'phương trình cân bằng không đúng về số nguyên tử'
    );
  });

  it('bắt câu thiếu category', () => {
    const invalid = structuredClone(validUnit);
    delete (invalid.lessons[0].questions[0] as { category?: string }).category;

    expect(validateUnits([invalid]).join('\n')).toContain(
      'a1-nen-tang-hoa-hoc/lesson-1/q1: category phải là "theory" hoặc "calculation".'
    );
  });

  it('bắt category không hợp lệ', () => {
    const invalid = structuredClone(validUnit);
    (invalid.lessons[0].questions[1] as { category: string }).category =
      'practice';

    expect(validateUnits([invalid]).join('\n')).toContain(
      'a1-nen-tang-hoa-hoc/lesson-1/q2: category phải là "theory" hoặc "calculation".'
    );
  });

  it('bắt câu balance bị gắn category calculation', () => {
    const invalid = structuredClone(validUnit);
    (invalid.lessons[0].questions[10] as { category: string }).category =
      'calculation';

    expect(validateUnits([invalid]).join('\n')).toContain(
      'a1-nen-tang-hoa-hoc/lesson-1/q11: câu balance phải có category "theory", không được là "calculation".'
    );
  });
});
