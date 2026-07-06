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
  type ProgressSnapshot
} from '../../src/store/progress';

const wrongQuestionKey = getWrongQuestionKey('u1', 'u1-l1', 'q1');

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
    ...overrides
  };
}

describe('progress sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    progressUpsert.mockReset();
    progressSelect.mockReset();
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

  it('mergeProgress lấy max theo lesson, union bài mở khoá và streak từ bản mới hơn', () => {
    const merged = mergeProgress(
      createSnapshot({
        lastStudyDate: '2026-07-04',
        streakCurrent: 1,
        streakLongest: 2,
        lessonProgress: {
          'a-1': {
            completed: true,
            stars: 1,
            bestAccuracy: 60,
            bestXp: 60,
            completedAt: '2026-07-04T08:00:00.000Z'
          }
        },
        unlockedLessonIds: ['a-1']
      }),
      createSnapshot({
        totalXp: 150,
        lessonProgress: {
          'a-1': {
            completed: true,
            stars: 3,
            bestAccuracy: 95,
            bestXp: 95,
            completedAt: '2026-07-05T11:00:00.000Z'
          },
          'a-2': {
            completed: true,
            stars: 2,
            bestAccuracy: 70,
            bestXp: 70,
            completedAt: '2026-07-05T12:00:00.000Z'
          }
        },
        unlockedLessonIds: ['a-1', 'a-2', 'a-3']
      })
    );

    expect(merged.totalXp).toBe(165);
    expect(merged.lessonProgress['a-1'].stars).toBe(3);
    expect(merged.lessonProgress['a-1'].bestAccuracy).toBe(95);
    expect(merged.lessonProgress['a-1'].completedAt).toBe(
      '2026-07-05T11:00:00.000Z'
    );
    expect(merged.unlockedLessonIds).toEqual(['a-1', 'a-2', 'a-3']);
    expect(merged.streakCurrent).toBe(2);
    expect(merged.lastStudyDate).toBe('2026-07-05');
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

  it('mergeProgress giữ streakLongest lịch sử dù bên có ngày cũ hơn', () => {
    const merged = mergeProgress(
      createSnapshot({
        lastStudyDate: '2026-07-05',
        streakCurrent: 2,
        streakLongest: 4
      }),
      createSnapshot({
        lastStudyDate: '2026-07-04',
        streakCurrent: 7,
        streakLongest: 9
      })
    );

    expect(merged.lastStudyDate).toBe('2026-07-05');
    expect(merged.streakCurrent).toBe(2);
    expect(merged.streakLongest).toBe(9);
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
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 2,
            lastMissedAt: '2026-07-05T09:00:00.000Z'
          },
          bad: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q2'
          }
        }
      })
    ).toMatchObject({
      wrongQuestions: {
        [wrongQuestionKey]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q1',
          missCount: 2
        }
      }
    });
  });

  it('mergeProgress giữ câu sai khi cả hai bên đều còn entry', () => {
    const merged = mergeProgress(
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 1,
            lastMissedAt: '2026-07-05T09:00:00.000Z',
            resolvedAt: '2026-07-05T10:00:00.000Z'
          }
        },
        lastMutationAt: '2026-07-05T09:00:00.000Z'
      }),
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 3,
            lastMissedAt: '2026-07-05T11:00:00.000Z',
            resolvedAt: '2026-07-05T12:00:00.000Z'
          }
        },
        lastMutationAt: '2026-07-05T11:00:00.000Z'
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toEqual({
      unitId: 'u1',
      lessonId: 'u1-l1',
      questionId: 'q1',
      missCount: 3,
      lastMissedAt: '2026-07-05T11:00:00.000Z',
      resolvedAt: '2026-07-05T12:00:00.000Z'
    });
  });

  it('mergeProgress giữ câu sai khi chỉ một bên còn entry', () => {
    const merged = mergeProgress(
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 1,
            lastMissedAt: '2026-07-05T09:00:00.000Z'
          }
        },
        lastMutationAt: '2026-07-05T09:00:00.000Z'
      }),
      createSnapshot({
        wrongQuestions: {},
        lastMutationAt: '2026-07-05T08:00:00.000Z'
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toMatchObject({
      questionId: 'q1',
      missCount: 1
    });
  });

  it('mergeProgress không làm rơi câu sai vì mutation không liên quan ở snapshot còn thiếu key', () => {
    const merged = mergeProgress(
      createSnapshot({
        lessonProgress: {
          'a-1': {
            completed: true,
            stars: 2,
            bestAccuracy: 80,
            bestXp: 80,
            completedAt: '2026-07-05T10:00:00.000Z'
          },
          'a-2': {
            completed: true,
            stars: 3,
            bestAccuracy: 100,
            bestXp: 100,
            completedAt: '2026-07-05T10:00:00.000Z'
          }
        },
        wrongQuestions: {},
        lastMutationAt: '2026-07-05T10:00:00.000Z'
      }),
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 2,
            lastMissedAt: '2026-07-05T09:00:00.000Z'
          }
        },
        lastMutationAt: '2026-07-05T09:00:00.000Z'
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toMatchObject({
      unitId: 'u1',
      lessonId: 'u1-l1',
      questionId: 'q1',
      missCount: 2,
      lastMissedAt: '2026-07-05T09:00:00.000Z'
    });
    expect(merged.wrongQuestions[wrongQuestionKey].resolvedAt).toBeUndefined();
    expect(
      isWrongQuestionPending(merged.wrongQuestions[wrongQuestionKey])
    ).toBe(true);
  });

  it('mergeProgress giữ tombstone resolvedAt mới nhất khi cả hai bên cùng có entry', () => {
    const merged = mergeProgress(
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 2,
            lastMissedAt: '2026-07-05T09:00:00.000Z',
            resolvedAt: '2026-07-05T10:00:00.000Z'
          }
        }
      }),
      createSnapshot({
        wrongQuestions: {
          [wrongQuestionKey]: {
            unitId: 'u1',
            lessonId: 'u1-l1',
            questionId: 'q1',
            missCount: 1,
            lastMissedAt: '2026-07-05T08:00:00.000Z',
            resolvedAt: '2026-07-05T11:00:00.000Z'
          }
        }
      })
    );

    expect(merged.wrongQuestions[wrongQuestionKey]).toMatchObject({
      missCount: 2,
      lastMissedAt: '2026-07-05T09:00:00.000Z',
      resolvedAt: '2026-07-05T11:00:00.000Z'
    });
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
});
