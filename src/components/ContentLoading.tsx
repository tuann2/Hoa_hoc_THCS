export function ContentLoading({
  label = 'Đang tải nội dung…'
}: {
  label?: string;
}) {
  return (
    <section
      className="rounded-[2rem] bg-white/90 p-6 shadow-card"
      role="status"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sea/70">
        Hoá học THCS
      </p>
      <h2 className="mt-2 font-heading text-2xl font-bold text-ink">{label}</h2>
      <p className="mt-3 text-ink/65">
        Nội dung sẽ xuất hiện ngay khi tải xong.
      </p>
    </section>
  );
}
