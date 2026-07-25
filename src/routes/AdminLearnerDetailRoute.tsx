import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchAdminLearnerDetail,
  formatStudyDuration,
  getRecentDateRange,
  isCurrentAdminRequest,
  validateDateRange,
  type AdminLearnerDetail,
  type DateRange
} from '../lib/adminReports';
import { getAuthStore } from '../store/auth';

function formatTimestamp(value: string | null) {
  return value
    ? new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Chưa có dữ liệu';
}

export function AdminLearnerDetailRoute() {
  const { userId = '' } = useParams();
  const authStore = getAuthStore();
  const user = authStore((state) => state.user);
  const isAdmin = authStore((state) => state.isAdmin);
  const authGeneration = authStore((state) => state.authGeneration);
  const [range, setRange] = useState<DateRange>(() => getRecentDateRange(7));
  const [fromInput, setFromInput] = useState(range.from);
  const [toInput, setToInput] = useState(range.to);
  const [detail, setDetail] = useState<AdminLearnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !isAdmin || !userId) {
      setDetail(null);
      setIsLoading(false);
      return;
    }

    const requestUserId = user.id;
    const requestGeneration = authGeneration;
    let active = true;
    setIsLoading(true);
    setError(null);

    void fetchAdminLearnerDetail(userId, range)
      .then((nextDetail) => {
        const current = getAuthStore().getState();
        if (
          active &&
          isCurrentAdminRequest(
            requestGeneration,
            requestUserId,
            current.authGeneration,
            current.user?.id ?? null,
            current.isAdmin
          )
        ) {
          setDetail(nextDetail);
          setIsLoading(false);
        }
      })
      .catch(() => {
        const current = getAuthStore().getState();
        if (
          active &&
          isCurrentAdminRequest(
            requestGeneration,
            requestUserId,
            current.authGeneration,
            current.user?.id ?? null,
            current.isAdmin
          )
        ) {
          setDetail(null);
          setError('Không tải được báo cáo chi tiết. Hãy thử lại sau.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authGeneration, isAdmin, range, user?.id, userId]);

  function applyRange(nextRange: DateRange) {
    const nextError = validateDateRange(nextRange);
    setRangeError(nextError);
    if (!nextError) {
      setRange(nextRange);
    }
  }

  if (!user || !isAdmin) {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h2 className="font-heading text-3xl font-bold text-ink">
          Bạn không có quyền xem trang này
        </h2>
        <Link
          className="mt-5 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/profile"
        >
          Về hồ sơ
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <Link
          className="text-sm font-semibold text-sea hover:text-ink"
          to="/admin/learners"
        >
          ← Danh sách học viên
        </Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
          Báo cáo học viên · chỉ đọc
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          {detail?.displayName ?? 'Chi tiết học viên'}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
          Tên hiển thị và các chỉ số tiến độ là dữ liệu client tự khai. Chúng
          không phải danh tính hay thành tích được máy chủ xác thực.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <h3 className="font-heading text-2xl font-bold text-ink">
          Thời gian học online (GMT+7)
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          Chỉ là ước lượng heartbeat sau rollout khi app online/foreground;
          không có dữ liệu hồi tố hoặc offline và không chứng minh người học tập
          trung liên tục.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink transition hover:bg-sea hover:text-white"
            onClick={() => {
              const next = getRecentDateRange(7);
              setFromInput(next.from);
              setToInput(next.to);
              applyRange(next);
            }}
            type="button"
          >
            7 ngày
          </button>
          <button
            className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink transition hover:bg-sea hover:text-white"
            onClick={() => {
              const next = getRecentDateRange(30);
              setFromInput(next.from);
              setToInput(next.to);
              applyRange(next);
            }}
            type="button"
          >
            30 ngày
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label>
            <span className="text-sm font-semibold text-ink/75">Từ ngày</span>
            <input
              className="mt-2 w-full rounded-2xl border border-ink/15 px-3 py-2"
              onChange={(event) => setFromInput(event.target.value)}
              type="date"
              value={fromInput}
            />
          </label>
          <label>
            <span className="text-sm font-semibold text-ink/75">Đến ngày</span>
            <input
              className="mt-2 w-full rounded-2xl border border-ink/15 px-3 py-2"
              onChange={(event) => setToInput(event.target.value)}
              type="date"
              value={toInput}
            />
          </label>
          <button
            className="rounded-full bg-sea px-5 py-3 font-semibold text-white"
            onClick={() => applyRange({ from: fromInput, to: toInput })}
            type="button"
          >
            Áp dụng
          </button>
        </div>
        {rangeError ? (
          <p className="mt-3 rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ink">
            {rangeError}
          </p>
        ) : null}
      </section>

      {isLoading ? (
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          Đang tải báo cáo chi tiết…
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[2rem] bg-ember/10 p-6 text-ink shadow-card">
          {error}
        </section>
      ) : null}
      {!isLoading && !error && !detail ? (
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          Không tìm thấy học viên hoặc quyền xem đã bị thu hồi.
        </section>
      ) : null}
      {detail ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-3xl bg-white/90 p-4 shadow-card">
              <p className="text-sm text-ink/65">Tổng XP</p>
              <p className="mt-2 text-3xl font-bold text-sea">
                {detail.totalXp}
              </p>
            </article>
            <article className="rounded-3xl bg-white/90 p-4 shadow-card">
              <p className="text-sm text-ink/65">Hoàn thành</p>
              <p className="mt-2 text-3xl font-bold text-lime">
                {detail.completionPercent}%
              </p>
              <p className="mt-1 text-sm text-ink/65">
                {detail.completedLessons}/{detail.availableLessons} bài
              </p>
            </article>
            <article className="rounded-3xl bg-white/90 p-4 shadow-card">
              <p className="text-sm text-ink/65">Bài đạt 3 sao</p>
              <p className="mt-2 text-3xl font-bold text-ember">
                {detail.masteredLessons}
              </p>
            </article>
            <article className="rounded-3xl bg-white/90 p-4 shadow-card">
              <p className="text-sm text-ink/65">Câu cần ôn</p>
              <p className="mt-2 text-3xl font-bold text-ink">
                {detail.pendingReviewCount}
              </p>
            </article>
          </section>

          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
            <p className="text-lg font-bold text-ink">
              Tổng trong khoảng:{' '}
              {formatStudyDuration(
                detail.dailyStudyTime.reduce(
                  (sum, day) => sum + day.activeSeconds,
                  0
                )
              )}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detail.dailyStudyTime.map((day) => (
                <article key={day.date} className="rounded-2xl bg-mist p-3">
                  <p className="text-sm text-ink/65">{day.date}</p>
                  <p className="mt-1 font-semibold text-ink">
                    {formatStudyDuration(day.activeSeconds)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
            <h3 className="font-heading text-2xl font-bold text-ink">
              Tiến độ và chất lượng
            </h3>
            <p className="mt-3 text-sm text-ink/65">
              Streak hiện tại: {detail.streakCurrent} ngày · ngày học lesson gần
              nhất (UTC): {detail.lastStudyDate ?? 'Chưa có'} · đồng bộ tiến độ:{' '}
              {formatTimestamp(detail.lastSyncedAt)}.
            </p>
            <p className="mt-2 text-sm text-ink/65">
              Accuracy tốt nhất trung bình:{' '}
              {detail.accuracy.averageBestAccuracy}%{' · '}cao nhất:{' '}
              {detail.accuracy.bestAccuracy}% ({detail.accuracy.measuredLessons}{' '}
              bài có dữ liệu).
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {detail.partBreakdown.map((part) => (
                <article
                  key={part.part}
                  className="rounded-2xl border border-ink/10 p-4"
                >
                  <p className="font-semibold text-ink">{part.title}</p>
                  <p className="mt-2 text-sm text-ink/65">
                    {part.completedLessons}/{part.availableLessons} bài ·{' '}
                    {part.completionPercent}%
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
            <h3 className="font-heading text-2xl font-bold text-ink">
              Bài đã hoàn thành hoặc gần hoàn thành
            </h3>
            {detail.lessonStatus.length === 0 ? (
              <p className="mt-3 text-ink/65">
                Chưa có bài nào trong nhóm này.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-ink/75">
                {detail.lessonStatus.map((lesson) => (
                  <li
                    key={lesson.lessonId}
                    className="rounded-2xl bg-mist px-4 py-3"
                  >
                    {lesson.title} ·{' '}
                    {lesson.status === 'completed'
                      ? 'Đã hoàn thành'
                      : 'Gần hoàn thành'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
            <h3 className="font-heading text-2xl font-bold text-ink">
              Lịch sử thi gần đây
            </h3>
            {detail.recentExamHistory.length === 0 ? (
              <p className="mt-3 text-ink/65">Chưa có lần thi nào được lưu.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-ink/75">
                {detail.recentExamHistory.map((exam) => (
                  <li key={exam.id} className="rounded-2xl bg-mist px-4 py-3">
                    {exam.correctCount}/{exam.totalQuestions} câu đúng ·{' '}
                    {exam.accuracy}% · {formatTimestamp(exam.finishedAt)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
