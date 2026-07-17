import { getAllUnits as getUnitCatalog } from './content';
import type { ExamBreakdown, ExamScope } from './exam';
import { supabase } from './supabase';
import { getAuthStore } from '../store/auth';
import {
  PROGRESS_VERSION,
  applyProgressSnapshot,
  buildLessonProgressEntry,
  consumeProgressMutationSource,
  getProgressSnapshot,
  getProgressStore,
  migrateProgressState,
  type ExamAttempt,
  type LessonPartProgress,
  type LessonProgress,
  normalizeLessonProgressEntry,
  type ProgressSnapshot,
  type WrongQuestionEntry
} from '../store/progress';
import type { LessonSummary, UnitSummary } from '../types/content';

let pushTimer: number | null = null;
let lastScheduledSnapshot: ProgressSnapshot | null = null;
let hasSubscribedToProgress = false;
let lastSyncedUserId: string | null = null;
const lessonById = new Map(
  getUnitCatalog()
    .flatMap((unit) => unit.lessons)
    .map((lesson) => [lesson.id, lesson] as const)
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampStars(value: number): 0 | 1 | 2 | 3 {
  if (value >= 3) {
    return 3;
  }

  if (value >= 2) {
    return 2;
  }

  if (value >= 1) {
    return 1;
  }

  return 0;
}

function findLessonById(lessonId: string): LessonSummary | undefined {
  return lessonById.get(lessonId);
}

function normalizeLessonProgress(
  lessonId: string,
  value: unknown
): LessonProgress | null {
  const normalized = normalizeLessonProgressEntry(value);

  if (!normalized) {
    return null;
  }

  const lesson = findLessonById(lessonId);

  if (!lesson) {
    return {
      ...normalized,
      theory: structuredClone(normalized.theory),
      practice: structuredClone(normalized.practice)
    };
  }

  const completedAt =
    normalized.completed || normalized.completedAt
      ? normalized.completedAt
      : undefined;

  return buildLessonProgressEntry(
    lesson,
    normalized.theory,
    normalized.practice,
    normalized.bestXp,
    completedAt
  );
}

function mergeLessonPartProgress(
  left?: LessonPartProgress,
  right?: LessonPartProgress
): LessonPartProgress {
  return {
    completed: left?.completed === true || right?.completed === true,
    accuracy: Math.max(left?.accuracy ?? 0, right?.accuracy ?? 0),
    ...(left?.bestXp !== undefined || right?.bestXp !== undefined
      ? {
          bestXp: Math.max(left?.bestXp ?? 0, right?.bestXp ?? 0)
        }
      : {})
  };
}

function normalizeWrongQuestionEntry(
  value: unknown
): WrongQuestionEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const missCount =
    typeof value.missCount === 'number' && Number.isFinite(value.missCount)
      ? Math.max(0, value.missCount)
      : null;

  if (
    typeof value.unitId !== 'string' ||
    typeof value.lessonId !== 'string' ||
    typeof value.questionId !== 'string' ||
    missCount === null ||
    typeof value.lastMissedAt !== 'string'
  ) {
    return null;
  }

  return {
    unitId: value.unitId,
    lessonId: value.lessonId,
    questionId: value.questionId,
    missCount,
    lastMissedAt: value.lastMissedAt,
    resolvedAt:
      typeof value.resolvedAt === 'string' || value.resolvedAt === null
        ? value.resolvedAt
        : undefined
  };
}

function isQuestionBreakdown(value: unknown): value is ExamBreakdown {
  if (!isRecord(value)) {
    return false;
  }

  return ['basic', 'applied', 'hsg'].every((level) => {
    const entry = value[level];

    return (
      isRecord(entry) &&
      typeof entry.correct === 'number' &&
      Number.isFinite(entry.correct) &&
      typeof entry.total === 'number' &&
      Number.isFinite(entry.total)
    );
  });
}

function normalizeExamScope(value: unknown): ExamScope | null {
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return null;
  }

  if (value.mode === 'all') {
    return { mode: 'all' };
  }

  if (
    value.mode === 'part' &&
    (value.part === 'inorganic' || value.part === 'organic')
  ) {
    return {
      mode: 'part',
      part: value.part
    };
  }

  if (value.mode === 'units' && Array.isArray(value.unitIds)) {
    const unitIds = Array.from(
      new Set(
        value.unitIds.filter(
          (unitId): unitId is string => typeof unitId === 'string'
        )
      )
    );

    if (unitIds.length === 0) {
      return null;
    }

    return {
      mode: 'units',
      unitIds
    };
  }

  return null;
}

