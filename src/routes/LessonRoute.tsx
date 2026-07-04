import { Link, useParams } from 'react-router-dom';
import { LessonPlayer } from '../components/LessonPlayer';
import { findLesson, findUnit, getAllUnits } from '../lib/content';
import { getProgressStore } from '../store/progress';

export function LessonRoute() {
  const { lessonId = '', unitId = '' } = useParams();
  const units = getAllUnits();
  const unit = findUnit(unitId);
  const lesson = findLesson(unitId, lessonId);
  const unlockedLessonIds = getProgressStore(units)(
    (state) => state.unlockedLessonIds
  );

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

  return <LessonPlayer lesson={lesson} unit={unit} units={units} />;
}
