interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const width = total === 0 ? 0 : Math.min(100, (current / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink/65">
        <span>Tiến độ bài học</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/70">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-lime to-sea transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
