import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateXp, isQuestionCorrect } from '../lib/chemistry';
import { setPwaSessionActive } from '../lib/pwa';
import { getNextLessonId, getProgressStore } from '../store/progress';
import type {
  Lesson,
  Question,
  UnitContent,
  UnitSummary
} from '../types/content';
import { ExitButton } from './ExitButton';
import { ProgressBar } from './ProgressBar';
import { QuestionRenderer, type SubmissionResult } from './QuestionRenderer';
import { ResultScreen } from './ResultScreen';
import { TheoryCard } from './TheoryCard';

interface LessonPlayerProps {
  lesson: Lesson;
  mode: 'theory' | 'practice';
  unit: UnitContent;
  units: UnitSummary[];
}

type Phase = 'theory' | 'quiz' | 'practice-empty' | 'result';

function buildRetryQueue(
  questions: Question[],
  retryIds: string[]
): Question[] {
  const questionById = Object.fromEntries(
    questions.map((question) => [question.id, question])
  );
  return retryIds
    .map((questionId) => questionById[questionId])
    .filter((question): question is Question => Boolean(question));
}

export function LessonPlayer({ lesson, mode, unit, units }: LessonPlayerProps) {
  useEffect(() => {
    setPwaSessionActive(true);
    return () => setPwaSessionActive(false);
  }, []);

  const navigate = useNavigate();
  const progressStore = getProgressStore(units);
  const completeLessonPart = progressStore((state) => state.completeLessonPart);
  const recordWrongAnswer = progressStore((state) => state.recordWrongAnswer);
  const clearWrongAnswer = progressStore((state) => state.clearWrongAnswer);
  const currentLessonProgress = progressStore(
    (state) => state.lessonProgress[lesson.id]
  );
  const theoryQuestions = useMemo(
    () => lesson.questions.filter((question) => question.category === 'theory'),
    [lesson]
  );
  const practiceQuestions = useMemo(
    () =>
      lesson.questions.filter(
        (question) => question.category === 'calculation'
      ),
    [lesson]
  );
  const lessonQuestions =
    mode === 'theory' ? theoryQuestions : practiceQuestions;
  const otherMode = mode === 'theory' ? 'practice' : 'theory';
  const otherModeCompleted =
    otherMode === 'theory'
      ? currentLessonProgress?.theory.completed === true
      : currentLessonProgress?.practice.completed === true;
  const otherModeQuestionCount =
    otherMode === 'theory' ? theoryQuestions.length : practiceQuestions.length;
  const [phase, setPhase] = useState<Phase>(
    mode === 'theory'
      ? 'theory'
      : lessonQuestions.length === 0
        ? 'practice-empty'
        : 'quiz'
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [retryIds, setRetryIds] = useState<string[]>([]);
  const [firstAttemptSeen, setFirstAttemptSeen] = useState<string[]>([]);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [currentResult, setCurrentResult] = useState<SubmissionResult | null>(
    null
  );
  const [finalState, setFinalState] = useState<{
    accuracy: number;
    xp: number;
    stars: 0 | 1 | 2 | 3;
    showNextLesson: boolean;
    secondaryActionLabel?: string;
  } | null>(null);

  const reviewQueue = useMemo(
    () => buildRetryQueue(lessonQuestions, retryIds),
    [lessonQuestions, retryIds]
  );
  const questionQueue = useMemo(
    () => [...lessonQuestions, ...reviewQueue],
    [lessonQuestions, reviewQueue]
  );
  const currentQuestion = questionQueue[questionIndex];
  const retryMode = questionIndex >= lessonQuestions.length;
  const nextLessonId = getNextLessonId(units, unit.id, lesson.id);
  const secondaryActionLabel =
    !otherModeCompleted && otherModeQuestionCount > 0
      ? otherMode === 'practice'
        ? 'Làm phần Bài tập'
        : 'Ôn phần Lý thuyết'
      : undefined;

  if (!currentQuestion && phase === 'quiz') {
    return null;
  }

  function resetLesson() {
    setPhase(
      mode === 'theory'
        ? 'theory'
        : lessonQuestions.length === 0
          ? 'practice-empty'
          : 'quiz'
    );
    setCardIndex(0);
    setQuestionIndex(0);
    setRetryIds([]);
    setFirstAttemptSeen([]);
    setCorrectFirstTry(0);
    setCurrentResult(null);
    setFinalState(null);
  }

  function finishLesson() {
    const accuracy =
      lessonQuestions.length === 0
        ? 100
        : Math.round((correctFirstTry / lessonQuestions.length) * 100);
    const xp = calculateXp(correctFirstTry);

    completeLessonPart(lesson, mode, accuracy, xp, nextLessonId);

    const updatedProgress =
      getProgressStore(units).getState().lessonProgress[lesson.id];

    setFinalState({
      accuracy,
      xp,
      stars: updatedProgress?.stars ?? 0,
      showNextLesson:
        updatedProgress?.completed === true && nextLessonId !== null,
      secondaryActionLabel
    });
    setPhase('result');
  }

  function handleSubmit(response: string | number[] | number) {
    const correct = isQuestionCorrect(currentQuestion, response);
    const isFirstAttempt = !firstAttemptSeen.includes(currentQuestion.id);

    if (isFirstAttempt) {
      setFirstAttemptSeen((current) => [...current, currentQuestion.id]);

      if (correct) {
        setCorrectFirstTry((current) => current + 1);
        clearWrongAnswer(unit.id, lesson.id, currentQuestion.id);
      } else {
        setRetryIds((current) =>
          current.includes(currentQuestion.id)
            ? current
            : [...current, currentQuestion.id]
        );
        recordWrongAnswer(unit.id, lesson.id, currentQuestion.id);
      }
    }

    setCurrentResult({ correct, response });
  }

  function handleNextQuestion() {
    setCurrentResult(null);

    if (questionIndex + 1 >= questionQueue.length) {
      finishLesson();
      return;
    }

    setQuestionIndex((current) => current + 1);
  }

  if (phase === 'theory') {
    return (
      <div className="space-y-5">
        <div className="rounded-[2rem] bg-ink p-5 text-white shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                {unit.code} · {unit.title}
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold">
                {lesson.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                {lesson.summary}
              </p>
            </div>
            <ExitButton confirmMessage="Thoát học lý thuyết? Tiến trình đọc thẻ hiện tại sẽ không được lưu." />
          </div>
        </div>
        <ProgressBar current={cardIndex + 1} total={lesson.cards.length} />
        <TheoryCard
          card={lesson.cards[cardIndex]}
          index={cardIndex}
          onNext={() => {
            if (cardIndex + 1 === lesson.cards.length) {
              if (lessonQuestions.length === 0) {
                finishLesson();
                return;
              }

              setPhase('quiz');
              return;
            }

            setCardIndex((current) => current + 1);
          }}
          onPrevious={() => setCardIndex((current) => Math.max(0, current - 1))}
          total={lesson.cards.length}
        />
      </div>
    );
  }

  if (phase === 'practice-empty') {
    return (
      <section className="rounded-[2rem] bg-white/95 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sea/70">
          Chế độ bài tập
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Bài này không có bài tập tính toán
        </h2>
        <p className="mt-3 text-base leading-7 text-ink/75">
          Em có thể chuyển sang phần lý thuyết của bài này để tiếp tục học, hoặc
          quay về lộ trình.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-full bg-sea px-5 py-3 font-semibold text-white transition hover:bg-ink"
            onClick={() => navigate(`/learn/${unit.id}/${lesson.id}/theory`)}
            type="button"
          >
            Ôn phần Lý thuyết
          </button>
          <button
            className="rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/70 transition hover:border-sea hover:text-sea"
            onClick={() => navigate('/')}
            type="button"
          >
            Về lộ trình
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'result' && finalState) {
    return (
      <ResultScreen
        accuracy={finalState.accuracy}
        correctCount={correctFirstTry}
        earnedXp={finalState.xp}
        onBackHome={() => navigate('/')}
        onNextLesson={
          finalState.showNextLesson && nextLessonId
            ? () => navigate(`/learn/${unit.id}/${nextLessonId}/${mode}`)
            : undefined
        }
        onSecondaryAction={
          finalState.secondaryActionLabel
            ? () => navigate(`/learn/${unit.id}/${lesson.id}/${otherMode}`)
            : undefined
        }
        onReplay={resetLesson}
        secondaryActionLabel={finalState.secondaryActionLabel}
        stars={finalState.stars}
        totalQuestions={lessonQuestions.length}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-ink p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              {unit.code} · {unit.title}
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold">
              {lesson.title}
            </h2>
          </div>
          <ExitButton confirmMessage="Thoát giải bài tập? Bài học sẽ chưa được tính hoàn thành (không cộng XP/sao), nhưng các câu đã trả lời vẫn được ghi vào danh sách cần ôn." />
        </div>
      </div>
      <ProgressBar current={questionIndex + 1} total={questionQueue.length} />
      <QuestionRenderer
        index={questionIndex}
        key={currentQuestion.id}
        onNext={handleNextQuestion}
        onSubmit={handleSubmit}
        question={currentQuestion}
        result={currentResult}
        retryMode={retryMode}
        total={questionQueue.length}
      />
    </div>
  );
}
