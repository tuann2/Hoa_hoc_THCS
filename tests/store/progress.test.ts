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
        questions: [
          {
            id: 'u1-l1-q1',
            type: 'single-choice',
            level: 'basic',
            category: 'theory',
            prompt: 'Câu lý thuyết',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: '...'
          },
          {
            id: 'u1-l1-q2',
            type: 'single-choice',
            level: 'basic',
            category: 'calculation',
            prompt: 'Câu bài tập',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: '...'
          }
        ]
      },
      {
        id: 'u1-l2',
        title: 'Bài 2',
        order: 2,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c2', heading: 'h', body: 'b' }],
        questions: [
          {
            id: 'u1-l2-q1',
            type: 'single-choice',
            level: 'basic',
            category: 'theory',
            prompt: 'Câu lý thuyết',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: '...'
          },
          {
            id: 'u1-l2-q2',
            type: 'single-choice',
            level: 'basic',
            category: 'calculation',
            prompt: 'Câu bài tập',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: '...'
          }
        ]
      },
      {
        id: 'u1-l3',
        title: 'Bài 3',
        order: 3,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c3', heading: 'h', body: 'b' }],
        questions: [
          {
            id: 'u1-l3-q1',
            type: 'single-choice',
            level: 'basic',
            category: 'theory',
            prompt: 'Chỉ có lý thuyết',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: '...'
          }
        ]
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

  it('chỉ mở bài sau khi hoàn thành đủ lý thuyết và bài tập', () => {
    const store = createProgressStore(fixtureUnits);

    expect(store.getState().unlockedLessonIds).toEqual(['u1-l1']);

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'theory',
        100,
        10,
        'u1-l2',
        new Date('2026-07-04')
      );

    expect(store.getState().unlockedLessonIds).not.toContain('u1-l2');
    expect(store.getState().totalXp).toBe(10);
    expect(store.getState().lessonProgress['u1-l1']).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: false, accuracy: 0 },
      completed: false,
      stars: 1,
      bestAccuracy: 50,
      bestXp: 10
    });

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'practice',
        100,
        10,
        'u1-l2',
        new Date('2026-07-04')
      );

    expect(store.getState().unlockedLessonIds).toContain('u1-l2');
    expect(store.getState().totalXp).toBe(20);
    expect(store.getState().lessonProgress['u1-l1']).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: true, accuracy: 100, bestXp: 10 },
      completed: true,
      stars: 3,
      bestAccuracy: 100,
      bestXp: 20
    });
  });

  it('cập nhật streak ở mọi lần hoàn thành một phần, không chỉ khi bài xong toàn bộ', () => {
    const store = createProgressStore(fixtureUnits);

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'theory',
        100,
        10,
        'u1-l2',
        new Date('2026-07-04')
      );

    // Hoàn thành 1 phần (chưa xong cả bài) vẫn tính là "đã học hôm nay".
    expect(store.getState().streakCurrent).toBe(1);
    expect(store.getState().streakLongest).toBe(1);
    expect(store.getState().lastStudyDate).toBe('2026-07-04');

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'practice',
        100,
        10,
        'u1-l2',
        new Date('2026-07-04')
      );

    // Cùng ngày, không tăng streak thêm lần nữa.
    expect(store.getState().streakCurrent).toBe(1);
    expect(store.getState().lastStudyDate).toBe('2026-07-04');

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[1],
        'theory',
        100,
        10,
        null,
        new Date('2026-07-05')
      );

    // Ngày kế tiếp liên tục -> streak tăng.
    expect(store.getState().streakCurrent).toBe(2);
    expect(store.getState().streakLongest).toBe(2);

    // Học lại một bài đã hoàn thành trước đó (không mở khoá bài mới)
    // vẫn được tính là học hôm nay, khớp hành vi trước FEATURE-011.
    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'practice',
        100,
        10,
        'u1-l2',
        new Date('2026-07-06')
      );

    expect(store.getState().streakCurrent).toBe(3);
    expect(store.getState().streakLongest).toBe(3);
  });

  it('bài không có phần bài tập tự completed qua theory', () => {
    const store = createProgressStore(fixtureUnits);

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[2],
        'theory',
        100,
        10,
        null,
        new Date('2026-07-07')
      );

    expect(store.getState().lessonProgress['u1-l3']).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: true, accuracy: 100, bestXp: 0 },
      completed: true,
      stars: 3,
      bestAccuracy: 100,
      bestXp: 10
    });
  });

  it('chịu lỗi localStorage hỏng và reset an toàn', () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, '{bad-json');

    const store = createProgressStore(fixtureUnits);

    expect(store.getState().unlockedLessonIds).toEqual(['u1-l1']);
    expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('hydrate từ snapshot v4 (danh mục cũ): giữ XP/streak/lịch sử thi, reset unlocks về mặc định mới', () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 4,
        state: {
          totalXp: 150,
          streakCurrent: 3,
          streakLongest: 5,
          lastStudyDate: '2026-07-18',
          lastMutationAt: '2026-07-18T09:00:00.000Z',
          lessonProgress: {
            'a1-l1': {
              theory: { completed: true, accuracy: 90 },
              practice: { completed: true, accuracy: 85 },
              completed: true,
              stars: 3,
              bestAccuracy: 90,
              bestXp: 40,
              completedAt: '2026-07-18T08:00:00.000Z'
            }
          },
          unlockedLessonIds: ['a1-l1', 'a1-l2'],
          wrongQuestions: {},
          examHistory: [createExamAttempt(1)]
        }
      })
    );

    const store = createProgressStore(fixtureUnits);
    const state = store.getState();

    // XP và lịch sử thi tích luỹ trước đó vẫn giữ nguyên sau khi danh mục
    // được xây lại (FEATURE-015).
    expect(state.totalXp).toBe(150);
    expect(state.streakCurrent).toBe(3);
    expect(state.examHistory).toMatchObject([{ id: createExamAttempt(1).id }]);
    // Tiến độ theo bài của danh mục cũ không còn ý nghĩa nên bị reset...
    expect(state.lessonProgress).toEqual({});
    // ...và unlockedLessonIds không bị để trống mà quay về mặc định của
    // danh mục mới (bài đầu tiên của unit đầu tiên), nhờ hàm merge tuỳ
    // biến trong cấu hình persist.
    expect(state.unlockedLessonIds).toEqual(['u1-l1']);
    expect(localStorage.getItem('hhthcs-progress-backup-v4')).not.toBeNull();
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

  it('migrate từ v1 thêm wrongQuestions rỗng nhưng cũng bị v5 reset tiến độ theo bài', () => {
    // Từ v5 (FEATURE-015), danh mục bài học được xây lại toàn bộ nên bất kỳ
    // snapshot nào thấp hơn v5 đều đi qua bước reset lessonProgress/
    // unlockedLessonIds/wrongQuestions, kể cả khi xuất phát từ v1.
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
      unlockedLessonIds: [],
      wrongQuestions: {},
      lastMutationAt: null
    });
  });

  it('migrate từ v2 thêm examHistory rỗng nhưng cũng bị v5 reset tiến độ theo bài', () => {
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
      unlockedLessonIds: [],
      examHistory: []
    });
  });

  it('migrate từ v3 giữ totalXp/examHistory nhưng v5 reset lessonProgress/unlocks/wrongQuestions', () => {
    const migrated = migrateProgressState(
      {
        totalXp: 80,
        streakCurrent: 1,
        streakLongest: 2,
        lastStudyDate: '2026-07-05',
        lastMutationAt: '2026-07-05T09:00:00.000Z',
        lessonProgress: {
          'u1-l1': {
            completed: true,
            stars: 2,
            bestAccuracy: 80,
            bestXp: 80,
            completedAt: '2026-07-05T09:00:00.000Z'
          }
        },
        unlockedLessonIds: ['u1-l1', 'u1-l2'],
        wrongQuestions: {
          [getWrongQuestionKey('u1', 'u1-l1', 'q1')]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 2,
            lastMissedAt: '2026-07-05T08:00:00.000Z'
          }
        },
        examHistory: [createExamAttempt(1)]
      },
      3
    );

    // Danh mục 17 unit cũ đã bị thay thế (FEATURE-015): lessonId/questionId
    // cũ không còn tồn tại nên tiến độ theo bài phải được reset, trong khi
    // XP tích luỹ và lịch sử thi vẫn giữ nguyên.
    expect(migrated).toMatchObject({
      totalXp: 80,
      unlockedLessonIds: [],
      wrongQuestions: {},
      examHistory: [createExamAttempt(1)],
      lessonProgress: {}
    });
  });

  it('migrate từ v4 lên v5 sao lưu snapshot cũ và reset tiến độ theo bài, giữ XP/streak/lịch sử thi', () => {
    const legacySnapshot = {
      totalXp: 150,
      streakCurrent: 3,
      streakLongest: 5,
      lastStudyDate: '2026-07-18',
      lastMutationAt: '2026-07-18T09:00:00.000Z',
      lessonProgress: {
        'a1-l1': {
          theory: { completed: true, accuracy: 90 },
          practice: { completed: true, accuracy: 85 },
          completed: true,
          stars: 3,
          bestAccuracy: 90,
          bestXp: 40,
          completedAt: '2026-07-18T08:00:00.000Z'
        }
      },
      unlockedLessonIds: ['a1-l1', 'a1-l2'],
      wrongQuestions: {
        [getWrongQuestionKey('a1-nen-tang-hoa-hoc', 'a1-l1', 'a1-l1-q1')]: {
          unitId: 'a1-nen-tang-hoa-hoc',
          lessonId: 'a1-l1',
          questionId: 'a1-l1-q1',
          missCount: 1,
          lastMissedAt: '2026-07-18T07:00:00.000Z'
        }
      },
      examHistory: [createExamAttempt(1)]
    };

    const migrated = migrateProgressState(legacySnapshot, 4);

    expect(migrated).toMatchObject({
      totalXp: 150,
      streakCurrent: 3,
      streakLongest: 5,
      lastStudyDate: '2026-07-18',
      examHistory: [createExamAttempt(1)],
      lessonProgress: {},
      unlockedLessonIds: [],
      wrongQuestions: {}
    });

    const backup = localStorage.getItem('hhthcs-progress-backup-v4');
    expect(backup).not.toBeNull();
    expect(JSON.parse(backup as string)).toMatchObject({
      totalXp: 150,
      unlockedLessonIds: ['a1-l1', 'a1-l2']
    });
  });

  it('migrate v4->v5 không ghi đè bản sao lưu đã tồn tại', () => {
    localStorage.setItem(
      'hhthcs-progress-backup-v4',
      JSON.stringify({ totalXp: 999 })
    );

    migrateProgressState(
      {
        totalXp: 1,
        streakCurrent: 0,
        streakLongest: 0,
        lastStudyDate: null,
        lessonProgress: {},
        unlockedLessonIds: []
      },
      4
    );

    expect(
      JSON.parse(localStorage.getItem('hhthcs-progress-backup-v4') as string)
    ).toMatchObject({ totalXp: 999 });
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
