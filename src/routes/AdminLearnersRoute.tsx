import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminLearners,
  formatStudyDuration,
  isCurrentAdminRequest,
  type AdminLearnerSummary
} from '../lib/adminReports';
import { getAuthStore } from '../store/auth';

export function AdminLearnersRoute() {
  const authStore = getAuthStore();
  const user = authStore((state) => state.user);
  const isAdmin = authStore((state) => state.isAdmin);
  const authGeneration = authStore((state) => state.authGeneration);
  const [learners, setLearners] = useState<AdminLearnerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id || !isAdmin) {
      setLearners([]);
      setIsLoading(false);
      return;
    }

    const requestUserId = user.id;
    const requestGeneration = authGeneration;
    let active = true;
    setIsLoading(true);
    setError(null);

    void fetchAdminLearners()
      .then((nextLearners) => {
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
          setLearners(nextLearners);
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
          setError('Không tải được báo cáo học viên. Hãy thử lại sau.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authGeneration, isAdmin, user?.id]);

  const visibleLearners = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('vi');
    return normalized
      ? learners.filter((learner) =>
          learner.displayName.toLocaleLowerCase('vi').includes(normalized)
        )
      : learners;
  }, [learners, search]);

  if (!user || !isAdmin) {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
          Báo cáo quản trị
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Bạn không có quyền xem trang này
        </h2>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Quyền xem dữ liệu học viên được kiểm tra lại ở Supabase, không chỉ ở
          giao diện.
        </p>
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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
          Báo cáo quản trị · chỉ đọc
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold text-ink">
              Danh sách học viên
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
              Số liệu tiến độ và tên hiển thị do client học viên gửi lên; chỉ
              dùng để hỗ trợ học tập, không dùng chấm điểm, kỷ luật hay xác minh
              danh tính.
            </p>
          </div>
          <Link
            className="inline-flex rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/75 transition hover:border-sea hover:text-sea"
            to="/profile"
          >
            Về hồ sơ
          </Link>
        </div>
        <label className="mt-6 block max-w-md">
          <span className="text-sm font-semibold text-ink/75">
            Tìm học viên
          </span>
          <input
            className="mt-2 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-sea"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Lọc theo tên hiển thị"
            type="search"
            value={search}
          />
        </label>
      </section>

      {isLoading ? (
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          Đang tải danh sách học viên…
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[2rem] bg-ember/10 p-6 text-ink shadow-card">
          {error}
        </section>
      ) : null}
      {!isLoading && !error && visibleLearners.length === 0 ? (
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          {learners.length === 0
            ? 'Chưa có học viên nào để hiển thị.'
            : 'Không có học viên khớp với từ khoá tìm kiếm.'}
        </section>
      ) : null}
      {!isLoading && !error && visibleLearners.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {visibleLearners.map((learner) => (
            <article
              key={learner.userId}
              className="rounded-[2rem] bg-white/90 p-5 shadow-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-ink">
                    {learner.displayName}
                  </h3>
                  <p className="mt-2 text-sm text-ink/65">
                    {learner.completedLessons}/{learner.availableLessons} bài ·{' '}
                    {learner.completionPercent}% hoàn thành
                  </p>
                </div>
                <Link
                  className="inline-flex rounded-full bg-sea px-4 py-2 text-sm font-semibold text-white"
                  to={`/admin/learners/${encodeURIComponent(learner.userId)}`}
                >
                  Xem chi tiết
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <p className="rounded-2xl bg-mist p-3 text-sm text-ink/75">
                  Hôm nay (GMT+7):{' '}
                  <span className="font-semibold text-ink">
                    {formatStudyDuration(learner.studySecondsToday)}
                  </span>
                </p>
                <p className="rounded-2xl bg-mist p-3 text-sm text-ink/75">
                  7 ngày gần nhất:{' '}
                  <span className="font-semibold text-ink">
                    {formatStudyDuration(learner.studySecondsLast7Days)}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
