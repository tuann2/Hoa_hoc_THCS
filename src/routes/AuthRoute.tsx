import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthStore } from '../store/auth';

type AuthMode = 'sign-in' | 'sign-up' | 'reset';

const modeLabels: Record<AuthMode, string> = {
  'sign-in': 'Đăng nhập',
  'sign-up': 'Tạo tài khoản',
  reset: 'Quên mật khẩu'
};

export function AuthRoute() {
  const navigate = useNavigate();
  const authStore = getAuthStore();
  const isConfigured = authStore((state) => state.isConfigured);
  const isLoading = authStore((state) => state.isLoading);
  const isPasswordRecovery = authStore((state) => state.isPasswordRecovery);
  const session = authStore((state) => state.session);
  const signIn = authStore((state) => state.signIn);
  const signUp = authStore((state) => state.signUp);
  const resetPassword = authStore((state) => state.resetPassword);
  const updatePassword = authStore((state) => state.updatePassword);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    if (isPasswordRecovery) {
      const result = await updatePassword(password);

      if (result.error) {
        setError(result.error);
        return;
      }

      setFeedback(result.message ?? 'Mật khẩu mới đã được lưu.');
      navigate('/profile');
      return;
    }

    if (mode === 'sign-up') {
      const result = await signUp(email, password, displayName);

      if (result.error) {
        setError(result.error);
        return;
      }

      setFeedback(result.message ?? 'Tạo tài khoản thành công.');

      if (!result.requiresEmailConfirmation) {
        navigate('/profile');
      }

      return;
    }

    if (mode === 'reset') {
      const result = await resetPassword(email);

      if (result.error) {
        setError(result.error);
        return;
      }

      setFeedback(result.message ?? 'Đã gửi email đặt lại mật khẩu.');
      return;
    }

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFeedback(result.message ?? 'Đăng nhập thành công.');
    navigate('/profile');
  }

  if (session && !isPasswordRecovery) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sea/70">
          Tài khoản
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Em đã đăng nhập rồi
        </h2>
        <p className="mt-4 text-sm leading-7 text-ink/70">
          Tiến độ học đang được gắn với tài khoản hiện tại. Em có thể quay về hồ
          sơ để xem trạng thái đồng bộ.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/profile"
        >
          Mở hồ sơ
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] bg-ink p-6 text-white shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
          Đồng bộ tiến độ
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold">
          Học trên nhiều thiết bị mà không mất XP
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/80">
          Tài khoản giúp lưu sao, streak, XP và bài đã mở khoá lên Supabase.
          Nếu chưa muốn đăng nhập, em vẫn học được như cũ với bộ nhớ cục bộ trên
          trình duyệt.
        </p>
        <div className="mt-6 space-y-3 rounded-3xl bg-white/10 p-4 text-sm leading-6 text-white/80">
          <p>Tên hiển thị chỉ dùng trong ứng dụng và được giới hạn 50 ký tự.</p>
          <p>Email dùng để xác nhận tài khoản và gửi liên kết đặt lại mật khẩu.</p>
          <p>App không cần server riêng; nếu Supabase chưa cấu hình thì vẫn chạy offline-only.</p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        {!isPasswordRecovery ? (
          <div className="flex flex-wrap gap-2">
            {(['sign-in', 'sign-up', 'reset'] as AuthMode[]).map((entry) => (
              <button
                key={entry}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === entry ? 'bg-sea text-white' : 'bg-mist text-ink/70'
                }`}
                onClick={() => {
                  setMode(entry);
                  setError(null);
                  setFeedback(null);
                }}
                type="button"
              >
                {modeLabels[entry]}
              </button>
            ))}
          </div>
        ) : null}

        <h3 className="mt-6 font-heading text-2xl font-bold text-ink">
          {isPasswordRecovery ? 'Nhập mật khẩu mới' : modeLabels[mode]}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          {isPasswordRecovery
            ? 'Liên kết trong email đã mở phiên khôi phục tạm thời. Em hãy nhập mật khẩu mới để tiếp tục học.'
            : isConfigured
              ? 'Biểu mẫu này hoạt động với Supabase Auth và lưu tiến độ theo từng tài khoản.'
              : 'Supabase chưa có env nên phần đăng nhập đang ở chế độ chỉ đọc. Em vẫn học bình thường ở chế độ local.'}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {mode === 'sign-up' && !isPasswordRecovery ? (
            <label className="block">
              <span className="text-sm font-semibold text-ink">Tên hiển thị</span>
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 outline-none transition focus:border-sea"
                disabled={!isConfigured || isLoading}
                maxLength={50}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                type="text"
                value={displayName}
              />
            </label>
          ) : null}

          {!isPasswordRecovery ? (
            <label className="block">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 outline-none transition focus:border-sea"
                disabled={!isConfigured || isLoading}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
          ) : null}

          {mode !== 'reset' || isPasswordRecovery ? (
            <label className="block">
              <span className="text-sm font-semibold text-ink">Mật khẩu</span>
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 outline-none transition focus:border-sea"
                disabled={!isConfigured || isLoading}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <span className="mt-2 block text-xs text-ink/55">
                {isPasswordRecovery
                  ? 'Mật khẩu mới cần có ít nhất 8 ký tự.'
                  : 'Dùng ít nhất 8 ký tự.'}
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {feedback ? (
            <p className="rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-sea">
              {feedback}
            </p>
          ) : null}

          <button
            className="w-full rounded-full bg-sea px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-sea/50"
            disabled={!isConfigured || isLoading}
            type="submit"
          >
            {isLoading
              ? 'Đang xử lý...'
              : isPasswordRecovery
                ? 'Lưu mật khẩu mới'
                : modeLabels[mode]}
          </button>
        </form>
      </section>
    </div>
  );
}
