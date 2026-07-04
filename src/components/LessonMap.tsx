import { Link } from 'react-router-dom';
import type { UnitContent } from '../types/content';

interface LessonMapProps {
  units: UnitContent[];
  unlockedLessonIds: string[];
  lessonStars: Record<string, number>;
}

function LessonBadge({ stars }: { stars?: number }) {
  if (!stars) {
    return <span className="text-xs font-semibold text-ink/45">0★</span>;
  }

  return <span className="text-xs font-semibold text-amber-600">{stars}★</span>;
}

export function LessonMap({
  units,
  unlockedLessonIds,
  lessonStars
}: LessonMapProps) {
  return (
    <div className="space-y-5">
      {units.map((unit) => (
        <section
          key={unit.id}
          className="rounded-[2rem] border border-white/50 bg-white/85 p-5 shadow-card backdrop-blur"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sea/70">
                {unit.code}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-ink">
                {unit.title}
              </h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                unit.status === 'available'
                  ? 'bg-lime/15 text-lime'
                  : 'bg-sand text-ember'
              }`}
            >
              {unit.status === 'available' ? 'Đang mở' : 'Sắp ra mắt'}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-ink/72">
            {unit.description}
          </p>

          <div className="mt-5 space-y-3">
            {unit.lessons.map((lesson, lessonIndex) => {
              const unlocked = unlockedLessonIds.includes(lesson.id);
              const available =
                unit.status === 'available' && lesson.status === 'available';
              const sharedClassName =
                'flex items-center justify-between gap-4 rounded-3xl border px-4 py-4 transition';

              return available && unlocked ? (
                <Link
                  key={lesson.id}
                  className={`${sharedClassName} border-sea/15 bg-mist hover:border-sea hover:bg-white`}
                  to={`/learn/${unit.id}/${lesson.id}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sea font-semibold text-white">
                      {lessonIndex + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{lesson.title}</p>
                      <p className="text-sm text-ink/55">{lesson.summary}</p>
                    </div>
                  </div>
                  <LessonBadge stars={lessonStars[lesson.id]} />
                </Link>
              ) : (
                <div
                  key={lesson.id}
                  className={`${sharedClassName} ${
                    available
                      ? 'border-ink/10 bg-white/70 text-ink/45'
                      : 'border-dashed border-ink/10 bg-sand/45 text-ink/55'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold ${
                        available
                          ? 'bg-ink/10 text-ink/60'
                          : 'bg-ember/15 text-ember'
                      }`}
                    >
                      {available ? '🔒' : lessonIndex + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{lesson.title}</p>
                      <p className="text-sm">
                        {available
                          ? 'Hoàn thành bài trước để mở khoá.'
                          : 'Nội dung đang biên soạn.'}
                      </p>
                    </div>
                  </div>
                  <LessonBadge stars={lessonStars[lesson.id]} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