function normalizeExamAttempt(value: unknown): ExamAttempt | null {
  if (!isRecord(value)) {
    return null;
  }

  const scope = normalizeExamScope(value.scope);
  const totalQuestions =
    typeof value.totalQuestions === 'number' &&
    Number.isFinite(value.totalQuestions)
      ? Math.max(0, value.totalQuestions)
      : null;
  const correctCount =
    typeof value.correctCount === 'number' &&
    Number.isFinite(value.correctCount)
      ? Math.max(0, value.correctCount)
      : null;
  const accuracy =
    typeof value.accuracy === 'number' && Number.isFinite(value.accuracy)
      ? Math.max(0, value.accuracy)
      : null;

  if (
    typeof value.id !== 'string' ||
    typeof value.startedAt !== 'string' ||
    typeof value.finishedAt !== 'string' ||
    !scope ||
    totalQuestions === null ||
    correctCount === null ||
    accuracy === null ||
    !isQuestionBreakdown(value.breakdown)
  ) {
    return null;
  }

  return {
    id: value.id,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    scope,
    totalQuestions,
    correctCount,
    accuracy,
    breakdown: {
      basic: {
        correct: Math.max(0, value.breakdown.basic.correct),
        total: Math.max(0, value.breakdown.basic.total)
      },
      applied: {
        correct: Math.max(0, value.breakdown.applied.correct),
        total: Math.max(0, value.breakdown.applied.total)
      },
      hsg: {
        correct: Math.max(0, value.breakdown.hsg.correct),
        total: Math.max(0, value.breakdown.hsg.total)
      }
    }
  };
}

export function normalizeProgressSnapshot(
  value: unknown
): ProgressSnapshot | null {
  if (!isRecord(value) || !isRecord(value.lessonProgress)) {
    return null;
  }

  const unlockedLessonIds = Array.isArray(value.unlockedLessonIds)
    ? value.unlockedLessonIds.filter(
        (lessonId): lessonId is string => typeof lessonId === 'string'
      )
    : null;

  if (!unlockedLessonIds) {
    return null;
  }

  const lessonProgress = Object.fromEntries(
    Object.entries(value.lessonProgress)
      .map(([lessonId, progress]) => [
        lessonId,
        normalizeLessonProgress(lessonId, progress)
      ])
      .filter((entry): entry is [string, LessonProgress] => entry[1] !== null)
  );
  const wrongQuestions = isRecord(value.wrongQuestions)
    ? Object.fromEntries(
        Object.entries(value.wrongQuestions)
          .map(([key, entry]) => [key, normalizeWrongQuestionEntry(entry)])
          .filter(
            (entry): entry is [string, WrongQuestionEntry] => entry[1] !== null
          )
      )
    : {};
  const examHistory = Array.isArray(value.examHistory)
    ? value.examHistory
        .map((attempt) => normalizeExamAttempt(attempt))
        .filter((attempt): attempt is ExamAttempt => attempt !== null)
        .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
        .slice(0, 20)
    : [];

  const totalXp =
    typeof value.totalXp === 'number' && Number.isFinite(value.totalXp)
      ? Math.max(0, value.totalXp)
      : null;
  const streakCurrent =
    typeof value.streakCurrent === 'number' &&
    Number.isFinite(value.streakCurrent)
      ? Math.max(0, value.streakCurrent)
      : null;
  const streakLongest =
    typeof value.streakLongest === 'number' &&
    Number.isFinite(value.streakLongest)
      ? Math.max(0, value.streakLongest)
      : null;

  if (totalXp === null || streakCurrent === null || streakLongest === null) {
    return null;
  }

  return {
    totalXp,
    streakCurrent,
    streakLongest,
    lastStudyDate:
      typeof value.lastStudyDate === 'string' ? value.lastStudyDate : null,
    lastMutationAt:
      typeof value.lastMutationAt === 'string' ? value.lastMutationAt : null,
    lessonProgress,
    unlockedLessonIds: Array.from(new Set(unlockedLessonIds)),
    wrongQuestions,
    examHistory
  };
}

