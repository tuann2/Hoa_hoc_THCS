import { useEffect, useMemo } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { getAllUnits } from './lib/content';
import {
  subscribeProgressPush,
  syncProgressOnSignIn
} from './lib/progressSync';
import { getAuthStore } from './store/auth';
import { getProgressStore, isWrongQuestionPending } from './store/progress';
import { AuthRoute } from './routes/AuthRoute';
import { HomeRoute } from './routes/HomeRoute';
import { ExamRoute } from './routes/ExamRoute';
import { LessonRoute } from './routes/LessonRoute';
import { ProfileRoute } from './routes/ProfileRoute';
import { ReviewRoute } from './routes/ReviewRoute';

export default function App() {
  const units = useMemo(() => getAllUnits(), []);
  const progressStore = getProgressStore(units);
  const authStore = getAuthStore();
  const initialize = authStore((state) => state.initialize);
  const isConfigured = authStore((state) => state.isConfigured);
  const isReady = authStore((state) => state.isReady);
  const user = authStore((state) => state.user);
  const displayName = authStore((state) => state.displayName);
  const reviewCount = progressStore(
    (state) =>
      Object.values(state.wrongQuestions).filter(isWrongQuestionPending).length
  );
  const navItems: Array<{ badge?: number; label: string; to: string }> = [
    { to: '/', label: 'Lộ trình' },
    { to: '/exam', label: 'Thi thử' },
    { to: '/review', label: 'Ôn lại', badge: reviewCount },
    { to: '/profile', label: 'Hồ sơ' }
  ];

  useEffect(() => {
    void initialize();
    subscribeProgressPush(units);
  }, [initialize, units]);

  useEffect(() => {
    if (!isReady || !user?.id) {
      return;
    }

    void syncProgressOnSignIn(units, user.id);
  }, [isReady, units, user?.id]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,163,74,0.18),_transparent_32%),linear-gradient(180deg,_#f7fbf9_0%,_#eef5f3_52%,_#f4e6bf_100%)] font-body text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sea/70">
              Hoá học THCS
            </p>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">
              Ôn luyện HSG theo lộ trình gọn, học được trên điện thoại
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-white/80 px-4 py-2 font-semibold text-ink/70 shadow-card">
                {user
                  ? `Xin chào, ${displayName ?? user.email ?? 'học sinh'}`
                  : isConfigured
                    ? 'Chưa đăng nhập'
                    : 'Chế độ lưu cục bộ'}
              </span>
              <NavLink
                className="rounded-full bg-white/80 px-4 py-2 font-semibold text-sea shadow-card transition hover:text-ink"
                to={user ? '/profile' : '/auth'}
              >
                {user ? 'Mở hồ sơ' : 'Đăng nhập để lưu tiến độ'}
              </NavLink>
            </div>
          </div>
          <nav className="flex rounded-full bg-white/80 p-1 shadow-card backdrop-blur">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-sea text-white'
                      : 'text-ink/70 hover:text-ink'
                  }`
                }
              >
                <span className="inline-flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-ember px-2 py-0.5 text-xs text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/exam" element={<ExamRoute />} />
            <Route
              path="/learn/:unitId/:lessonId/theory"
              element={<LessonRoute mode="theory" />}
            />
            <Route
              path="/learn/:unitId/:lessonId/practice"
              element={<LessonRoute mode="practice" />}
            />
            <Route path="/review" element={<ReviewRoute />} />
            <Route path="/profile" element={<ProfileRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
