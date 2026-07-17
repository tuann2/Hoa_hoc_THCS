export function ContentLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="rounded-[2rem] bg-white/90 p-6 shadow-card"
      role="alert"
    >
      <h2 className="font-heading text-2xl font-bold text-ink">
        Không tải được nội dung
      </h2>
      <p className="mt-3 text-ink/70">
        Kiểm tra kết nối rồi thử lại. Tiến độ cục bộ vẫn được giữ nguyên.
      </p>
      <button
        className="mt-5 rounded-full bg-sea px-5 py-3 font-semibold text-white"
        onClick={onRetry}
        type="button"
      >
        Thử tải lại
      </button>
    </section>
  );
}