function latestCompletedAt(left?: string, right?: string): string | undefined {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

function latestTimestamp(
  left: string | null | undefined,
  right: string | null | undefined
) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

function mergeWrongQuestionEntries(
  left: WrongQuestionEntry,
  right: WrongQuestionEntry
): WrongQuestionEntry {
  return {
    unitId: left.unitId,
    lessonId: left.lessonId,
    questionId: left.questionId,
    missCount: Math.max(left.missCount, right.missCount),
    lastMissedAt:
      left.lastMissedAt > right.lastMissedAt
        ? left.lastMissedAt
        : right.lastMissedAt,
    resolvedAt: latestTimestamp(left.resolvedAt, right.resolvedAt)
  };
}

function mergeExamHistory(
  local: ExamAttempt[],
  server: ExamAttempt[]
): ExamAttempt[] {
  return Array.from(
    [...local, ...server].reduce<Map<string, ExamAttempt>>(
      (history, attempt) => {
        const current = history.get(attempt.id);

        if (!current || attempt.finishedAt > current.finishedAt) {
          history.set(attempt.id, structuredClone(attempt));
        }

        return history;
      },
      new Map()
    )
  )
    .map(([, attempt]) => attempt)
    .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
    .slice(0, 20);
}

export function mergeProgress(
  local: ProgressSnapshot,
  server: ProgressSnapshot | null
): ProgressSnapshot {
  if (!server) {
    return structuredClone(local);
  }

  const lessonIds = new Set([
    ...Object.keys(local.lessonProgress),
    ...Object.keys(server.lessonProgress)
  ]);
  const lessonProgress = Object.fromEntries(
    Array.from(lessonIds).map((lessonId) => {
      const localLesson = local.lessonProgress[lessonId];
      const serverLesson = server.lessonProgress[lessonId];
      const lesson = findLessonById(lessonId);
      const theory = mergeLessonPartProgress(
        localLesson?.theory,
        serverLesson?.theory
      );
      const practice = mergeLessonPartProgress(
        localLesson?.practice,
        serverLesson?.practice
      );
      const bestXp = Math.max(
        localLesson?.bestXp ?? 0,
        serverLesson?.bestXp ?? 0,
        (theory.bestXp ?? 0) + (practice.bestXp ?? 0)
      );
      const completedAt = latestCompletedAt(
        localLesson?.completedAt,
        serverLesson?.completedAt
      );

      if (lesson) {
        return [
          lessonId,
          buildLessonProgressEntry(
            lesson,
            theory,
            practice,
            bestXp,
            completedAt
          )
        ];
      }

      return [
        lessonId,
        {
          theory,
          practice,
          completed:
            localLesson?.completed === true || serverLesson?.completed === true,
          stars: clampStars(
            Math.max(localLesson?.stars ?? 0, serverLesson?.stars ?? 0)
          ),
          bestAccuracy: Math.max(
            localLesson?.bestAccuracy ?? 0,
            serverLesson?.bestAccuracy ?? 0,
            theory.accuracy,
            practice.accuracy
          ),
          bestXp,
          completedAt
        } satisfies LessonProgress
      ];
    })
  );
  const wrongQuestionKeys = new Set([
    ...Object.keys(local.wrongQuestions),
    ...Object.keys(server.wrongQuestions)
  ]);
  const wrongQuestions = Object.fromEntries(
    Array.from(wrongQuestionKeys)
      .map((key) => {
        const localEntry = local.wrongQuestions[key];
        const serverEntry = server.wrongQuestions[key];

        if (localEntry && serverEntry) {
          return [
            key,
            mergeWrongQuestionEntries(localEntry, serverEntry)
          ] as const;
        }

        if (localEntry) {
          return [key, { ...localEntry }] as const;
        }

        if (!serverEntry) {
          return null;
        }

        return [key, { ...serverEntry }] as const;
      })
      .filter(
        (entry): entry is readonly [string, WrongQuestionEntry] =>
          entry !== null
      )
  );

  const totalXp = Object.values(lessonProgress).reduce(
    (sum, lesson) => sum + lesson.bestXp,
    0
  );
  const localDate = local.lastStudyDate;
  const serverDate = server.lastStudyDate;
  const newerSource =
    serverDate && (!localDate || serverDate > localDate) ? server : local;
  const streakCurrent =
    localDate && serverDate && localDate === serverDate
      ? Math.max(local.streakCurrent, server.streakCurrent)
      : newerSource.streakCurrent;

  return {
    totalXp,
    streakCurrent,
    streakLongest: Math.max(local.streakLongest, server.streakLongest),
    lastStudyDate: newerSource.lastStudyDate,
    lastMutationAt: latestTimestamp(
      local.lastMutationAt,
      server.lastMutationAt
    ),
    lessonProgress,
    unlockedLessonIds: Array.from(
      new Set([...local.unlockedLessonIds, ...server.unlockedLessonIds])
    ),
    wrongQuestions,
    examHistory: mergeExamHistory(local.examHistory, server.examHistory)
  };
}

export async function pullProgress(
  userId = getAuthStore().getState().user?.id ?? null
): Promise<ProgressSnapshot | null> {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('progress')
    .select('data, version, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (!isRecord(data)) {
    return null;
  }

  const rawData: unknown = data.data;
  const migratedData: unknown =
    typeof data.version === 'number'
      ? migrateProgressState(rawData, data.version)
      : rawData;
  const snapshot = normalizeProgressSnapshot(migratedData);

  if (!snapshot) {
    return null;
  }

  if (snapshot.lastMutationAt || typeof data.updated_at !== 'string') {
    return snapshot;
  }

  return {
    ...snapshot,
    lastMutationAt: data.updated_at
  };
}

export async function pushProgress(
  snapshot = getProgressSnapshot(getProgressStore(getUnitCatalog()).getState()),
  userId = getAuthStore().getState().user?.id ?? null
): Promise<boolean> {
  if (!supabase || !userId) {
    return false;
  }

  const { error } = await supabase.from('progress').upsert({
    user_id: userId,
    data: snapshot,
    version: PROGRESS_VERSION,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw error;
  }

  return true;
}

export function scheduleProgressPush(snapshot: ProgressSnapshot) {
  lastScheduledSnapshot = structuredClone(snapshot);

  if (pushTimer) {
    window.clearTimeout(pushTimer);
  }

  pushTimer = window.setTimeout(() => {
    const nextSnapshot = lastScheduledSnapshot;
    pushTimer = null;
    lastScheduledSnapshot = null;

    if (!nextSnapshot) {
      return;
    }

    void pushProgress(nextSnapshot).catch(() => {
      // Offline-first: bỏ qua lỗi để lần push sau ghi đè bằng bản merge mới nhất.
    });
  }, 2_000);
}

export function subscribeProgressPush(units: UnitSummary[]) {
  if (hasSubscribedToProgress) {
    return;
  }

  hasSubscribedToProgress = true;
  const progressStore = getProgressStore(units);

  progressStore.subscribe((state) => {
    const source = consumeProgressMutationSource();

    if (
      source !== 'completeLessonPart' &&
      source !== 'recordWrongAnswer' &&
      source !== 'clearWrongAnswer' &&
      source !== 'recordExamAttempt' &&
      source !== 'reset'
    ) {
      return;
    }

    scheduleProgressPush(getProgressSnapshot(state));
  });
}

export async function syncProgressOnSignIn(
  units: UnitSummary[],
  userId = getAuthStore().getState().user?.id ?? null
) {
  if (!userId || userId === lastSyncedUserId) {
    return;
  }

  const local = getProgressSnapshot(getProgressStore(units).getState());

  let server: ProgressSnapshot | null = null;

  try {
    server = await pullProgress(userId);
  } catch {
    server = null;
  }

  const merged = mergeProgress(local, server);
  applyProgressSnapshot(units, merged);
  lastSyncedUserId = userId;

  try {
    await pushProgress(merged, userId);
  } catch {
    // Nếu mạng lỗi ngay sau đăng nhập, dữ liệu local vẫn là nguồn chạy chính.
  }
}

export function resetProgressSyncForTests() {
  if (pushTimer) {
    window.clearTimeout(pushTimer);
  }

  pushTimer = null;
  lastScheduledSnapshot = null;
  hasSubscribedToProgress = false;
  lastSyncedUserId = null;
}
