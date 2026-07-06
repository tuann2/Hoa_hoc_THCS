import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProgressStore,
  getWrongQuestionKey,
  isWrongQuestionPending,
  migrateProgressState,
  PROGRESS_STORAGE_KEY,
  resetProgressStoreForTests,
  type ExamAttempt
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

function createExamAttempt(index: number): ExamAttempt {
  const minute = String(index).padStart(2, '0');

  return {
    id: `exam-${index}`,
    startedAt: `2026-07-06T09:${minute}:00.000Z`,
    finishedAt: `2026-07-06T10:${minute}:00.000Z`,
    scope: { mode: 'all' },
    totalQuestions: 20,
    correctCount: 10 + index,
    accuracy: 50 + index,
    breakdown: {
      basic: { correct: 4, total: 8 },
      applied: { correct: 4, total: 8 },
      hsg: { correct: 2, total: 4 }
    }
  };
}

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

  it('ghi nhận câu sai và clearWrongAnswer đặt resolvedAt thay vì xoá key', () => {
    const store = createProgressStore(fixtureUnits);
    const firstMissedAt = new Date('2026-07-05T09:00:00.000Z');
    const secondMissedAt = new Date('2026-07-06T09:00:00.000Z');
    const resolvedAt = new Date('2026-07-06T10:00:00.000Z');
    const firstKey = getWrongQuestionKey('u1', 'u1-l1', 'q1');
    const secondKey = getWrongQuestionKey('u1', 'u1-l2', 'q2');

    store.getState().recordWrongAnswer('u1', 'u1-l1', 'q1', firstMissedAt);
    store.getState().recordWrongAnswer('u1', 'u1-l1', 'q1', secondMissedAt);
    store.getState().recordWrongAnswer('u1', 'u1-l2', 'q2', secondMissedAt);

    expect(store.getState().wrongQuestions[firstKey]).toMatchObject({
      unitId: 'u1',
      lessonId: 'u1-l1',
      questionId: 'q1',
      missCount: 2,
      lastMissedAt: secondMissedAt.toISOString()
    });

    store.getState().clearWrongAnswer('u1', 'u1-l1', 'q1', resolvedAt);

    expect(store.getState().wrongQuestions[firstKey]).toMatchObject({
      questionId: 'q1',
      missCount: 2,
      lastMissedAt: secondMissedAt.toISOString(),
      resolvedAt: resolvedAt.toISOString()
    });
    expect(
      isWrongQuestionPending(store.getState().wrongQuestions[firstKey])
    ).toBe(false);
    expect(store.getState().wrongQuestions[secondKey]).toBeDefined();
  });

  it('một lần sai lại sau khi resolved làm câu hỏi pending trở lại', () => {
    const store = createProgressStore(fixtureUnits);
    const key = getWrongQuestionKey('u1', 'u1-l1', 'q1');

    store
      .getState()
      .recordWrongAnswer(
        'u1',
        'u1-l1',
        'q1',
        new Date('2026-07-05T09:00:00.000Z')
      );
    store
      .getState()
      .clearWrongAnswer(
        'u1',
        'u1-l1',
        'q1',
        new Date('2026-07-05T10:00:00.000Z')
      );
    store
      .getState()
      .recordWrongAnswer(
        'u1',
        'u1-l1',
        'q1',
        new Date('2026-07-05T11:00:00.000Z'),
        { incrementMissCount: false }
      );

    expect(store.getState().wrongQuestions[key]).toMatchObject({
      lastMissedAt: '2026-07-05T11:00:00.000Z',
      resolvedAt: '2026-07-05T10:00:00.000Z'
    });
    expect(isWrongQuestionPending(store.getState().wrongQuestions[key])).toBe(
      true
    );
  });

  it('migrate từ v1 lên v2 thêm wrongQuestions rỗng', () => {
    expect(
      migrateProgressState(
        {
          totalXp: 80,
          streakCurrent: 1,
          streakLongest: 2,
          lastStudyDate: '2026-07-05',
          lessonProgress: {},
          unlockedLessonIds: ['u1-l1']
        },
        1
      )
    ).toMatchObject({
      totalXp: 80,
      unlockedLessonIds: ['u1-l1'],
      wrongQuestions: {},
      lastMutationAt: null
    });
  });

  it('migrate từ v2 lên v3 thêm examHistory rỗng', () => {
    expect(
      migrateProgressState(
        {
          totalXp: 80,
          streakCurrent: 1,
          streakLongest: 2,
          lastStudyDate: '2026-07-05',
          lastMutationAt: '2026-07-05T09:00:00.000Z',
          lessonProgress: {},
          unlockedLessonIds: ['u1-l1'],
          wrongQuestions: {}
        },
        2
      )
    ).toMatchObject({
      wrongQuestions: {},
      examHistory: []
    });
  });

  it('recordExamAttempt prepend đúng thứ tự và cắt còn tối đa 20 phần tử', () => {
    const store = createProgressStore(fixtureUnits);

    Array.from({ length: 21 }, (_, index) =>
      createExamAttempt(index + 1)
    ).forEach((attempt) => {
      store.getState().recordExamAttempt(attempt);
    });

    expect(store.getState().examHistory).toHaveLength(20);
    expect(store.getState().examHistory[0].id).toBe('exam-21');
    expect(store.getState().examHistory[19].id).toBe('exam-2');
    expect(store.getState().lastMutationAt).toBe('2026-07-06T10:21:00.000Z');
  });
});
