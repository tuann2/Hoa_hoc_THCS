import { getAllUnits } from './content';
import { supabase } from './supabase';
import { getAuthStore } from '../store/auth';
import {
  PROGRESS_VERSION,
  applyProgressSnapshot,
  consumeProgressMutationSource,
  getProgressSnapshot,
  getProgressStore,
  type LessonProgress,
  type ProgressSnapshot
} from '../store/progress';
import type { UnitContent } from '../types/content';

let pushTimer: number | null = null;
let lastScheduledSnapshot: ProgressSnapshot | null = null;
let hasSubscribedToProgress = false;
let lastSyncedUserId: string | null = null;

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

function normalizeLessonProgress(value: unknown): LessonProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  const bestAccuracy =
    typeof value.bestAccuracy === 'number' && Number.isFinite(value.bestAccuracy)
      ? Math.max(0, value.bestAccuracy)
      : null;
  const bestXp =
    typeof value.bestXp === 'number' && Number.isFinite(value.bestXp)
      ? Math.max(0, value.bestXp)
      : null;

  if (bestAccuracy === null || bestXp === null) {
    return null;
  }

  return {
    completed: value.completed === true,
    stars: clampStars(
      typeof value.stars === 'number' && Number.isFinite(value.stars)
        ? value.stars
        : 0
    ),
    bestAccuracy,
    bestXp,
    completedAt:
      typeof value.completedAt === 'string' ? value.completedAt : undefined
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
      .map(([lessonId, progress]) => [lessonId, normalizeLessonProgress(progress)])
      .filter(
        (entry): entry is [string, LessonProgress] => entry[1] !== null
      )
  );

  const totalXp =
    typeof value.totalXp === 'number' && Number.isFinite(value.totalXp)
      ? Math.max(0, value.totalXp)
      : null;
  const streakCurrent =
    typeof value.streakCurrent === 'number' && Number.isFinite(value.streakCurrent)
      ? Math.max(0, value.streakCurrent)
      : null;
  const streakLongest =
    typeof value.streakLongest === 'number' && Number.isFinite(value.streakLongest)
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
    lessonProgress,
    unlockedLessonIds: Array.from(new Set(unlockedLessonIds))
  };
}

function latestCompletedAt(
  left?: string,
  right?: string
): string | undefined {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
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

      return [
        lessonId,
        {
          completed: localLesson?.completed === true || serverLesson?.completed === true,
          stars: clampStars(
            Math.max(localLesson?.stars ?? 0, serverLesson?.stars ?? 0)
          ),
          bestAccuracy: Math.max(
            localLesson?.bestAccuracy ?? 0,
            serverLesson?.bestAccuracy ?? 0
          ),
          bestXp: Math.max(localLesson?.bestXp ?? 0, serverLesson?.bestXp ?? 0),
          completedAt: latestCompletedAt(
            localLesson?.completedAt,
            serverLesson?.completedAt
          )
        } satisfies LessonProgress
      ];
    })
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
    lessonProgress,
    unlockedLessonIds: Array.from(
      new Set([...local.unlockedLessonIds, ...server.unlockedLessonIds])
    )
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
    .select('data, version')
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

  return normalizeProgressSnapshot(data.data);
}

export async function pushProgress(
  snapshot = getProgressSnapshot(getProgressStore(getAllUnits()).getState()),
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

export function subscribeProgressPush(units: UnitContent[]) {
  if (hasSubscribedToProgress) {
    return;
  }

  hasSubscribedToProgress = true;
  const progressStore = getProgressStore(units);

  progressStore.subscribe((state) => {
    const source = consumeProgressMutationSource();

    if (source !== 'completeLesson' && source !== 'reset') {
      return;
    }

    scheduleProgressPush(getProgressSnapshot(state));
  });
}

export async function syncProgressOnSignIn(
  units: UnitContent[],
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
