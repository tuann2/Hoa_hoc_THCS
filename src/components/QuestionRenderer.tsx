import { useMemo, useState } from 'react';
import type { Question } from '../types/content';
import { Chem, ChemParagraph } from './Chem';

type SubmissionValue = string | number[] | number;

export interface SubmissionResult {
  correct: boolean;
  response: SubmissionValue;
}

interface QuestionRendererProps {
  question: Question;
  index: number;
  total: number;
  result: SubmissionResult | null;
  retryMode: boolean;
  submitLabel?: string;
  onSubmit: (response: SubmissionValue) => void;
  onNext: () => void;
}

const levelLabels = {
  basic: 'Cơ bản',
  applied: 'Vận dụng',
  hsg: 'HSG'
} as const;

export function QuestionRenderer({
  question,
  index,
  total,
  result,
  retryMode,
  submitLabel = 'Kiểm tra',
  onSubmit,
  onNext
}: QuestionRendererProps) {
  const [singleValue, setSingleValue] = useState<number | null>(null);
  const [multiValue, setMultiValue] = useState<number[]>([]);
  const [fillValue, setFillValue] = useState('');
  const [balanceValues, setBalanceValues] = useState<string[]>(
    question.type === 'balance' ? question.answer.map(() => '') : []
  );

  const isSubmitted = result !== null;

  const balanceFormula = useMemo(() => {
    if (question.type !== 'balance') {
      return [];
    }

    return [...question.left, '->', ...question.right];
  }, [question]);

  function submit() {
    if (question.type === 'single-choice' && singleValue !== null) {
      onSubmit(singleValue);
    }

    if (question.type === 'multi-choice' && multiValue.length > 0) {
      onSubmit(multiValue);
    }

    if (question.type === 'fill-blank' && fillValue.trim() !== '') {
      onSubmit(fillValue);
    }

    if (
      question.type === 'balance' &&
      balanceValues.every((value) => value.trim() !== '' && Number(value) > 0)
    ) {
      onSubmit(balanceValues.map((value) => Number(value)));
    }
  }

  return (
    <section className="rounded-[2rem] bg-white/95 p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
            Câu {index + 1}/{total}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-mist px-3 py-1 text-sm font-semibold text-ink/80">
            {levelLabels[question.level]}
            {retryMode ? ' · Làm lại' : ''}
          </span>
        </div>
      </div>

      <ChemParagraph
        className="text-lg font-semibold leading-8 text-ink"
        text={question.prompt}
      />

      <div className="mt-5 space-y-3">
        {question.type === 'single-choice'
          ? question.options.map((option, optionIndex) => {
              const selected = singleValue === optionIndex;

              return (
                <button
                  key={option}
                  data-testid="answer-option"
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    selected
                      ? 'border-sea bg-sea/10 text-ink'
                      : 'border-ink/10 bg-white text-ink/80 hover:border-sea/40'
                  }`}
                  disabled={isSubmitted}
                  onClick={() => setSingleValue(optionIndex)}
                  type="button"
                >
                  <Chem text={option} />
                </button>
              );
            })
          : null}

        {question.type === 'multi-choice'
          ? question.options.map((option, optionIndex) => {
              const selected = multiValue.includes(optionIndex);

              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-3xl border px-4 py-4 transition ${
                    selected
                      ? 'border-sea bg-sea/10'
                      : 'border-ink/10 bg-white hover:border-sea/40'
                  } ${isSubmitted ? 'cursor-default opacity-80' : ''}`}
                >
                  <input
                    checked={selected}
                    className="h-5 w-5 accent-sea"
                    disabled={isSubmitted}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setMultiValue((current) => [...current, optionIndex]);
                      } else {
                        setMultiValue((current) =>
                          current.filter((value) => value !== optionIndex)
                        );
                      }
                    }}
                    type="checkbox"
                  />
                  <span className="text-left text-ink/85">
                    <Chem text={option} />
                  </span>
                </label>
              );
            })
          : null}

        {question.type === 'fill-blank' ? (
          <input
            className="w-full rounded-3xl border border-ink/10 bg-white px-4 py-4 text-base text-ink outline-none transition focus:border-sea"
            disabled={isSubmitted}
            onChange={(event) => setFillValue(event.target.value)}
            placeholder={question.placeholder ?? 'Nhập đáp án'}
            type="text"
            value={fillValue}
          />
        ) : null}

        {question.type === 'balance' ? (
          <div className="rounded-3xl border border-ink/10 bg-mist p-4">
            <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
              {balanceFormula.map((formula, formulaIndex) => {
                const isArrow = formula === '->';

                if (isArrow) {
                  return (
                    <span
                      key={`arrow-${formulaIndex}`}
                      className="mx-1 text-xl"
                    >
                      →
                    </span>
                  );
                }

                const showPlus =
                  formulaIndex !== question.left.length - 1 &&
                  formulaIndex !== balanceFormula.length - 1 &&
                  balanceFormula[formulaIndex + 1] !== '->';

                const balanceIndex =
                  formulaIndex > question.left.length
                    ? formulaIndex - 1
                    : formulaIndex;

                return (
                  <div
                    key={`${formula}-${formulaIndex}`}
                    className="flex items-center gap-2"
                  >
                    <input
                      className="w-14 rounded-2xl border border-ink/10 bg-white px-2 py-2 text-center text-base"
                      disabled={isSubmitted}
                      inputMode="numeric"
                      onChange={(event) =>
                        setBalanceValues((current) =>
                          current.map((value, index) =>
                            index === balanceIndex ? event.target.value : value
                          )
                        )
                      }
                      value={balanceValues[balanceIndex] ?? ''}
                    />
                    <Chem text={formula} />
                    {showPlus ? <span>+</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {result ? (
        <div
          className={`mt-6 rounded-3xl p-4 ${
            result.correct ? 'bg-lime/15 text-ink' : 'bg-ember/15 text-ink'
          }`}
        >
          <p className="font-semibold">
            {result.correct ? 'Chính xác.' : 'Chưa đúng.'}
          </p>
          <ChemParagraph
            className="mt-2 text-sm leading-6 text-ink/80"
            text={question.explanation}
          />
          {question.source ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-sea/70">
              Nguồn: {question.source}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          className="rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSubmitted}
          onClick={submit}
          type="button"
        >
          {submitLabel}
        </button>
        {result ? (
          <button
            className="rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/80 transition hover:border-sea hover:text-sea"
            onClick={onNext}
            type="button"
          >
            Câu tiếp theo
          </button>
        ) : null}
      </div>
    </section>
  );
}
