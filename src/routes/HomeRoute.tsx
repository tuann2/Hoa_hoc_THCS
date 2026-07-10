import { useState } from 'react';
import { LessonMap } from '../components/LessonMap';
import { getAllUnits, getUnitsByPart, partLabels } from '../lib/content';
import { getProgressStore } from '../store/progress';
import type { PartId } from '../types/content';

export function HomeRoute() {
  const [activePart, setActivePart] = useState<PartId>('inorganic');
  const [activeMode, setActiveMode] = useState<'theory' | 'practice'>('theory');
  const units = getAllUnits();
  const progressStore = getProgressStore(units);
  const unlockedLessonIds = progressStore((state) => state.unlockedLessonIds);
  const totalXp = progressStore((state) => state.totalXp);
  const streakCurrent = progressStore((state) => state.streakCurrent);
  const lessonProgress = progressStore((state) => state.lessonProgress);
  const partUnits = getUnitsByPart(activePart);
  const lessonStars = Object.fromEntries(
    Object.entries(lessonProgress).map(([lessonId, progress]) => [
      lessonId,
      progress.stars
    ])
  );
  const completedLessons = Object.values(lessonProgress).filter(
    (progress) => progress.completed
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-ink p-6 text-white shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
          Phiên bản MVP
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
          Lộ trình ôn Hoá học THCS kiểu luyện ngày
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78 sm:text-base">
          Chọn một bài đang mở, đọc thẻ lý thuyết ngắn rồi làm quiz theo ba mức:
          cơ bản, vận dụng và HSG. Câu sai sẽ quay lại ở cuối bài để em sửa
          ngay.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-white/10 p-4 backdrop-blur">
            <p className="text-sm text-white/70">Tổng XP</p>
            <p className="mt-2 text-3xl font-bold">{totalXp}</p>
          </article>
          <article className="rounded-3xl bg-white/10 p-4 backdrop-blur">
            <p className="text-sm text-white/70">Streak hiện tại</p>
            <p className="mt-2 text-3xl font-bold">{streakCurrent} ngày</p>
          </article>
          <article className="rounded-3xl bg-white/10 p-4 backdrop-blur">
            <p className="text-sm text-white/70">Bài đã hoàn thành</p>
            <p className="mt-2 text-3xl font-bold">{completedLessons}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-4 shadow-card backdrop-blur">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {(['inorganic', 'organic'] as PartId[]).map((part) => (
              <button
                key={part}
                className={`rounded-full px-5 py-3 font-semibold transition ${
                  activePart === part
                    ? 'bg-sea text-white'
                    : 'bg-mist text-ink/70 hover:text-ink'
                }`}
                onClick={() => setActivePart(part)}
                type="button"
              >
                {partLabels[part]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ['theory', 'Lý thuyết'],
                ['practice', 'Giải bài tập']
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                className={`rounded-full px-5 py-3 font-semibold transition ${
                  activeMode === mode
                    ? 'bg-sea text-white'
                    : 'bg-mist text-ink/70 hover:text-ink'
                }`}
                onClick={() => setActiveMode(mode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/65">
          Hiển thị đầy đủ các unit {partLabels[activePart]}. Những bài chưa biên
          soạn được đánh dấu{' '}
          <span className="font-semibold text-ember">sắp ra mắt</span>.
        </p>
      </section>

      <LessonMap
        lessonStars={lessonStars}
        lessonProgress={lessonProgress}
        mode={activeMode}
        unlockedLessonIds={unlockedLessonIds}
        units={partUnits}
      />
    </div>
  );
}
