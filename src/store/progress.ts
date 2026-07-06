import { create } from 'zustand';
import {
  persist,
  type PersistStorage,
  type StorageValue
} from 'zustand/middleware';
import type { ExamBreakdown, ExamScope } from '../lib/exam';
import type { Lesson, UnitContent } from '../types/content';
import { calculateStars } from '../lib/chemistry';

export const PROGRESS_STORAGE_KEY = 'hhthcs-progress';
export const PROGRESS_VERSION = 3;

export interface LessonProgress {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestAccuracy: number;
  bestXp: number;
  completedAt?: string;
}

export interface WrongQuestionEntry {
  unitId: string;
  lessonId: string;
  questionId: string;
  missCount: number;
  lastMissedAt: string;
  resolvedAt?: string | null;
}

export interface ExamAttempt {
  id: string;
  startedAt: string;
  finishedAt: string;
  scope: ExamScope;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  breakdown: ExamBreakdown;
}

export interface ProgressSnapshot {
  totalXp: number;
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate: string | null;
  lastMutationAt: string | null;
  lessonProgress: Record<string, LessonProgress>;
  unlockedLessonIds: string[];
  wrongQuestions: Record<string, WrongQuestionEntry>;
  examHistory: ExamAttempt[];
}

export interface ProgressState {
  totalXp: number;
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate: string | null;
  lastMutationAt: string | null;
  lessonProgress: Record<string, LessonProgress>;
  unlockedLessonIds: string[];
  wrongQuestions: Record<string, WrongQuestionEntry>;
  examHistory: ExamAttempt[];
  completeLesson: (
    lesson: Lesson,
    nextLessonId: string | null,
    accuracy: number,
    earnedXp: number,
    date?: Date
  ) => void;
  recordWrongAnswer: (
    unitId: string,
    lessonId: string,
    questionId: string,
    date?: Date,
    options?: { incrementMissCount?: boolean }
  ) => void;
  clearWrongAnswer: (
    unitId: string,
    lessonId: string,
    questionId: string,
    date?: Date
  ) => void;
  recordExamAttempt: (attempt: ExamAttempt) => void;
  reset: () => void;
}

type ProgressMutationSource =
  | 'completeLesson'
  | 'recordWrongAnswer'
  | 'clearWrongAnswer'
  | 'recordExamAttempt'
  | 'reset'
  | 'hydrate';

const EMPTY_PROGRESS: ProgressSnapshot = {
  totalXp: 0,
  streakCurrent: 0,
  streakLongest: 0,
  lastStudyDate: null,
  lastMutationAt: null,
  lessonProgress: {},
  unlockedLessonIds: [],
  wrongQuestions: {},
  examHistory: []
};

let lastMutationSource: ProgressMutationSource | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yesterday(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateKey(date);
}

function deriveUnlockedLessons(units: UnitContent[]): string[] {
  return units
    .filter((unit) => unit.status === 'available')
    .map((unit) => unit.lessons.find((lesson) => lesson.status === 'available'))
    .filter((lesson): lesson is Lesson => Boolean(lesson))
    .map((lesson) => lesson.id);
}

function createSafeStorage(): PersistStorage<Partial<ProgressState>> {
  return {
    getItem: (name: string): StorageValue<Partial<ProgressState>> | null => {
      if (typeof window === 'undefined') {
        return null;
      }

      const raw = window.localStorage.getItem(name);

      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as StorageValue<Partial<ProgressState>>;
      } catch {
        window.localStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<Partial<ProgressState>>) => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.removeItem(name);
    }
  };
}

function mergeExamHistory(attempts: ExamAttempt[]): ExamAttempt[] {
  return attempts
    .reduce<ExamAttempt[]>((history, attempt) => {
      const next = history.filter((entry) => entry.id !== attempt.id);
      next.push({
        ...attempt,
        scope:
          attempt.scope.mode === 'units'
            ? {
                ...attempt.scope,
                unitIds: [...(attempt.scope.unitIds ?? [])]
              }
            : { ...attempt.scope },
        breakdown: {
          basic: { ...attempt.breakdown.basic },
          applied: { ...attempt.breakdown.applied },
          hsg: { ...attempt.breakdown.hsg }
        }
      });
      return next;
    }, [])
    .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
    .slice(0, 20);
}

