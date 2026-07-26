import {
  getAvailableLessonCount,
  getUnitCatalog,
  partLabels
} from './contentCatalog';
import { supabase } from './supabase';
import {
  isWrongQuestionPending,
  migrateProgressState,
  type ExamAttempt,
  type LessonProgress,
  type ProgressSnapshot
} from '../store/progress';
import { normalizeProgressSnapshot } from './progressSync';
import type { PartId, UnitSummary } from '../types/content';

export const ADMIN_REPORT_PAGE_SIZE = 500;
export const ADMIN_REPORT_MAX_LEARNERS = 1_000;
export const ADMIN_REPORT_MAX_RANGE_DAYS = 365;

export interface AdminProfileRow {
  id: string;
  display_name: string;
}

export interface AdminProgressRow {
  user_id: string;
  data: unknown;
  updated_at: string;
  version: number;
}

export interface StudyDailyTotalRow {
  active_seconds: number;
  study_date: string;
  user_id: string;
}

export interface DailyStudyTime {
  activeSeconds: number;
  date: string;
}

export interface AdminLearnerSummary {
  availableLessons: number;
  completedLessons: number;
  completionPercent: number;
  displayName: string;
  lastStudyDate: string | null;
  lastSyncedAt: string | null;
  masteredLessons: number;
  pendingReviewCount: number;
  streakCurrent: number;
  studySecondsLast7Days: number;
  studySecondsToday: number;
  totalXp: number;
  userId: string;
}

export interface AdminPartBreakdown {
  availableLessons: number;
  completedLessons: number;
  completionPercent: number;
  part: PartId;
  title: string;
}

export interface AdminLessonStatus {
  lessonId: string;
  part: PartId;
  status: 'completed' | 'nearly-complete';
  title: string;
}

export interface AdminAccuracyStats {
  averageBestAccuracy: number;
  bestAccuracy: number;
  measuredLessons: number;
}

export interface AdminLearnerDetail extends AdminLearnerSummary {
  accuracy: AdminAccuracyStats;
  dailyStudyTime: DailyStudyTime[];
  lessonStatus: AdminLessonStatus[];
  partBreakdown: AdminPartBreakdown[];
  recentExamHistory: ExamAttempt[];
}

export interface DateRange {
  from: string;
  to: string;
}

interface PagedResult<T> {
  count: number | null;
  data: T[] | null;
  error: unknown;
}

export type PageFetcher<T> = (
  from: number,
  to: number
) => PromiseLike<PagedResult<T>>;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Không tải được báo cáo.');
}

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateDistanceInclusive(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function getVietnamDateKey(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
}

export function getRecentDateRange(days: number, now = new Date()): DateRange {
  const safeDays = Math.max(1, Math.min(ADMIN_REPORT_MAX_RANGE_DAYS, days));
  const to = getVietnamDateKey(now);
  return { from: addDays(to, 1 - safeDays), to };
}

export function validateDateRange(range: DateRange): string | null {
  if (!validDateKey(range.from) || !validDateKey(range.to)) {
    return 'Ngày báo cáo không hợp lệ.';
  }

  if (range.from > range.to) {
    return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
  }

  if (
    dateDistanceInclusive(range.from, range.to) > ADMIN_REPORT_MAX_RANGE_DAYS
  ) {
    return 'Khoảng báo cáo tối đa là 365 ngày (tính cả hai đầu).';
  }

  return null;
}

export function fillDailyStudyTime(
  range: DateRange,
  rows: StudyDailyTotalRow[]
): DailyStudyTime[] {
  const error = validateDateRange(range);
  if (error) {
    throw new Error(error);
  }

  const secondsByDate = new Map<string, number>();
  rows.forEach((row) => {
    if (
      validDateKey(row.study_date) &&
      row.study_date >= range.from &&
      row.study_date <= range.to &&
      Number.isFinite(row.active_seconds)
    ) {
      secondsByDate.set(
        row.study_date,
        Math.min(86_400, Math.max(0, Math.floor(row.active_seconds)))
      );
    }
  });

  const days: DailyStudyTime[] = [];
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) {
    days.push({ date, activeSeconds: secondsByDate.get(date) ?? 0 });
  }
  return days;
}

