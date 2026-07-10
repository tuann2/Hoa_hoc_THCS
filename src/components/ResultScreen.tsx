import { formatPercent } from '../lib/chemistry';

interface ResultScreenProps {
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  earnedXp: number;
  stars: 0 | 1 | 2 | 3;
  onReplay: () => void;
  onNextLesson?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  onBackHome: () => void;
}

const STAR_LABELS = ['Chưa đạt', '1 sao', '2 sao', '3 sao'];

export function ResultScreen({
  accuracy,
  correctCount,
  totalQuestions,
  earnedXp,
  stars,
  onReplay,
  onNextLesson,
  onSecondaryAction,
  secondaryActionLabel,
  onBackHome
}: ResultScreenProps) {
  return (
    <section className="rounded-[2rem] bg-white/95 p-6 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sea/70">
        Hoàn thành bài học
      </p>
      <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
        Em đã xong lượt luyện này
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl bg-mist p-4">
          <p className="text-sm text-ink/65">Độ chính xác lượt đầu</p>
          <p className="mt-2 text-3xl font-bold text-sea">
            {formatPercent(accuracy)}
          </p>
        </article>
        <article className="rounded-3xl bg-mist p-4">
          <p className="text-sm text-ink/65">XP nhận được</p>
          <p className="mt-2 text-3xl font-bold text-lime">+{earnedXp}</p>
        </article>
        <article className="rounded-3xl bg-mist p-4">
          <p className="text-sm text-ink/65">Mức thành thạo</p>
          <p className="mt-2 text-3xl font-bold text-ember">
            {STAR_LABELS[stars]}
          </p>
        </article>
      </div>

      <p className="mt-5 text-base leading-7 text-ink/75">
        Em làm đúng {correctCount}/{totalQuestions} câu ở lượt đầu. Những câu
        sai đã được hỏi lại ở cuối bài để củng cố.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink"
          onClick={onReplay}
          type="button"
        >
          Học lại bài này
        </button>
        {onNextLesson ? (
          <button
            className="rounded-full bg-lime px-5 py-3 font-semibold text-white transition hover:bg-sea"
            onClick={onNextLesson}
            type="button"
          >
            Sang bài tiếp theo
          </button>
        ) : null}
        {onSecondaryAction && secondaryActionLabel ? (
          <button
            className="rounded-full border border-sea/20 px-5 py-3 font-semibold text-sea transition hover:border-sea hover:text-ink"
            onClick={onSecondaryAction}
            type="button"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        <button
          className="rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/70 transition hover:border-sea hover:text-sea"
          onClick={onBackHome}
          type="button"
        >
          Về lộ trình
        </button>
      </div>
    </section>
  );
}
