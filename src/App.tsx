import { NavLink, Route, Routes } from 'react-router-dom';
import { HomeRoute } from './routes/HomeRoute';
import { LessonRoute } from './routes/LessonRoute';
import { ProfileRoute } from './routes/ProfileRoute';

const navItems = [
  { to: '/', label: 'Lộ trình' },
  { to: '/profile', label: 'Hồ sơ' }
];

export default function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,163,74,0.18),_transparent_32%),linear-gradient(180deg,_#f7fbf9_0%,_#eef5f3_52%,_#f4e6bf_100%)] font-body text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-10">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sea/70">
              Hoá học THCS
            </p>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">
              Ôn luyện HSG theo lộ trình gọn, học được trên điện thoại
            </h1>
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
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/learn/:unitId/:lessonId" element={<LessonRoute />} />
            <Route path="/profile" element={<ProfileRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