export const createInitialProgressState = (units: UnitContent[]) => ({
  ...EMPTY_PROGRESS,
  unlockedLessonIds: deriveUnlockedLessons(units)
});

export function getWrongQuestionKey(
  unitId: string,
  lessonId: string,
  questionId: string
) {
  return `${unitId}::${lessonId}::${questionId}`;
}

export function isWrongQuestionPending(entry: WrongQuestionEntry): boolean {
  return !entry.resolvedAt || entry.lastMissedAt > entry.resolvedAt;
}

export function migrateProgressState(
  persistedState: unknown,
  version: number
): Partial<ProgressState> {
  if (!isRecord(persistedState)) {
    return {};
  }

  let nextState: Partial<ProgressState> = { ...persistedState };

  if (version < 2) {
    nextState = {
      ...nextState,
      wrongQuestions: {},
      lastMutationAt:
        typeof persistedState.lastMutationAt === 'string'
          ? persistedState.lastMutationAt
          : null
    };
  }

  if (version < 3) {
    nextState = {
      ...nextState,
      examHistory: []
    };
  }

  return nextState;
}

export function cloneProgressSnapshot(
  snapshot: ProgressSnapshot
): ProgressSnapshot {
  return {
    totalXp: snapshot.totalXp,
    streakCurrent: snapshot.streakCurrent,
    streakLongest: snapshot.streakLongest,
    lastStudyDate: snapshot.lastStudyDate,
    lastMutationAt: snapshot.lastMutationAt,
    lessonProgress: Object.fromEntries(
      Object.entries(snapshot.lessonProgress).map(([lessonId, progress]) => [
        lessonId,
        { ...progress }
      ])
    ),
    unlockedLessonIds: [...snapshot.unlockedLessonIds],
    wrongQuestions: Object.fromEntries(
      Object.entries(snapshot.wrongQuestions).map(([key, entry]) => [
        key,
        { ...entry }
      ])
    ),
    examHistory: snapshot.examHistory.map((attempt) => ({
      ...attempt,
      scope:
        attempt.scope.mode === 'units'
          ? {
              ...attempt.scope,
              unitIds: [...(attempt.scope.unitIds ?? [])]
            }
          : { ...attempt.scope },
      breakdown: {
        basic: { ...attempt.breakdown.basic },
        applied: { ...attempt.breakdown.applied },
        hsg: { ...attempt.breakdown.hsg }
      }
    }))
  };
}

export function getProgressSnapshot(state: ProgressState): ProgressSnapshot {
  return cloneProgressSnapshot({
    totalXp: state.totalXp,
    streakCurrent: state.streakCurrent,
    streakLongest: state.streakLongest,
    lastStudyDate: state.lastStudyDate,
    lastMutationAt: state.lastMutationAt,
    lessonProgress: state.lessonProgress,
    unlockedLessonIds: state.unlockedLessonIds,
    wrongQuestions: state.wrongQuestions,
    examHistory: state.examHistory
  });
}

export function applyProgressSnapshot(
  units: UnitContent[],
  snapshot: ProgressSnapshot
) {
  lastMutationSource = 'hydrate';
  getProgressStore(units).setState((state) => ({
    ...state,
    ...cloneProgressSnapshot(snapshot)
  }));
}

export function consumeProgressMutationSource() {
  const source = lastMutationSource;
  lastMutationSource = null;
  return source;
}

export function getNextLessonId(
  units: UnitContent[],
  unitId: string,
  lessonId: string
): string | null {
  const unit = units.find((entry) => entry.id === unitId);

  if (!unit) {
    return null;
  }

  const currentIndex = unit.lessons.findIndex(
    (lesson) => lesson.id === lessonId
  );
  const nextLesson = unit.lessons
    .slice(currentIndex + 1)
    .find((lesson) => lesson.status === 'available');

  return nextLesson?.id ?? null;
}

