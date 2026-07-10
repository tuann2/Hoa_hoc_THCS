import type { TheoryCard as TheoryCardType } from '../types/content';
import { ChemParagraph } from './Chem';

interface TheoryCardProps {
  card: TheoryCardType;
  index: number;
  total: number;
  onNext: () => void;
  onPrevious: () => void;
}

export function TheoryCard({
  card,
  index,
  total,
  onNext,
  onPrevious
}: TheoryCardProps) {
  return (
    <section className="rounded-[2rem] bg-white/90 p-6 shadow-card backdrop-blur">
      <div className="mb-5 flex items-center justify-between text-sm font-semibold text-sea/70">
        <span>
          Thẻ {index + 1}/{total}
        </span>
        <span className="rounded-full bg-mist px-3 py-1 text-ink/70">
          Lý thuyết
        </span>
      </div>
      <h2 className="font-heading text-2xl font-bold text-ink">
        {card.heading}
      </h2>
      <ChemParagraph
        className="mt-4 text-base leading-7 text-ink/85"
        text={card.body}
      />
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          className="rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/70 transition hover:border-sea hover:text-sea disabled:cursor-not-allowed disabled:opacity-40"
          disabled={index === 0}
          onClick={onPrevious}
          type="button"
        >
          Quay lại
        </button>
        <button
          className="rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink"
          onClick={onNext}
          type="button"
        >
          {index + 1 === total ? 'Hoàn thành lý thuyết' : 'Thẻ tiếp theo'}
        </button>
      </div>
    </section>
  );
}
