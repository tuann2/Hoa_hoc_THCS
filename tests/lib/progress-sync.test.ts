import { beforeEach, describe, expect, it, vi } from 'vitest';

const { progressUpsert, progressSelect, mockSupabase } = vi.hoisted(() => {
  const progressUpsert = vi.fn();
  const progressSelect = vi.fn();

  return {
    progressUpsert,
    progressSelect,
    mockSupabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        })),
        resetPasswordForEmail: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn()
      },
      from: vi.fn((table: string) => {
        if (table === 'progress') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: progressSelect
              }))
            })),
            upsert: progressUpsert
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: null, error: null })
              )
            }))
          })),
          upsert: vi.fn()
        };
      })
    }
  };
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('../../src/lib/content', () => ({
  getAllUnits: () => [
    {
      id: 'u1',
      part: 'inorganic',
      code: 'A0',
      title: 'Unit thử nghiệm',
      order: 1,
      description: '...',
      status: 'available',
      lessons: [
        {
          id: 'a-1',
          title: 'Bài 1',
          order: 1,
          summary: '...',
          status: 'available',
          cards: [],
          questions: [
            {
              id: 'a-1-q1',
              type: 'single-choice',
              level: 'basic',
              category: 'theory',
              prompt: 'LT',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            },
            {
              id: 'a-1-q2',
              type: 'single-choice',
              level: 'basic',
              category: 'calculation',
              prompt: 'BT',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            }
          ]
        },
        {
          id: 'a-2',
          title: 'Bài 2',
          order: 2,
          summary: '...',
          status: 'available',
          cards: [],
          questions: [
            {
              id: 'a-2-q1',
              type: 'single-choice',
              level: 'basic',
              category: 'theory',
              prompt: 'LT',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            },
            {
              id: 'a-2-q2',
              type: 'single-choice',
              level: 'basic',
              category: 'calculation',
              prompt: 'BT',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            }
          ]
        }
      ]
    }
  ],
  getQuestionsByCategory: (
    lesson: {
      questions: Array<{ category: 'theory' | 'calculation' }>;
    },
    category: 'theory' | 'calculation'
  ) => lesson.questions.filter((question) => question.category === category)
}));

import {
  mergeProgress,
  normalizeProgressSnapshot,
  pullProgress,
  resetProgressSyncForTests,
  scheduleProgressPush
} from '../../src/lib/progressSync';
import { getAuthStore, resetAuthStoreForTests } from '../../src/store/auth';
import {
  getWrongQuestionKey,
  isWrongQuestionPending,
  PROGRESS_VERSION,
  type ExamAttempt,
  type LessonProgress,
  type ProgressSnapshot
} from '../../src/store/progress';

const wrongQuestionKey = getWrongQuestionKey('u1', 'a-1', 'q1');

function createExamAttempt(
  index: number,
  overrides: Partial<ExamAttempt> = {}
) {
  const minute = String(index).padStart(2, '0');

  return {
    id: `exam-${index}`,
    startedAt: `2026-07-06T09:${minute}:00.000Z`,
    finishedAt: `2026-07-06T10:${minute}:00.000Z`,
    scope: { mode: 'all' as const },
    totalQuestions: 20,
    correctCount: 10,
    accuracy: 50,
    breakdown: {
      basic: { correct: 4, total: 8 },
      applied: { correct: 4, total: 8 },
      hsg: { correct: 2, total: 4 }
    },
    ...overrides
  };
}

function createLessonProgress(
  overrides: Partial<LessonProgress> = {}
): LessonProgress {
  const theory = {
    completed: false,
    accuracy: 0,
    ...(overrides.theory ?? {})
  };
  const practice = {
    completed: false,
    accuracy: 0,
    ...(overrides.practice ?? {})
  };

  return {
    theory,
    practice,
    completed: overrides.completed ?? false,
    stars: overrides.stars ?? 0,
    bestAccuracy: overrides.bestAccuracy ?? 0,
    bestXp: overrides.bestXp ?? 0,
    completedAt: overrides.completedAt
  };
}

