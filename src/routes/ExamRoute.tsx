import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chem, ChemParagraph } from '../components/Chem';
import { QuestionRenderer } from '../components/QuestionRenderer';
import {
  buildExamQuestionPool,
  createSeededRandom,
  getExamItemKey,
  gradeExamAttempt,
  pickExamQuestions,
  type ExamBreakdown,
  type ExamPoolItem,
  type ExamResponse,
  type ExamScope
} from '../lib/exam';
import { isQuestionCorrect } from '../lib/chemistry';
import { getAllUnits, partLabels } from '../lib/content';
import { getProgressStore, type ExamAttempt } from '../store/progress';
import type { BalanceQuestion, Question, UnitContent } from '../types/content';

const QUESTION_OPTIONS = [20, 30, 40] as const;

type Phase = 'config' | 'running' | 'result';

interface ExamSession {
  actualTotal: number;
  durationSeconds: number;
  items: ExamPoolItem[];
  notice: string | null;
  requestedTotal: number;
  scope: ExamScope;
  seed: number;
  startedAt: string;
}

interface ExamResultState {
  attempt: ExamAttempt;
  autoSubmitted: boolean;
  responses: Record<string, ExamResponse | undefined>;
  session: ExamSession;
}

function createAttemptId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `exam-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts.map((value) => String(value).padStart(2, '0')).join(':');
}

function formatScopeLabel(scope: ExamScope, units: UnitContent[]): string {
  if (scope.mode === 'all') {
    return 'Toàn bộ chương trình';
  }

  if (scope.mode === 'part') {
    return partLabels[scope.part ?? 'inorganic'];
  }

  const titles = (scope.unitIds ?? [])
    .map((unitId) => units.find((unit) => unit.id === unitId)?.title)
    .filter((title): title is string => Boolean(title));

  if (titles.length === 0) {
    return 'Chuyên đề đã chọn';
  }

  if (titles.length <= 2) {
    return titles.join(' · ');
  }

  return `${titles.length} chuyên đề`;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatBalancedResponse(
  question: BalanceQuestion,
  coefficients: number[]
): string {
  const renderSide = (formulas: string[], sideCoefficients: number[]) =>
    formulas
      .map((formula, index) => {
        const coefficient = sideCoefficients[index] ?? 1;
        return `${coefficient === 1 ? '' : coefficient}${formula}`;
      })
      .join(' + ');

  const leftCoefficients = coefficients.slice(0, question.left.length);
  const rightCoefficients = coefficients.slice(question.left.length);

  return `${renderSide(question.left, leftCoefficients)} -> ${renderSide(
    question.right,
    rightCoefficients
  )}`;
}

function formatQuestionResponse(
  question: Question,
  response: ExamResponse | undefined
): string {
  if (response === undefined) {
    return 'Chưa trả lời';
  }

  switch (question.type) {
    case 'single-choice':
      return question.options[response as number] ?? 'Không hợp lệ';
    case 'multi-choice':
      return Array.isArray(response)
        ? response
            .map((value) => question.options[value] ?? `Lựa chọn ${value + 1}`)
            .join(', ')
        : 'Không hợp lệ';
    case 'fill-blank':
      return typeof response === 'string' ? response : 'Không hợp lệ';
    case 'balance':
      return Array.isArray(response)
        ? formatBalancedResponse(question, response)
        : 'Không hợp lệ';
    default:
      return 'Không hỗ trợ';
  }
}

function formatCorrectAnswer(question: Question): string {
  switch (question.type) {
    case 'single-choice':
      return question.options[question.answer] ?? 'Không xác định';
    case 'multi-choice':
      return question.answers
        .map((value) => question.options[value] ?? `Lựa chọn ${value + 1}`)
        .join(', ');
    case 'fill-blank':
      return question.answer;
    case 'balance':
      return formatBalancedResponse(question, question.answer);
    default:
      return 'Không hỗ trợ';
  }
}

function breakdownLabel(breakdown: ExamBreakdown, level: keyof ExamBreakdown) {
  const labels = {
    basic: 'Cơ bản',
    applied: 'Vận dụng',
    hsg: 'HSG'
  } as const;

  return {
    label: labels[level],
    ...breakdown[level]
  };
}

export function ExamRoute() {
  const units = useMemo(() => getAllUnits(), []);
  const progressStore = getProgressStore(units);
  const recordWrongAnswer = progressStore((state) => state.recordWrongAnswer);
  const clearWrongAnswer = progressStore((state) => state.clearWrongAnswer);
  const recordExamAttempt = progressStore((state) => state.recordExamAttempt);
  const availableUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.status === 'available' &&
          unit.lessons.some(
            (lesson) =>
              lesson.status === 'available' && lesson.questions.length > 0
          )
      ),
    [units]
  );
  const [phase, setPhase] = useState<Phase>('config');
  const [scopeMode, setScopeMode] = useState<ExamScope['mode']>('all');
  const [selectedPart, setSelectedPart] = useState<'inorganic' | 'organic'>(
    'inorganic'
  );
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [requestedTotal, setRequestedTotal] =
    useState<(typeof QUESTION_OPTIONS)[number]>(20);
  const [configError, setConfigError] = useState<string | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [responses, setResponses] = useState<
    Record<string, ExamResponse | undefined>
  >({});
  const [result, setResult] = useState<ExamResultState | null>(null);
  const responsesRef = useRef<Record<string, ExamResponse | undefined>>({});
  const finishingRef = useRef(false);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    if (phase !== 'running' || !session) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase, session]);

  function resetExam() {
    finishingRef.current = false;
    setPhase('config');
    setConfigError(null);
    setSession(null);
    setQuestionIndex(0);
    setRemainingSeconds(0);
    setResponses({});
    setResult(null);
  }

  const finishExam = useCallback(
    (
      finalResponses: Record<string, ExamResponse | undefined>,
      autoSubmitted: boolean
    ) => {
      if (!session || phase !== 'running' || finishingRef.current) {
        return;
      }

      finishingRef.current = true;
      const finishedAt = new Date();
      const finishedAtIso = finishedAt.toISOString();
      const grade = gradeExamAttempt(session.items, finalResponses);
      const attempt: ExamAttempt = {
        id: createAttemptId(),
        startedAt: session.startedAt,
        finishedAt: finishedAtIso,
        scope:
          session.scope.mode === 'units'
            ? {
                ...session.scope,
                unitIds: [...(session.scope.unitIds ?? [])]
              }
            : { ...session.scope },
        totalQuestions: session.actualTotal,
        correctCount: grade.correctCount,
        accuracy: grade.accuracy,
        breakdown: grade.breakdown
      };

      recordExamAttempt(attempt);
      session.items.forEach((item) => {
        const key = getExamItemKey(item);
        const response = finalResponses[key];
        const correct =
          response !== undefined && isQuestionCorrect(item.question, response);

        if (correct) {
          clearWrongAnswer(
            item.unit.id,
            item.lesson.id,
            item.question.id,
            finishedAt
          );
        } else {
          recordWrongAnswer(
            item.unit.id,
            item.lesson.id,
            item.question.id,
            finishedAt
          );
        }
      });

      setResponses(finalResponses);
      responsesRef.current = finalResponses;
      setResult({
        attempt,
        autoSubmitted,
        responses: finalResponses,
        session
      });
      setPhase('result');
    },
    [clearWrongAnswer, phase, recordExamAttempt, recordWrongAnswer, session]
  );

  useEffect(() => {
    if (phase === 'running' && session && remainingSeconds === 0) {
      finishExam(responsesRef.current, true);
    }
  }, [finishExam, phase, remainingSeconds, session]);

  function handleStartExam() {
    let scope: ExamScope;

    if (scopeMode === 'all') {
      scope = { mode: 'all' };
    } else if (scopeMode === 'part') {
      scope = { mode: 'part', part: selectedPart };
    } else {
      const unitIds = Array.from(new Set(selectedUnitIds));

      if (unitIds.length === 0) {
        setConfigError('Chọn ít nhất một chuyên đề trước khi bắt đầu.');
        return;
      }

      scope = { mode: 'units', unitIds };
    }

    const seed = Date.now();
    const pool = buildExamQuestionPool(units, scope);
    const selection = pickExamQuestions(
      pool,
      requestedTotal,
      createSeededRandom(seed)
    );

    if (selection.actualTotal === 0) {
      setConfigError('Phạm vi này hiện chưa có câu hỏi khả dụng để tạo đề.');
      return;
    }

    const durationMinutes = Math.max(15, selection.actualTotal);

    finishingRef.current = false;
    setConfigError(null);
    setResponses({});
    responsesRef.current = {};
    setQuestionIndex(0);
    setRemainingSeconds(durationMinutes * 60);
    setResult(null);
    setSession({
      actualTotal: selection.actualTotal,
      durationSeconds: durationMinutes * 60,
      items: selection.items,
      notice:
        selection.actualTotal < requestedTotal
          ? `Phạm vi này hiện có ${selection.actualTotal} câu khả dụng nên hệ thống rút đề xuống ${selection.actualTotal} câu.`
          : null,
      requestedTotal,
      scope,
      seed,
      startedAt: new Date(seed).toISOString()
    });
    setPhase('running');
  }

  function handleSubmit(response: ExamResponse) {
    if (!session) {
      return;
    }

    const currentItem = session.items[questionIndex];
    const key = getExamItemKey(currentItem);
    const nextResponses = {
      ...responsesRef.current,
      [key]: response
    };

    setResponses(nextResponses);
    responsesRef.current = nextResponses;

    if (questionIndex + 1 >= session.items.length) {
      finishExam(nextResponses, false);
      return;
    }

    setQuestionIndex((current) => current + 1);
  }

  if (phase === 'config') {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
            Thi thử
          </p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
            Tạo đề luyện tập theo phạm vi em muốn
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75">
            Hệ thống rút ngẫu nhiên theo mục tiêu 40% Cơ bản, 40% Vận dụng và
            20% HSG. Thời gian làm bài bằng số câu nhân 1 phút, tối thiểu 15
            phút.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <fieldset className="rounded-3xl border border-ink/10 p-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                Phạm vi
              </legend>
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-3xl border border-ink/10 px-4 py-4">
                  <input
                    checked={scopeMode === 'all'}
                    className="mt-1 h-4 w-4 accent-sea"
                    name="scope-mode"
                    onChange={() => setScopeMode('all')}
                    type="radio"
                  />
                  <span>
                    <span className="block font-semibold text-ink">
                      Toàn bộ chương trình
                    </span>
                    <span className="mt-1 block text-sm text-ink/65">
                      Trộn câu từ cả Vô cơ và Hữu cơ.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-3xl border border-ink/10 px-4 py-4">
                  <input
                    checked={scopeMode === 'part'}
                    className="mt-1 h-4 w-4 accent-sea"
                    name="scope-mode"
                    onChange={() => setScopeMode('part')}
                    type="radio"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">
                      Theo phần
                    </span>
                    <span className="mt-1 block text-sm text-ink/65">
                      Chọn riêng phần Vô cơ hoặc Hữu cơ.
                    </span>
                    {scopeMode === 'part' ? (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {(['inorganic', 'organic'] as const).map((part) => (
                          <label
                            key={part}
                            className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink"
                          >
                            <input
                              checked={selectedPart === part}
                              className="h-4 w-4 accent-sea"
                              name="selected-part"
                              onChange={() => setSelectedPart(part)}
                              type="radio"
                            />
                            {partLabels[part]}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-3xl border border-ink/10 px-4 py-4">
                  <input
                    checked={scopeMode === 'units'}
                    className="mt-1 h-4 w-4 accent-sea"
                    name="scope-mode"
                    onChange={() => setScopeMode('units')}
                    type="radio"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">
                      Chuyên đề cụ thể
                    </span>
                    <span className="mt-1 block text-sm text-ink/65">
                      Tự chọn một hoặc nhiều chuyên đề để rút đề.
                    </span>
                    {scopeMode === 'units' ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {availableUnits.map((unit) => {
                          const checked = selectedUnitIds.includes(unit.id);

                          return (
                            <label
                              key={unit.id}
                              className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm ${
                                checked
                                  ? 'border-sea bg-sea/10 text-ink'
                                  : 'border-ink/10 bg-white text-ink/75'
                              }`}
                            >
                              <input
                                checked={checked}
                                className="mt-1 h-4 w-4 accent-sea"
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedUnitIds((current) => [
                                      ...current,
                                      unit.id
                                    ]);
                                  } else {
                                    setSelectedUnitIds((current) =>
                                      current.filter((item) => item !== unit.id)
                                    );
                                  }
                                }}
                                type="checkbox"
                              />
                              <span>
                                <span className="block font-semibold text-ink">
                                  {unit.code} · {unit.title}
                                </span>
                                <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-sea/70">
                                  {partLabels[unit.part]}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </span>
                </label>
              </div>
            </fieldset>

            <section className="rounded-3xl border border-ink/10 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                Số câu
              </p>
              <div className="mt-4 grid gap-3">
                {QUESTION_OPTIONS.map((value) => (
                  <label
                    key={value}
                    className={`flex items-center justify-between rounded-3xl border px-4 py-4 ${
                      requestedTotal === value
                        ? 'border-sea bg-sea/10'
                        : 'border-ink/10'
                    }`}
                  >
                    <span className="font-semibold text-ink">{value} câu</span>
                    <input
                      checked={requestedTotal === value}
                      className="h-4 w-4 accent-sea"
                      name="question-total"
                      onChange={() => setRequestedTotal(value)}
                      type="radio"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 rounded-3xl bg-mist p-4 text-sm leading-6 text-ink/75">
                <p>
                  Dự kiến thời gian: tối thiểu{' '}
                  <span className="font-semibold text-ink">
                    {Math.max(15, requestedTotal)} phút
                  </span>
                  .
                </p>
                <p className="mt-2">
                  Trong khi làm bài, đáp án từng câu sẽ chỉ hiện sau khi em nộp
                  toàn bộ đề.
                </p>
              </div>

              {configError ? (
                <p className="mt-4 rounded-2xl bg-ember/10 px-4 py-3 text-sm font-medium text-ink">
                  {configError}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink"
                  onClick={handleStartExam}
                  type="button"
                >
                  Bắt đầu thi
                </button>
                <Link
                  className="inline-flex rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/75 transition hover:border-sea hover:text-sea"
                  to="/profile"
                >
                  Xem hồ sơ
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (phase === 'result' && result) {
    const breakdownEntries = [
      breakdownLabel(result.attempt.breakdown, 'basic'),
      breakdownLabel(result.attempt.breakdown, 'applied'),
      breakdownLabel(result.attempt.breakdown, 'hsg')
    ];

    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
            Kết quả thi thử
          </p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
            {result.autoSubmitted
              ? 'Hết giờ, đề đã được nộp tự động'
              : 'Em đã nộp bài'}
          </h2>
          <p className="mt-3 text-base leading-7 text-ink/75">
            Phạm vi: {formatScopeLabel(result.attempt.scope, units)} · hoàn
            thành lúc {formatTimestamp(result.attempt.finishedAt)}.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl bg-mist p-4">
              <p className="text-sm text-ink/65">Điểm tổng</p>
              <p className="mt-2 text-3xl font-bold text-sea">
                {result.attempt.accuracy}%
              </p>
            </article>
            <article className="rounded-3xl bg-mist p-4">
              <p className="text-sm text-ink/65">Số câu đúng</p>
              <p className="mt-2 text-3xl font-bold text-lime">
                {result.attempt.correctCount}/{result.attempt.totalQuestions}
              </p>
            </article>
            <article className="rounded-3xl bg-mist p-4">
              <p className="text-sm text-ink/65">Thời lượng đề</p>
              <p className="mt-2 text-3xl font-bold text-ember">
                {Math.round(result.session.durationSeconds / 60)} phút
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {breakdownEntries.map((entry) => (
              <article
                key={entry.label}
                className="rounded-3xl border border-ink/10 p-4"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                  {entry.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-ink">
                  {entry.correct}/{entry.total}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink"
              onClick={resetExam}
              type="button"
            >
              Thi đề mới
            </button>
            <Link
              className="inline-flex rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/75 transition hover:border-sea hover:text-sea"
              to="/profile"
            >
              Xem hồ sơ
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {session.items.map((item, index) => {
            const response = result.responses[getExamItemKey(item)];
            const correct =
              response !== undefined &&
              isQuestionCorrect(item.question, response);

            return (
              <article
                key={getExamItemKey(item)}
                className="rounded-[2rem] bg-white/90 p-6 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
                      Câu {index + 1} · {item.unit.code} · {item.lesson.title}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        correct ? 'bg-lime/15 text-ink' : 'bg-ember/15 text-ink'
                      }`}
                    >
                      {correct ? 'Đúng' : 'Sai'}
                    </span>
                  </div>
                  <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-ink/75">
                    {
                      breakdownLabel(
                        result.attempt.breakdown,
                        item.question.level
                      ).label
                    }
                  </span>
                </div>

                <ChemParagraph
                  className="mt-5 text-lg font-semibold leading-8 text-ink"
                  text={item.question.prompt}
                />

                <div className="mt-5 space-y-4">
                  <div className="rounded-3xl border border-ink/10 bg-white p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                      Em đã chọn
                    </p>
                    <p className="mt-2 text-base text-ink/80">
                      <Chem
                        text={formatQuestionResponse(item.question, response)}
                      />
                    </p>
                  </div>
                  <div className="rounded-3xl border border-ink/10 bg-mist p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                      Đáp án đúng
                    </p>
                    <p className="mt-2 text-base font-semibold text-ink">
                      <Chem text={formatCorrectAnswer(item.question)} />
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-card">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sea/70">
                      Lời giải
                    </p>
                    <ChemParagraph
                      className="mt-2 text-base leading-7 text-ink/80"
                      text={item.question.explanation}
                    />
                    {item.question.source ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-sea/70">
                        Nguồn: {item.question.source}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  const currentItem = session.items[questionIndex];

  if (!currentItem) {
    return null;
  }

  const progressCurrent = questionIndex + 1;
  const progressWidth =
    session.actualTotal === 0
      ? 0
      : Math.min(100, (progressCurrent / session.actualTotal) * 100);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Thi thử
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold">
              {formatScopeLabel(session.scope, units)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Seed đề: {session.seed} · bắt đầu lúc{' '}
              {formatTimestamp(session.startedAt)}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
              Thời gian còn lại
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatDuration(remainingSeconds)}
            </p>
          </div>
        </div>

        {session.notice ? (
          <p className="mt-4 rounded-3xl bg-white/10 px-4 py-3 text-sm text-white/85">
            {session.notice}
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] bg-white/90 p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink/65">
          <span>Tiến độ đề thi</span>
          <span>
            {progressCurrent}/{session.actualTotal}
          </span>
        </div>
        <div className="h-3 rounded-full bg-mist">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-lime to-sea transition-all"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </section>

      <QuestionRenderer
        index={questionIndex}
        key={getExamItemKey(currentItem)}
        onNext={() => {}}
        onSubmit={handleSubmit}
        question={currentItem.question}
        result={null}
        retryMode={false}
        submitLabel="Lưu & câu tiếp theo"
        total={session.actualTotal}
      />
    </div>
  );
}
