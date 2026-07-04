import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProgressStore,
  PROGRESS_STORAGE_KEY,
  resetProgressStoreForTests
} from '../../src/store/progress';
import type { UnitContent } from '../../src/types/content';

const fixtureUnits: UnitContent[] = [
  {
    id: 'u1',
    part: 'inorganic',
    code: 'A0',
    title: 'Unit test',
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
        cards: [{ id: 'c1', heading: 'h', body: 'b' }],
        questions: []
      },
      {
        id: 'u1-l2',
        title: 'Bài 2',
        order: 2,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c2', heading: 'h', body: 'b' }],
        questions: []
      }
    ]
  }
];

describe('progress store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
  });

  it('mở khoá bài đầu tiên và mở tiếp bài sau khi hoàn thành', () => {
    const store = createProgressStore(fixtureUnits);

    expect(store.getState().unlockedLessonIds).toEqual(['u1-l1']);

    store
      .getState()
      .completeLesson(
        fixtureUnits[0].lessons[0],
        'u1-l2',
        80,
        80,
        new Date('2026-07-04')
      );

    expect(store.getState().unlockedLessonIds).toContain('u1-l2');
    expect(store.getState().totalXp).toBe(80);
    expect(store.getState().lessonProgress['u1-l1'].stars).toBe(2);
  });

  it('cập nhật streak theo ngày học', () => {
    const store = createProgressStore(fixtureUnits);

    store
      .getState()
      .completeLesson(
        fixtureUnits[0].lessons[0],
        'u1-l2',
        100,
        100,
        new Date('2026-07-04')
      );
    store
      .getState()
      .completeLesson(
        fixtureUnits[0].lessons[1],
        null,
        100,
        100,
        new Date('2026-07-05')
      );

    expect(store.getState().streakCurrent).toBe(2);
    expect(store.getState().streakLongest).toBe(2);
  });

  it('chịu lỗi localStorage hỏng và reset an toàn', () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, '{bad-json');

    const store = createProgressStore(fixtureUnits);

    expect(store.getState().unlockedLessonIds).toEqual(['u1-l1']);
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });
});
