import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LessonPlayer } from '../components/LessonPlayer';
import { ContentLoadError } from '../components/ContentLoadError';
import { ContentLoading } from '../components/ContentLoading';
import {
  findLesson as findLessonSummary,
  findUnit as findUnitSummary,
  getAllUnits as getUnitCatalog
} from '../lib/content';
import { loadUnit } from '../lib/contentLoader';
import { getProgressStore } from '../store/progress';
import type { Lesson, UnitContent } from '../types/content';

interface LessonRouteProps {
  mode: 'theory' | 'practice';
}

export function LessonRoute({ mode }: LessonRouteProps) {
  const { lessonId = '', unitId = '' } = useParams();
  const units = useMemo(() => getUnitCatalog(), []);
  const unit = findUnitSummary(unitId);
  const lesson = findLessonSummary(unitId, lessonId);
  const [content, setContent] = useState<UnitContent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const unlockedLessonIds = getProgressStore(units)(
    (state) => state.unlockedLessonIds
  );

  useEffect(() => {
    if (
      !unit ||
      !lesson ||
      unit.status !== 'available' ||
      lesson.status !== 'available'
    ) {
      return;
    }

    let active = true;
    setContent(null);
    setLoadError(false);
    void loadUnit(unit.id)
      .then((loaded) => {
        if (active) setContent(loaded);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [lesson, unit]);

  if (!unit || !lesson) {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h2 className="font-heading text-2xl font-bold text-ink">
          Không tìm thấy bài học
        </h2>
        <Link
          className="mt-5 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/"
        >
          Quay về lộ trình
        </Link>
      </section>
    );
  }

  if (unit.status !== 'available' || lesson.status !== 'available') {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h2 className="font-heading text-2xl font-bold text-ink">
          Bài này chưa mở
        </h2>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Nội dung của bài vẫn đang được biên soạn theo chuẩn HSG.
        </p>
        <Link
          className="mt-5 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/"
        >
          Quay về lộ trình
        </Link>
      </section>
    );
  }

  if (!unlockedLessonIds.includes(lesson.id)) {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h2 className="font-heading text-2xl font-bold text-ink">
          Bài này đang bị khoá
        </h2>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Em cần hoàn thành tuần tự bài trước trong cùng chuyên đề để mở khoá.
        </p>
        <Link
          className="mt-5 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/"
        >
          Quay về lộ trình
        </Link>
      </section>
    );
  }

  if (loadError) {
    return <ContentLoadError onRetry={() => window.location.reload()} />;
  }

  if (!content) {
    return <ContentLoading label="Đang tải bài học…" />;
  }

  const fullLesson: Lesson | undefined = content.lessons.find(
    (entry) => entry.id === lesson.id
  );

  if (!fullLesson) {
    return <ContentLoadError onRetry={() => window.location.reload()} />;
  }

  return (
    <LessonPlayer
      key={`${unit.id}:${lesson.id}:${mode}`}
      lesson={fullLesson}
      mode={mode}
      unit={content}
      units={units}
    />
  );
}
