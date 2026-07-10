import { create } from 'zustand';
import {
  persist,
  type PersistStorage,
  type StorageValue
} from 'zustand/middleware';
import type { ExamBreakdown, ExamScope } from '../lib/exam';
import { getQuestionsByCategory } from '../lib/content';
import type { Lesson, UnitContent } from '../types/content';
import { calculateStars } from '../lib/chemistry';

export const PROGRESS_STORAGE_KEY = 'hhthcs-progress';
export const PROGRESS_VERSION = 4;

export type LessonMode = 'theory' | 'practice';
export type LessonProgressPartKey = LessonMode;

export interface LessonPartProgress {
  completed: boolean;
  accuracy: number;
  bestXp?: number;
}

export interface LessonProgress {
  theory: LessonPartProgress;
  practice: LessonPartProgress;
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
  completeLessonPart: (
    lesson: Lesson,
    mode: LessonMode,
    accuracy: number,
    earnedXp: number,
    nextLessonId: string | null,
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
  | 'completeLessonPart'
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

const EMPTY_LESSON_PART_PROGRESS: LessonPartProgress = {
  completed: false,
  accuracy: 0
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampAccuracy(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampXp(value: number): number {
  return Math.max(0, Math.round(value));
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

function questionCategoryForMode(mode: LessonMode) {
  return mode === 'theory' ? 'theory' : 'calculation';
}

function normalizeLessonPartProgress(
  value: unknown
): LessonPartProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  const accuracy =
    typeof value.accuracy === 'number' && Number.isFinite(value.accuracy)
      ? clampAccuracy(value.accuracy)
      : null;
  const bestXp =
    typeof value.bestXp === 'number' && Number.isFinite(value.bestXp)
      ? clampXp(value.bestXp)
      : undefined;

  if (accuracy === null) {
    return null;
  }

  return {
    completed: value.completed === true,
    accuracy,
    ...(bestXp === undefined ? {} : { bestXp })
  };
}

function cloneLessonPartProgress(
  part: LessonPartProgress | undefined
): LessonPartProgress {
  if (!part) {
    return { ...EMPTY_LESSON_PART_PROGRESS };
  }

  return part.bestXp === undefined
    ? {
        completed: part.completed,
        accuracy: part.accuracy
      }
    : {
        completed: part.completed,
        accuracy: part.accuracy,
        bestXp: part.bestXp
      };
}

function migrateLegacyLessonProgress(value: unknown): LessonProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  const bestAccuracySource =
    typeof value.bestAccuracy === 'number' &&
    Number.isFinite(value.bestAccuracy)
      ? value.bestAccuracy
      : typeof value.accuracy === 'number' && Number.isFinite(value.accuracy)
        ? value.accuracy
        : 0;
  const bestAccuracy = clampAccuracy(bestAccuracySource);
  const bestXp =
    typeof value.bestXp === 'number' && Number.isFinite(value.bestXp)
      ? clampXp(value.bestXp)
      : 0;

  return {
    theory: {
      completed: value.completed === true,
      accuracy: bestAccuracy
    },
    practice: {
      completed: value.completed === true,
      accuracy: bestAccuracy
    },
    completed: value.completed === true,
    stars: clampStars(
      typeof value.stars === 'number' && Number.isFinite(value.stars)
        ? value.stars
        : calculateStars(bestAccuracy)
    ),
    bestAccuracy,
    bestXp,
    completedAt:
      typeof value.completedAt === 'string' ? value.completedAt : undefined
  };
}

export function normalizeLessonProgressEntry(
  value: unknown
): LessonProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!('theory' in value) || !('practice' in value)) {
    return migrateLegacyLessonProgress(value);
  }

  const theory = normalizeLessonPartProgress(value.theory);
  const practice = normalizeLessonPartProgress(value.practice);

  if (!theory || !practice) {
    return null;
  }

  const bestAccuracy =
    typeof value.bestAccuracy === 'number' &&
    Number.isFinite(value.bestAccuracy)
      ? clampAccuracy(value.bestAccuracy)
      : clampAccuracy(Math.max(theory.accuracy, practice.accuracy));
  const bestXp =
    typeof value.bestXp === 'number' && Number.isFinite(value.bestXp)
      ? clampXp(value.bestXp)
      : (theory.bestXp ?? 0) + (practice.bestXp ?? 0);

  return {
    theory,
    practice,
    completed:
      value.completed === true || (theory.completed && practice.completed),
    stars: clampStars(
      typeof value.stars === 'number' && Number.isFinite(value.stars)
        ? value.stars
        : calculateStars(bestAccuracy)
    ),
    bestAccuracy,
    bestXp,
    completedAt:
      typeof value.completedAt === 'string' ? value.completedAt : undefined
  };
}

function getEffectiveLessonPartProgress(
  lesson: Lesson,
  mode: LessonMode,
  part: LessonPartProgress | undefined
): LessonPartProgress {
  const questionCount = getQuestionsByCategory(
    lesson,
    questionCategoryForMode(mode)
  ).length;

  if (questionCount === 0) {
    return {
      completed: true,
      accuracy: 100,
      bestXp: part?.bestXp ?? 0
    };
  }

  return cloneLessonPartProgress(part);
}

function calculateCombinedLessonAccuracy(
  lesson: Lesson,
  theory: LessonPartProgress,
  practice: LessonPartProgress
) {
  const theoryCount = getQuestionsByCategory(lesson, 'theory').length;
  const practiceCount = getQuestionsByCategory(lesson, 'calculation').length;
  const totalQuestions = theoryCount + practiceCount;

  if (totalQuestions === 0) {
    return 100;
  }

  const weightedAccuracy =
    (theory.accuracy * theoryCount + practice.accuracy * practiceCount) /
    totalQuestions;

  return clampAccuracy(weightedAccuracy);
}

export function buildLessonProgressEntry(
  lesson: Lesson,
  theoryInput: LessonPartProgress | undefined,
  practiceInput: LessonPartProgress | undefined,
  bestXp: number,
  completedAt?: string
): LessonProgress {
  const theory = getEffectiveLessonPartProgress(lesson, 'theory', theoryInput);
  const practice = getEffectiveLessonPartProgress(
    lesson,
    'practice',
    practiceInput
  );
  const bestAccuracy = calculateCombinedLessonAccuracy(
    lesson,
    theory,
    practice
  );

  return {
    theory,
    practice,
    completed: theory.completed && practice.completed,
    stars: calculateStars(bestAccuracy),
    bestAccuracy,
    bestXp: clampXp(bestXp),
    completedAt
  };
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

  if (version < 4) {
    nextState = {
      ...nextState,
      lessonProgress: isRecord(nextState.lessonProgress)
        ? Object.fromEntries(
            Object.entries(nextState.lessonProgress)
              .map(([lessonId, progress]) => [
                lessonId,
                migrateLegacyLessonProgress(progress)
              ])
              .filter(
                (entry): entry is [string, LessonProgress] => entry[1] !== null
              )
          )
        : {}
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
        {
          ...progress,
          theory: cloneLessonPartProgress(progress.theory),
          practice: cloneLessonPartProgress(progress.practice)
        }
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
        completeLessonPart: (
          lesson,
          mode,
          accuracy,
          earnedXp,
          nextLessonId,
          date = new Date()
        ) =>
          set((state) => {
            lastMutationSource = 'completeLessonPart';
            const current = state.lessonProgress[lesson.id];
            const theoryCurrent = getEffectiveLessonPartProgress(
              lesson,
              'theory',
              current?.theory
            );
            const practiceCurrent = getEffectiveLessonPartProgress(
              lesson,
              'practice',
              current?.practice
            );
            const currentEntry = buildLessonProgressEntry(
              lesson,
              theoryCurrent,
              practiceCurrent,
              current?.bestXp ?? 0,
              current?.completedAt
            );
            const partKey = mode;
            const currentPart =
              partKey === 'theory' ? theoryCurrent : practiceCurrent;
            const nextPart: LessonPartProgress = {
              completed: true,
              accuracy: Math.max(currentPart.accuracy, clampAccuracy(accuracy)),
              bestXp: Math.max(currentPart.bestXp ?? 0, clampXp(earnedXp))
            };
            const nextTheory = partKey === 'theory' ? nextPart : theoryCurrent;
            const nextPractice =
              partKey === 'practice' ? nextPart : practiceCurrent;
            const nextBestXp = Math.max(
              current?.bestXp ?? 0,
              (nextTheory.bestXp ?? 0) + (nextPractice.bestXp ?? 0)
            );
            const completedAt = currentEntry.completed
              ? currentEntry.completedAt
              : undefined;
            const nextEntry = buildLessonProgressEntry(
              lesson,
              nextTheory,
              nextPractice,
              nextBestXp,
              completedAt
            );
            const didCompleteLesson =
              !currentEntry.completed && nextEntry.completed;
            const finalizedEntry = {
              ...nextEntry,
              completedAt: didCompleteLesson
                ? date.toISOString()
                : nextEntry.completedAt
            };
            const xpDelta = finalizedEntry.bestXp - (current?.bestXp ?? 0);
            const studyDate = toDateKey(date);
            let streakCurrent = state.streakCurrent;

            if (state.lastStudyDate !== studyDate) {
              if (state.lastStudyDate === yesterday(studyDate)) {
                streakCurrent += 1;
              } else {
                streakCurrent = 1;
              }
            }

            const streakLongest = Math.max(state.streakLongest, streakCurrent);
            const lastStudyDate = studyDate;

            return {
              ...state,
              totalXp: state.totalXp + xpDelta,
              streakCurrent,
              streakLongest,
              lastStudyDate,
              lastMutationAt: date.toISOString(),
              lessonProgress: {
                ...state.lessonProgress,
                [lesson.id]: finalizedEntry
              },
              unlockedLessonIds:
                didCompleteLesson && nextLessonId
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
