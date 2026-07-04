import { create } from 'zustand';
import {
  persist,
  type PersistStorage,
  type StorageValue
} from 'zustand/middleware';
import type { Lesson, UnitContent } from '../types/content';
import { calculateStars } from '../lib/chemistry';

export const PROGRESS_STORAGE_KEY = 'hhthcs-progress';
const PROGRESS_VERSION = 1;

export interface LessonProgress {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestAccuracy: number;
  bestXp: number;
  completedAt?: string;
}

export interface ProgressState {
  totalXp: number;
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate: string | null;
  lessonProgress: Record<string, LessonProgress>;
  unlockedLessonIds: string[];
  completeLesson: (
    lesson: Lesson,
    nextLessonId: string | null,
    accuracy: number,
    earnedXp: number,
    date?: Date
  ) => void;
  reset: () => void;
}

const EMPTY_PROGRESS = {
  totalXp: 0,
  streakCurrent: 0,
  streakLongest: 0,
  lastStudyDate: null,
  lessonProgress: {},
  unlockedLessonIds: []
};

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

function createSafeStorage(): PersistStorage<ProgressState> {
  return {
    getItem: (name: string): StorageValue<ProgressState> | null => {
      if (typeof window === 'undefined') {
        return null;
      }

      const raw = window.localStorage.getItem(name);

      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as StorageValue<ProgressState>;
      } catch {
        window.localStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<ProgressState>) => {
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

export const createInitialProgressState = (units: UnitContent[]) => ({
  ...EMPTY_PROGRESS,
  unlockedLessonIds: deriveUnlockedLessons(units)
});

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
        reset: () => set(createInitialProgressState(units))
      }),
      {
        name: PROGRESS_STORAGE_KEY,
        version: PROGRESS_VERSION,
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
}