export const createProgressStore = (units: UnitContent[]) =>
  create<ProgressState>()(
    persist(
      (set) => ({
        ...createInitialProgressState(units),
        completeLesson: (
          lesson,
          nextLessonId,
          accuracy,
          earnedXp,
          date = new Date()
        ) =>
          set((state) => {
            lastMutationSource = 'completeLesson';
            const current = state.lessonProgress[lesson.id];
            const stars = calculateStars(accuracy);
            const bestAccuracy = Math.max(current?.bestAccuracy ?? 0, accuracy);
            const bestXp = Math.max(current?.bestXp ?? 0, earnedXp);
            const xpDelta = bestXp - (current?.bestXp ?? 0);
            const studyDate = toDateKey(date);

            let streakCurrent = state.streakCurrent;

            if (state.lastStudyDate !== studyDate) {
              if (state.lastStudyDate === yesterday(studyDate)) {
                streakCurrent += 1;
              } else {
                streakCurrent = 1;
              }
            }

            return {
              ...state,
              totalXp: state.totalXp + xpDelta,
              streakCurrent,
              streakLongest: Math.max(state.streakLongest, streakCurrent),
              lastStudyDate: studyDate,
              lastMutationAt: date.toISOString(),
              lessonProgress: {
                ...state.lessonProgress,
                [lesson.id]: {
                  completed: true,
                  stars: Math.max(current?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
                  bestAccuracy,
                  bestXp,
                  completedAt: date.toISOString()
                }
              },
              unlockedLessonIds: nextLessonId
                ? Array.from(
                    new Set([...state.unlockedLessonIds, nextLessonId])
                  )
                : state.unlockedLessonIds
            };
          }),
        recordWrongAnswer: (
          unitId,
          lessonId,
          questionId,
          date = new Date(),
          options
        ) =>
          set((state) => {
            const key = getWrongQuestionKey(unitId, lessonId, questionId);
            const current = state.wrongQuestions[key];
            const incrementMissCount = options?.incrementMissCount ?? true;

            lastMutationSource = 'recordWrongAnswer';

            return {
              ...state,
              lastMutationAt: date.toISOString(),
              wrongQuestions: {
                ...state.wrongQuestions,
                [key]: {
                  unitId,
                  lessonId,
                  questionId,
                  missCount: current
                    ? current.missCount + (incrementMissCount ? 1 : 0)
                    : 1,
                  lastMissedAt: date.toISOString(),
                  resolvedAt: current?.resolvedAt ?? null
                }
              }
            };
          }),
        clearWrongAnswer: (unitId, lessonId, questionId, date = new Date()) =>
          set((state) => {
            const key = getWrongQuestionKey(unitId, lessonId, questionId);

            if (!state.wrongQuestions[key]) {
              return state;
            }

            lastMutationSource = 'clearWrongAnswer';

            return {
              ...state,
              lastMutationAt: date.toISOString(),
              wrongQuestions: {
                ...state.wrongQuestions,
                [key]: {
                  ...state.wrongQuestions[key],
                  resolvedAt: date.toISOString()
                }
              }
            };
          }),
        recordExamAttempt: (attempt) =>
          set((state) => {
            lastMutationSource = 'recordExamAttempt';

            return {
              ...state,
              lastMutationAt: attempt.finishedAt,
              examHistory: mergeExamHistory([attempt, ...state.examHistory])
            };
          }),
        reset: () => {
          lastMutationSource = 'reset';
          set({
            ...createInitialProgressState(units),
            lastMutationAt: new Date().toISOString()
          });
        }
      }),
      {
        name: PROGRESS_STORAGE_KEY,
        version: PROGRESS_VERSION,
        migrate: migrateProgressState,
        storage: createSafeStorage()
      }
    )
  );

let storeInstance: ReturnType<typeof createProgressStore> | null = null;

export function getProgressStore(units: UnitContent[]) {
  if (!storeInstance) {
    storeInstance = createProgressStore(units);
  }

  return storeInstance;
}

export function resetProgressStoreForTests() {
  storeInstance = null;
  lastMutationSource = null;
}