function createSnapshot(
  overrides: Partial<ProgressSnapshot> = {}
): ProgressSnapshot {
  return {
    totalXp: 80,
    streakCurrent: 2,
    streakLongest: 3,
    lastStudyDate: '2026-07-05',
    lastMutationAt: '2026-07-05T10:00:00.000Z',
    lessonProgress: {
      'a-1': createLessonProgress({
        theory: { completed: true, accuracy: 80, bestXp: 40 },
        practice: { completed: true, accuracy: 80, bestXp: 40 },
        completed: true,
        stars: 2,
        bestAccuracy: 80,
        bestXp: 80,
        completedAt: '2026-07-05T10:00:00.000Z'
      })
    },
    unlockedLessonIds: ['a-1', 'a-2'],
    wrongQuestions: {},
    examHistory: [],
    ...overrides
  };
}

describe('progress sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    progressUpsert.mockReset();
    progressSelect.mockReset();
    mockSupabase.auth.signOut.mockReset();
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    resetAuthStoreForTests();
    resetProgressSyncForTests();
    getAuthStore().setState({
      user: {
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2026-07-05T00:00:00.000Z',
        id: 'user-1',
        email: 'hoc-sinh@example.com',
        user_metadata: {}
      }
    });
  });

  it('mergeProgress hợp nhất theory/practice từ hai thiết bị thành bài hoàn thành', () => {
    const merged = mergeProgress(
      createSnapshot({
        totalXp: 10,
        lastStudyDate: '2026-07-04',
        streakCurrent: 1,
        streakLongest: 2,
        lessonProgress: {
          'a-1': createLessonProgress({
            theory: { completed: true, accuracy: 100, bestXp: 10 },
            practice: { completed: false, accuracy: 0 },
            completed: false,
            stars: 1,
            bestAccuracy: 50,
            bestXp: 10
          })
        },
        unlockedLessonIds: ['a-1']
      }),
      createSnapshot({
        totalXp: 10,
        lessonProgress: {
          'a-1': createLessonProgress({
            theory: { completed: false, accuracy: 0 },
            practice: { completed: true, accuracy: 100, bestXp: 10 },
            completed: false,
            stars: 1,
            bestAccuracy: 50,
            bestXp: 10
          })
        },
        unlockedLessonIds: ['a-1', 'a-2', 'a-3']
      })
    );

    expect(merged.totalXp).toBe(20);
    expect(merged.lessonProgress['a-1']).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: true, accuracy: 100, bestXp: 10 },
      completed: true,
      stars: 3,
      bestAccuracy: 100,
      bestXp: 20
    });
    expect(merged.unlockedLessonIds).toEqual(['a-1', 'a-2', 'a-3']);
    expect(merged.streakCurrent).toBe(2);
    expect(merged.lastStudyDate).toBe('2026-07-05');
  });

  it('mergeProgress không zero hoá totalXp đã tích luỹ khi lessonProgress hai bên đều rỗng (ngay sau migrate danh mục mới)', () => {
    // FEATURE-015: ngay sau khi migrateProgressState reset lessonProgress về
    // rỗng (danh mục 17 unit cũ bị thay bằng danh mục mới), cả local và
    // server đều chưa có lessonProgress nào trong danh mục mới. Nếu chỉ
    // recompute totalXp từ tổng bestXp của lessonProgress, XP đã tích luỹ
    // trước đó sẽ bị mất ngay khi đồng bộ lần đầu sau migrate.
    const merged = mergeProgress(
      createSnapshot({
        totalXp: 150,
        lessonProgress: {},
        unlockedLessonIds: []
      }),
      createSnapshot({
        totalXp: 150,
        lessonProgress: {},
        unlockedLessonIds: []
      })
    );

    expect(merged.totalXp).toBe(150);
    expect(merged.lessonProgress).toEqual({});
  });

  it('mergeProgress lấy streakCurrent cao hơn khi hai bên có cùng lastStudyDate', () => {
    const merged = mergeProgress(
      createSnapshot({
        lastStudyDate: '2026-07-05',
        streakCurrent: 2,
        streakLongest: 4
      }),
      createSnapshot({
        lastStudyDate: '2026-07-05',
        streakCurrent: 5,
        streakLongest: 3
      })
    );

    expect(merged.lastStudyDate).toBe('2026-07-05');
    expect(merged.streakCurrent).toBe(5);
  });

  it('normalizeProgressSnapshot bỏ dữ liệu hỏng', () => {
    expect(
      normalizeProgressSnapshot({
        totalXp: 100,
        streakCurrent: 1,
        streakLongest: 2,
        lastStudyDate: '2026-07-05',
        lessonProgress: 'bad-data',
        unlockedLessonIds: []
      })
    ).toBeNull();
  });

  it('normalizeProgressSnapshot nâng lessonProgress v3 từ server mà không mất dữ liệu', () => {
    expect(
      normalizeProgressSnapshot({
        totalXp: 80,
        streakCurrent: 2,
        streakLongest: 3,
        lastStudyDate: '2026-07-05',
        lastMutationAt: '2026-07-05T10:00:00.000Z',
        lessonProgress: {
          'a-1': {
            completed: true,
            stars: 2,
            bestAccuracy: 80,
            bestXp: 80,
            completedAt: '2026-07-05T10:00:00.000Z'
          }
        },
        unlockedLessonIds: ['a-1', 'a-2'],
        wrongQuestions: {},
        examHistory: []
      })
    ).toMatchObject({
      totalXp: 80,
      unlockedLessonIds: ['a-1', 'a-2'],
      lessonProgress: {
        'a-1': {
          theory: { completed: true, accuracy: 80 },
          practice: { completed: true, accuracy: 80 },
          completed: true,
          stars: 2,
          bestAccuracy: 80,
          bestXp: 80,
          completedAt: '2026-07-05T10:00:00.000Z'
        }
      }
    });
  });

  it('normalizeProgressSnapshot loại từng wrongQuestions entry hỏng nhưng giữ snapshot', () => {
    expect(
      normalizeProgressSnapshot({
        totalXp: 100,
        streakCurrent: 1,
        streakLongest: 2,
        lastStudyDate: '2026-07-05',
        lastMutationAt: '2026-07-05T10:00:00.000Z',
        lessonProgress: {},
        unlockedLessonIds: [],
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'a-1',
            questionId: 'q1',
            missCount: 2,
            lastMissedAt: '2026-07-05T09:00:00.000Z'
          },
          bad: {
            unitId: 'u1',
            lessonId: 'a-1',
            questionId: 'q2'
          }
        }
      })
    ).toMatchObject({
      wrongQuestions: {
        [wrongQuestionKey]: {
          unitId: 'u1',
          lessonId: 'a-1',
          questionId: 'q1',
          missCount: 2
        }
      }
    });
  });

  it('normalizeProgressSnapshot loại từng examHistory entry hỏng nhưng giữ snapshot', () => {
    expect(
      normalizeProgressSnapshot({
        totalXp: 100,
        streakCurrent: 1,
        streakLongest: 2,
        lastStudyDate: '2026-07-05',
        lastMutationAt: '2026-07-05T10:00:00.000Z',
        lessonProgress: {},
        unlockedLessonIds: [],
        wrongQuestions: {},
        examHistory: [
          createExamAttempt(1),
          {
            id: 'bad-exam',
            finishedAt: '2026-07-06T10:00:00.000Z'
          }
        ]
      })
    ).toMatchObject({
      examHistory: [createExamAttempt(1)]
    });
  });

  it('mergeProgress giữ câu sai khi cả hai bên đều còn entry', () => {
    const merged = mergeProgress(
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'a-1',
            questionId: 'q1',
            missCount: 1,
            lastMissedAt: '2026-07-05T09:00:00.000Z',
            resolvedAt: '2026-07-05T10:00:00.000Z'
          }
        }
      }),
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'a-1',
            questionId: 'q1',
            missCount: 3,
            lastMissedAt: '2026-07-05T11:00:00.000Z',
            resolvedAt: '2026-07-05T12:00:00.000Z'
          }
        }
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toEqual({
      unitId: 'u1',
      lessonId: 'a-1',
      questionId: 'q1',
      missCount: 3,
      lastMissedAt: '2026-07-05T11:00:00.000Z',
      resolvedAt: '2026-07-05T12:00:00.000Z'
    });
  });

  it('mergeProgress không làm rơi câu sai khi chỉ một bên còn entry', () => {
    const merged = mergeProgress(
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'a-1',
            questionId: 'q1',
            missCount: 1,
            lastMissedAt: '2026-07-05T09:00:00.000Z'
          }
        }
      }),
      createSnapshot({
        wrongQuestions: {}
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toMatchObject({
      questionId: 'q1',
      missCount: 1
    });
    expect(
      isWrongQuestionPending(merged.wrongQuestions[wrongQuestionKey])
    ).toBe(true);
  });

  it('mergeProgress hợp nhất examHistory theo id, sort giảm dần và cắt còn 20', () => {
    const localHistory = Array.from({ length: 12 }, (_, index) =>
      createExamAttempt(index + 1)
    );
    const serverHistory = [
      createExamAttempt(5, {
        accuracy: 99,
        finishedAt: '2026-07-06T10:59:00.000Z'
      }),
      ...Array.from({ length: 12 }, (_, index) => createExamAttempt(index + 12))
    ];

    const merged = mergeProgress(
      createSnapshot({ examHistory: localHistory }),
      createSnapshot({ examHistory: serverHistory })
    );

    expect(merged.examHistory).toHaveLength(20);
    expect(merged.examHistory[0].id).toBe('exam-5');
    expect(merged.examHistory[19].id).toBe('exam-4');
    expect(
      merged.examHistory.find((attempt) => attempt.id === 'exam-5')?.accuracy
    ).toBe(99);
  });

  it('pullProgress giữ local khi JSON trên server hỏng', async () => {
    progressSelect.mockResolvedValue({
      data: {
        data: {
          bad: true
        },
        version: 1
      },
      error: null
    });

    await expect(pullProgress('user-1')).resolves.toBeNull();
  });

  it('scheduleProgressPush debounce và chỉ đẩy bản mới nhất', async () => {
    progressUpsert.mockResolvedValue({ data: null, error: null });

    scheduleProgressPush(createSnapshot({ totalXp: 80 }));
    scheduleProgressPush(createSnapshot({ totalXp: 120 }));

    await vi.advanceTimersByTimeAsync(1_999);
    expect(progressUpsert).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(progressUpsert).toHaveBeenCalledTimes(1);
    const [payload] = progressUpsert.mock.calls[0] as [
      {
        user_id: string;
        data: ProgressSnapshot;
        version: number;
      }
    ];

    expect(payload.user_id).toBe('user-1');
    expect(payload.data.totalXp).toBe(120);
    expect(payload.version).toBe(PROGRESS_VERSION);
  });

  it('hủy queued push khi sign-out để không đẩy snapshot sang user khác', async () => {
    progressUpsert.mockResolvedValue({ data: null, error: null });

    scheduleProgressPush(createSnapshot({ totalXp: 120 }));
    await getAuthStore().getState().signOut();
    getAuthStore().setState({
      user: {
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2026-07-05T00:00:00.000Z',
        id: 'user-2',
        email: 'user-2@example.com',
        user_metadata: {}
      }
    });

    await vi.advanceTimersByTimeAsync(2_000);

    expect(progressUpsert).not.toHaveBeenCalled();
  });
});