export function formatStudyDuration(activeSeconds: number): string {
  const seconds = Math.max(0, Math.floor(activeSeconds));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;

  if (seconds === 0) {
    return '0 phút';
  }

  if (hours > 0) {
    return remainingSeconds > 0
      ? `${hours} giờ ${minutes} phút ${remainingSeconds} giây`
      : `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return remainingSeconds > 0
      ? `${minutes} phút ${remainingSeconds} giây`
      : `${minutes} phút`;
  }

  return `${remainingSeconds} giây`;
}

/** Fetches every page and rejects incomplete PostgREST responses. */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  pageSize = ADMIN_REPORT_PAGE_SIZE,
  maxExpectedRows?: number
): Promise<T[]> {
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > ADMIN_REPORT_PAGE_SIZE
  ) {
    throw new Error('Kích thước trang báo cáo không hợp lệ.');
  }

  const rows: T[] = [];
  let expectedCount: number | null = null;

  for (let offset = 0; ; offset += pageSize) {
    const result = await fetchPage(offset, offset + pageSize - 1);
    if (result.error) {
      throw toError(result.error);
    }

    const page = result.data ?? [];
    if (expectedCount === null) {
      expectedCount = result.count;
      if (expectedCount === null) {
        throw new Error('Không xác minh được số hàng báo cáo.');
      }
      if (maxExpectedRows !== undefined && expectedCount > maxExpectedRows) {
        throw new Error(
          `Số hàng báo cáo vượt ngưỡng ${maxExpectedRows}; cần thiết kế server-side projection mới.`
        );
      }
    } else if (result.count !== null && result.count !== expectedCount) {
      throw new Error('Số hàng báo cáo thay đổi trong khi đang phân trang.');
    }

    rows.push(...page);
    if (rows.length >= expectedCount) {
      if (rows.length !== expectedCount) {
        throw new Error('Kết quả báo cáo vượt quá số hàng đã xác minh.');
      }
      return rows;
    }

    if (page.length === 0) {
      throw new Error('Kết quả báo cáo bị thiếu trước khi tải đủ các trang.');
    }
  }
}

function safeSnapshot(
  row: AdminProgressRow | undefined
): ProgressSnapshot | null {
  if (!row || !Number.isInteger(row.version)) {
    return null;
  }

  try {
    return normalizeProgressSnapshot(
      migrateProgressState(row.data, row.version)
    );
  } catch {
    return null;
  }
}

function summarySnapshot(snapshot: ProgressSnapshot | null): ProgressSnapshot {
  return (
    snapshot ?? {
      totalXp: 0,
      streakCurrent: 0,
      streakLongest: 0,
      lastStudyDate: null,
      lastMutationAt: null,
      lessonProgress: {},
      unlockedLessonIds: [],
      wrongQuestions: {},
      examHistory: []
    }
  );
}

function availableLessons(
  units: UnitSummary[]
): UnitSummary['lessons'][number][] {
  return units.flatMap((unit) =>
    unit.lessons.filter((lesson) => lesson.status === 'available')
  );
}

function completedLessonCount(
  snapshot: ProgressSnapshot,
  units: UnitSummary[]
): number {
  const availableIds = new Set(
    availableLessons(units).map((lesson) => lesson.id)
  );
  return Object.entries(snapshot.lessonProgress).filter(
    ([lessonId, progress]) => availableIds.has(lessonId) && progress.completed
  ).length;
}

function buildSummary(
  profile: AdminProfileRow,
  progress: AdminProgressRow | undefined,
  totals: StudyDailyTotalRow[],
  now: Date,
  units: UnitSummary[]
): AdminLearnerSummary {
  const snapshot = summarySnapshot(safeSnapshot(progress));
  const available = getAvailableLessonCount(units);
  const completed = completedLessonCount(snapshot, units);
  const today = getVietnamDateKey(now);
  const last7 = getRecentDateRange(7, now);
  const studySecondsToday = totals
    .filter((row) => row.study_date === today)
    .reduce((sum, row) => sum + Math.max(0, row.active_seconds), 0);
  const studySecondsLast7Days = totals
    .filter((row) => row.study_date >= last7.from && row.study_date <= last7.to)
    .reduce((sum, row) => sum + Math.max(0, row.active_seconds), 0);

  return {
    userId: profile.id,
    displayName: profile.display_name.trim() || 'Chưa có tên hiển thị',
    totalXp: snapshot.totalXp,
    completedLessons: completed,
    availableLessons: available,
    completionPercent:
      available === 0 ? 0 : Math.round((completed / available) * 100),
    masteredLessons: Object.values(snapshot.lessonProgress).filter(
      (lesson) => lesson.stars === 3
    ).length,
    pendingReviewCount: Object.values(snapshot.wrongQuestions).filter(
      isWrongQuestionPending
    ).length,
    streakCurrent: snapshot.streakCurrent,
    lastStudyDate: snapshot.lastStudyDate,
    lastSyncedAt: progress?.updated_at ?? null,
    studySecondsToday,
    studySecondsLast7Days
  };
}

function partBreakdown(
  snapshot: ProgressSnapshot,
  units: UnitSummary[]
): AdminPartBreakdown[] {
  return (['inorganic', 'organic'] as const).map((part) => {
    const partUnits = units.filter((unit) => unit.part === part);
    const available = getAvailableLessonCount(partUnits);
    const completed = completedLessonCount(snapshot, partUnits);
    return {
      part,
      title: partLabels[part],
      availableLessons: available,
      completedLessons: completed,
      completionPercent:
        available === 0 ? 0 : Math.round((completed / available) * 100)
    };
  });
}

function lessonStatuses(
  snapshot: ProgressSnapshot,
  units: UnitSummary[]
): AdminLessonStatus[] {
  return units.flatMap((unit) =>
    unit.lessons.flatMap<AdminLessonStatus>((lesson) => {
      if (lesson.status !== 'available') {
        return [];
      }
      const progress = snapshot.lessonProgress[lesson.id];
      if (progress?.completed) {
        return [
          {
            lessonId: lesson.id,
            title: lesson.title,
            part: unit.part,
            status: 'completed'
          }
        ];
      }
      if (
        progress &&
        (progress.theory.completed || progress.practice.completed)
      ) {
        return [
          {
            lessonId: lesson.id,
            title: lesson.title,
            part: unit.part,
            status: 'nearly-complete'
          }
        ];
      }
      return [];
    })
  );
}

function accuracyStats(
  lessonProgress: Record<string, LessonProgress>
): AdminAccuracyStats {
  const values = Object.values(lessonProgress)
    .map((lesson) => lesson.bestAccuracy)
    .filter((value) => Number.isFinite(value));
  return {
    measuredLessons: values.length,
    averageBestAccuracy:
      values.length === 0
        ? 0
        : Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length
          ),
    bestAccuracy: values.length === 0 ? 0 : Math.max(...values)
  };
}

export function createAdminLearnerDetail(
  profile: AdminProfileRow,
  progress: AdminProgressRow | undefined,
  totals: StudyDailyTotalRow[],
  range: DateRange,
  now = new Date(),
  units = getUnitCatalog()
): AdminLearnerDetail {
  const rangeError = validateDateRange(range);
  if (rangeError) {
    throw new Error(rangeError);
  }

  const snapshot = summarySnapshot(safeSnapshot(progress));
  return {
    ...buildSummary(profile, progress, totals, now, units),
    partBreakdown: partBreakdown(snapshot, units),
    lessonStatus: lessonStatuses(snapshot, units),
    recentExamHistory: snapshot.examHistory.slice(0, 5),
    accuracy: accuracyStats(snapshot.lessonProgress),
    dailyStudyTime: fillDailyStudyTime(range, totals)
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }
  return supabase;
}

async function fetchProfiles(
  client: NonNullable<typeof supabase>,
  userId?: string
): Promise<AdminProfileRow[]> {
  return fetchAllPages<AdminProfileRow>(
    (from, to) => {
      let query = client
        .from('profiles')
        .select('id, display_name', { count: 'exact' })
        .order('id', { ascending: true });
      if (userId) {
        query = query.eq('id', userId);
      }
      return query.range(from, to);
    },
    ADMIN_REPORT_PAGE_SIZE,
    userId ? undefined : ADMIN_REPORT_MAX_LEARNERS
  );
}

async function fetchProgressRows(
  client: NonNullable<typeof supabase>,
  userId?: string
): Promise<AdminProgressRow[]> {
  return fetchAllPages<AdminProgressRow>((from, to) => {
    let query = client
      .from('progress')
      .select('user_id, data, version, updated_at', { count: 'exact' })
      .order('user_id', { ascending: true });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    return query.range(from, to);
  });
}

async function fetchTotals(
  client: NonNullable<typeof supabase>,
  range: DateRange,
  userId?: string
): Promise<StudyDailyTotalRow[]> {
  return fetchAllPages<StudyDailyTotalRow>((from, to) => {
    let query = client
      .from('study_daily_totals')
      .select('user_id, study_date, active_seconds', { count: 'exact' })
      .gte('study_date', range.from)
      .lte('study_date', range.to)
      .order('study_date', { ascending: true })
      .order('user_id', { ascending: true });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    return query.range(from, to);
  });
}

export async function fetchAdminLearners(
  now = new Date()
): Promise<AdminLearnerSummary[]> {
  const client = requireSupabase();
  const last7 = getRecentDateRange(7, now);
  // Count/fetch profiles first: the approved client-side read model is capped
  // at 1,000 learners and must not start broader data reads above that limit.
  const profiles = await fetchProfiles(client);
  const [progress, totals] = await Promise.all([
    fetchProgressRows(client),
    fetchTotals(client, last7)
  ]);
  const progressByUser = new Map(progress.map((row) => [row.user_id, row]));
  const totalsByUser = new Map<string, StudyDailyTotalRow[]>();
  totals.forEach((row) => {
    const current = totalsByUser.get(row.user_id) ?? [];
    current.push(row);
    totalsByUser.set(row.user_id, current);
  });

  return profiles
    .map((profile) =>
      buildSummary(
        profile,
        progressByUser.get(profile.id),
        totalsByUser.get(profile.id) ?? [],
        now,
        getUnitCatalog()
      )
    )
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'vi')
    );
}

export async function fetchAdminLearnerDetail(
  userId: string,
  range: DateRange,
  now = new Date()
): Promise<AdminLearnerDetail | null> {
  const rangeError = validateDateRange(range);
  if (rangeError) {
    throw new Error(rangeError);
  }

  const client = requireSupabase();
  const [profiles, progress, totals] = await Promise.all([
    fetchProfiles(client, userId),
    fetchProgressRows(client, userId),
    fetchTotals(client, range, userId)
  ]);
  const profile = profiles[0];
  if (!profile) {
    return null;
  }
  return createAdminLearnerDetail(profile, progress[0], totals, range, now);
}

export function isCurrentAdminRequest(
  expectedGeneration: number,
  expectedUserId: string,
  currentGeneration: number,
  currentUserId: string | null,
  isAdmin: boolean
): boolean {
  return (
    isAdmin &&
    expectedGeneration === currentGeneration &&
    expectedUserId === currentUserId
  );
}
