import { Link } from 'react-router-dom';
import {
  getAllUnits,
  getAvailableLessonCount,
  getUnitsByPart,
  partLabels
} from '../lib/content';
import { getAuthStore } from '../store/auth';
import {
  getProgressStore,
  isWrongQuestionPending,
  type ExamAttempt,
  type LessonProgress
} from '../store/progress';
import type { PartId } from '../types/content';

type LessonProgressMap = Record<string, LessonProgress>;

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

function formatExamScope(attempt: ExamAttempt) {
  const units = getAllUnits();

  if (attempt.scope.mode === 'all') {
    return 'Toàn bộ chương trình';
  }

  if (attempt.scope.mode === 'part') {
    return partLabels[attempt.scope.part ?? 'inorganic'];
  }

  const titles = (attempt.scope.unitIds ?? [])
    .map((unitId) => units.find((unit) => unit.id === unitId)?.title)
    .filter((title): title is string => Boolean(title));

  if (titles.length === 0) {
    return 'Chuyên đề đã chọn';
  }

  if (titles.length <= 2) {
    return titles.join(' · ');
  }

  return `${titles.length} chuyên đề`;
}

function formatExamTimestamp(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function ProfileRoute() {
  const units = getAllUnits();
  const progressStore = getProgressStore(units);
  const authStore = getAuthStore();
  const user = authStore((state) => state.user);
  const displayName = authStore((state) => state.displayName);
  const isConfigured = authStore((state) => state.isConfigured);
  const signOut = authStore((state) => state.signOut);
  const totalXp = progressStore((state) => state.totalXp);
  const streakCurrent = progressStore((state) => state.streakCurrent);
  const streakLongest = progressStore((state) => state.streakLongest);
  const lessonProgress = progressStore((state) => state.lessonProgress);
  const wrongQuestionCount = progressStore(
    (state) =>
      Object.values(state.wrongQuestions).filter(isWrongQuestionPending).length
  );
  const examHistory = progressStore((state) => state.examHistory);
  const inorganic = partCompletion('inorganic', lessonProgress);
  const organic = partCompletion('organic', lessonProgress);
  const masteredLessons = Object.values(lessonProgress).filter(
    (lesson) => lesson.stars === 3
  ).length;
  const accountLabel = displayName ?? user?.email ?? 'Học sinh';
  const recentExams = examHistory.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sea/70">
          Hồ sơ học tập
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          {user ? `Tiến độ của ${accountLabel}` : 'Tiến độ của em'}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="rounded-full bg-mist px-4 py-2 font-semibold text-ink/75">
                {user.email}
              </span>
              <button
                className="rounded-full border border-ink/10 px-4 py-2 font-semibold text-ink/70 transition hover:text-ink"
                onClick={() => {
                  void signOut();
                }}
                type="button"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
              to="/auth"
            >
              {isConfigured
                ? 'Đăng nhập để lưu tiến độ'
                : 'Supabase chưa cấu hình, app đang lưu cục bộ'}
            </Link>
          )}
        </div>

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

        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
              Danh sách cần ôn
            </p>
            <p className="mt-2 text-base text-ink/75">
              {wrongQuestionCount === 0
                ? 'Hiện chưa có câu nào cần ôn lại.'
                : `Em còn ${wrongQuestionCount} câu cần luyện lại ở trang ôn tập.`}
            </p>
          </div>
          <Link
            className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
            to="/review"
          >
            Mở trang ôn lại
          </Link>
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
          {user
            ? ' Dữ liệu đang được đồng bộ giữa localStorage và Supabase.'
            : ' Dữ liệu đang được lưu cục bộ trên trình duyệt bằng khóa '}
          {!user ? (
            <code className="rounded bg-mist px-2 py-1">hhthcs-progress</code>
          ) : null}
        </p>
      </section>

      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
              Lịch sử thi thử
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-ink">
              {recentExams.length === 0
                ? 'Em chưa có lần thi nào'
                : '5 lần thi gần nhất'}
            </h3>
          </div>
          <Link
            className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
            to="/exam"
          >
            Thi thử ngay
          </Link>
        </div>

        {recentExams.length === 0 ? (
          <p className="mt-4 text-base leading-7 text-ink/75">
            Tạo đề từ trang thi thử để lưu lại điểm, phạm vi và thời điểm hoàn
            thành.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {recentExams.map((attempt) => (
              <article
                key={attempt.id}
                className="rounded-3xl border border-ink/10 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                      {formatExamScope(attempt)}
                    </p>
                    <p className="mt-2 text-lg font-bold text-ink">
                      {attempt.correctCount}/{attempt.totalQuestions} câu đúng ·{' '}
                      {attempt.accuracy}%
                    </p>
                  </div>
                  <div className="text-sm text-ink/65">
                    {formatExamTimestamp(attempt.finishedAt)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
