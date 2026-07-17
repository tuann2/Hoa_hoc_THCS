import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadLesson,
  loadQuestion,
  loadUnit,
  loadUnits,
  resetContentLoaderForTests,
  validateUnit
} from '../../src/lib/contentLoader';

describe('content loader', () => {
  beforeEach(() => resetContentLoaderForTests());

  it('loads one unit asynchronously and caches its promise result', async () => {
    const first = await loadUnit('a1-nen-tang-hoa-hoc');
    const second = await loadUnit('a1-nen-tang-hoa-hoc');

    expect(first).toBe(second);
    expect(first.lessons.length).toBeGreaterThan(0);
  });

  it('loads selected units/lesson/question only through async APIs', async () => {
    const units = await loadUnits([
      'a1-nen-tang-hoa-hoc',
      'b1-dai-cuong-huu-co'
    ]);
    const lesson = await loadLesson('a1-nen-tang-hoa-hoc', 'a1-l1');
    const question = await loadQuestion(
      'a1-nen-tang-hoa-hoc',
      'a1-l1',
      'a1-l1-q1'
    );

    expect(units).toHaveLength(2);
    expect(lesson.id).toBe('a1-l1');
    expect(question.id).toBe('a1-l1-q1');
  });

  it('rejects unknown units and does not poison the cache after a load failure', async () => {
    await expect(loadUnit('missing-unit')).rejects.toThrow(
      'Không tìm thấy unit'
    );
    await expect(loadUnit('__proto__')).rejects.toThrow('Không tìm thấy unit');
    await expect(loadUnit('constructor')).rejects.toThrow(
      'Không tìm thấy unit'
    );
  });

  it('rejects malformed card and question elements at the loader boundary', () => {
    const validLesson = {
      id: 'lesson-1',
      cards: [{ id: 'card-1' }],
      questions: [{ id: 'question-1', type: 'single-choice' }]
    };
    const validUnit = {
      id: 'test-unit',
      part: 'inorganic',
      lessons: [validLesson]
    };

    expect(() =>
      validateUnit('test-unit', {
        ...validUnit,
        lessons: [{ ...validLesson, cards: [null] }]
      })
    ).toThrow('Nội dung unit test-unit không hợp lệ');

    expect(() =>
      validateUnit('test-unit', {
        ...validUnit,
        lessons: [{ ...validLesson, questions: [{ id: 'q' }] }]
      })
    ).toThrow('Nội dung unit test-unit không hợp lệ');
  });
});
