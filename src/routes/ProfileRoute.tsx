import {
  getAllUnits,
  getAvailableLessonCount,
  getUnitsByPart,
  partLabels
} from '../lib/content';
import { getProgressStore } from '../store/progress';
import type { PartId } from '../types/content';

type LessonProgressMap = Record<string, { completed: boolean; stars: number }>;

function partCompletion(part: PartId, lessonProgress: LessonProgressMap) {
  const units = getUnitsByPart(part);
  const total = getAvailableLessonCount(units);
  const completed = units
    .flatMap((unit) => unit.lessons)
    .filter(
      (lesson) =>
        lesson.status === 'available' && lessonProgress[lesson.id]?.completed
    ).length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100)
  };
}

export function ProfileRoute() {
  const units = getAllUnits();
  const progressStore = getProgressStore(units);
  const totalXp = progressStore((state) => state.totalXp);
  const streakCurrent = progressStore((state) => state.streakCurrent);
  const streakLongest = progressStore((state) => state.streakLongest);
  const lessonProgress = progressStore((state) => state.lessonProgress);
  const inorganic = partCompletion('inorganic', lessonProgress);
  const organic = partCompletion('organic', lessonProgress);
  const masteredLessons = Object.values(lessonProgress).filter(
    (lesson) => lesson.stars === 3
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sea/70">
          Hồ sơ học tập
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Tiến độ của em
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-mist p-4">
            <p className="text-sm text-ink/65">Tổng XP</p>
            <p className="mt-2 text-3xl font-bold text-sea">{totalXp}</p>
          </article>
          <article className="rounded-3xl bg-mist p-4">
            <p className="text-sm text-ink/65">Streak hiện tại</p>
            <p className="mt-2 text-3xl font-bold text-lime">
              {streakCurrent} ngày
            </p>
          </article>
          <article className="rounded-3xl bg-mist p-4">
            <p className="text-sm text-ink/65">Bài đạt 3 sao</p>
            <p className="mt-2 text-3xl font-bold text-ember">
              {masteredLessons}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h3 className="font-heading text-2xl font-bold text-ink">
          Tổng quan theo phần
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ['inorganic', inorganic] as const,
            ['organic', organic] as const
          ].map(([part, stats]) => (
            <article
              key={part}
              className="rounded-3xl border border-ink/10 p-4"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                {partLabels[part]}
              </p>
              <p className="mt-3 text-3xl font-bold text-ink">
                {stats.percent}%
              </p>
              <p className="mt-2 text-sm text-ink/65">
                {stats.completed}/{stats.total} bài khả dụng đã hoàn thành
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-sm leading-6 text-ink/65">
          Streak dài nhất:{' '}
          <span className="font-semibold text-ink">{streakLongest} ngày</span>.
          Dữ liệu được lưu cục bộ trên trình duyệt bằng khóa{' '}
          <code className="rounded bg-mist px-2 py-1">hhthcs-progress</code>.
        </p>
      </section>
    </div>
  );
}
