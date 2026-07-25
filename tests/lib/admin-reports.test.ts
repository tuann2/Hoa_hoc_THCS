import { describe, expect, it } from 'vitest';
import {
  createAdminLearnerDetail,
  fetchAllPages,
  fillDailyStudyTime,
  formatStudyDuration,
  getRecentDateRange,
  validateDateRange,
  type AdminProfileRow,
  type AdminProgressRow
} from '../../src/lib/adminReports';
import { getAllUnits } from '../../src/lib/content';

const units = getAllUnits();
const availableLesson = units
  .flatMap((unit) => unit.lessons)
  .find((lesson) => lesson.status === 'available');

if (!availableLesson) {
  throw new Error('Expected an available lesson fixture.');
}

const firstAvailableLesson = availableLesson;

const profile: AdminProfileRow = {
  id: 'learner-1',
  display_name: 'Mai An'
};

function progressRow(data: unknown, version = 4): AdminProgressRow {
  return {
    user_id: profile.id,
    data,
    version,
    updated_at: '2026-07-24T03:00:00.000Z'
  };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    totalXp: 120,
    streakCurrent: 3,
    streakLongest: 5,
    lastStudyDate: '2026-07-23',
    lastMutationAt: '2026-07-23T12:00:00.000Z',
    lessonProgress: {
      [firstAvailableLesson.id]: {
        theory: { completed: true, accuracy: 100 },
        practice: { completed: true, accuracy: 100 },
        completed: true,
        stars: 3,
        bestAccuracy: 100,
        bestXp: 120
      }
    },
    unlockedLessonIds: [firstAvailableLesson.id],
    wrongQuestions: {
      pending: {
        unitId: units[0].id,
        lessonId: firstAvailableLesson.id,
        questionId: 'q-1',
        missCount: 1,
        lastMissedAt: '2026-07-23T10:00:00.000Z'
      },
      resolved: {
        unitId: units[0].id,
        lessonId: firstAvailableLesson.id,
        questionId: 'q-2',
        missCount: 1,
        lastMissedAt: '2026-07-22T10:00:00.000Z',
        resolvedAt: '2026-07-23T10:00:00.000Z'
      }
    },
    examHistory: [],
    ...overrides
  };
}

describe('admin reports', () => {
  it('tổng hợp snapshot hợp lệ và điền ngày chưa có telemetry bằng 0', () => {
    const range = { from: '2026-07-20', to: '2026-07-22' };
    const detail = createAdminLearnerDetail(
      profile,
      progressRow(snapshot()),
      [
        {
          user_id: profile.id,
          study_date: '2026-07-21',
          active_seconds: 125
        }
      ],
      range,
      new Date('2026-07-22T03:00:00.000Z'),
      units
    );

    expect(detail).toMatchObject({
      totalXp: 120,
      completedLessons: 1,
      masteredLessons: 1,
      pendingReviewCount: 1,
      accuracy: { averageBestAccuracy: 100, bestAccuracy: 100 }
    });
    expect(detail.dailyStudyTime).toEqual([
      { date: '2026-07-20', activeSeconds: 0 },
      { date: '2026-07-21', activeSeconds: 125 },
      { date: '2026-07-22', activeSeconds: 0 }
    ]);
  });

  it('migrate snapshot cũ theo version từng hàng và fail-safe với entry hỏng', () => {
    const legacy = snapshot({
      lessonProgress: {
        [firstAvailableLesson.id]: {
          completed: true,
          stars: 3,
          bestAccuracy: 100,
          bestXp: 80
        }
      }
    });
    const migrated = createAdminLearnerDetail(
      profile,
      progressRow(legacy, 3),
      [],
      { from: '2026-07-20', to: '2026-07-20' },
      new Date('2026-07-20T03:00:00.000Z'),
      units
    );
    const damaged = createAdminLearnerDetail(
      profile,
      progressRow({ lessonProgress: 'invalid' }),
      [],
      { from: '2026-07-20', to: '2026-07-20' },
      new Date('2026-07-20T03:00:00.000Z'),
      units
    );

    expect(migrated.completedLessons).toBe(1);
    expect(migrated.accuracy.bestAccuracy).toBe(100);
    expect(damaged.totalXp).toBe(0);
    expect(damaged.dailyStudyTime).toEqual([
      { date: '2026-07-20', activeSeconds: 0 }
    ]);
  });

  it('fetch đủ hơn ba trang và từ chối response thiếu/không có count', async () => {
    const rows = await fetchAllPages(
      (from, to) =>
        Promise.resolve({
          data: [0, 1, 2, 3, 4, 5, 6].slice(from, to + 1),
          count: 7,
          error: null
        }),
      2
    );

    await expect(
      fetchAllPages(() =>
        Promise.resolve({ data: [], count: null, error: null })
      )
    ).rejects.toThrow('Không xác minh được số hàng');
    await expect(
      fetchAllPages(() => Promise.resolve({ data: [], count: 2, error: null }))
    ).rejects.toThrow('bị thiếu');
    await expect(
      fetchAllPages(
        () => Promise.resolve({ data: [], count: 1_001, error: null }),
        500,
        1_000
      )
    ).rejects.toThrow('server-side projection');
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('xác thực range inclusive tối đa 365 ngày và format thời gian', () => {
    expect(
      validateDateRange({ from: '2026-01-01', to: '2026-12-31' })
    ).toBeNull();
    expect(validateDateRange({ from: '2026-01-02', to: '2026-01-01' })).toMatch(
      /bắt đầu/
    );
    expect(validateDateRange({ from: '2025-01-01', to: '2026-01-01' })).toMatch(
      /365/
    );
    expect(
      fillDailyStudyTime({ from: '2026-07-01', to: '2026-07-01' }, [])
    ).toEqual([{ date: '2026-07-01', activeSeconds: 0 }]);
    expect(formatStudyDuration(0)).toBe('0 phút');
    expect(formatStudyDuration(65)).toBe('1 phút 5 giây');
    expect(formatStudyDuration(3_600)).toBe('1 giờ 0 phút');
    expect(getRecentDateRange(7, new Date('2026-07-24T18:00:00.000Z'))).toEqual(
      {
        from: '2026-07-19',
        to: '2026-07-25'
      }
    );
  });
});
