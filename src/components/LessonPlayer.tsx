import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateStars,
  calculateXp,
  isQuestionCorrect
} from '../lib/chemistry';
import { getNextLessonId, getProgressStore } from '../store/progress';
import type { Lesson, Question, UnitContent } from '../types/content';
import { ProgressBar } from './ProgressBar';
import { QuestionRenderer, type SubmissionResult } from './QuestionRenderer';
import { ResultScreen } from './ResultScreen';
import { TheoryCard } from './TheoryCard';

interface LessonPlayerProps {
  lesson: Lesson;
  unit: UnitContent;
  units: UnitContent[];
}

type Phase = 'theory' | 'quiz' | 'result';

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

export function LessonPlayer({ lesson, unit, units }: LessonPlayerProps) {
  const navigate = useNavigate();
  const progressStore = getProgressStore(units);
  const completeLesson = progressStore((state) => state.completeLesson);
  const recordWrongAnswer = progressStore((state) => state.recordWrongAnswer);
  const clearWrongAnswer = progressStore((state) => state.clearWrongAnswer);
  const [phase, setPhase] = useState<Phase>('theory');
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
  } | null>(null);

  const reviewQueue = useMemo(
    () => buildRetryQueue(lesson.questions, retryIds),
    [lesson.questions, retryIds]
  );
  const questionQueue = useMemo(
    () => [...lesson.questions, ...reviewQueue],
    [lesson.questions, reviewQueue]
  );
  const currentQuestion = questionQueue[questionIndex];
  const retryMode = questionIndex >= lesson.questions.length;
  const nextLessonId = getNextLessonId(units, unit.id, lesson.id);

  if (!currentQuestion && phase === 'quiz') {
    return null;
  }

  function resetLesson() {
    setPhase('theory');
    setCardIndex(0);
    setQuestionIndex(0);
    setRetryIds([]);
    setFirstAttemptSeen([]);
    setCorrectFirstTry(0);
    setCurrentResult(null);
    setFinalState(null);
  }

  function finishLesson() {
    const accuracy = Math.round(
      (correctFirstTry / lesson.questions.length) * 100
    );
    const xp = calculateXp(correctFirstTry);
    const stars = calculateStars(accuracy);

    completeLesson(lesson, nextLessonId, accuracy, xp);
    setFinalState({ accuracy, xp, stars });
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
        <ProgressBar
          current={cardIndex + 1}
          total={lesson.cards.length + lesson.questions.length}
        />
        <TheoryCard
          card={lesson.cards[cardIndex]}
          index={cardIndex}
          onNext={() => {
            if (cardIndex + 1 === lesson.cards.length) {
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

  if (phase === 'result' && finalState) {
    return (
      <ResultScreen
        accuracy={finalState.accuracy}
        correctCount={correctFirstTry}
        earnedXp={finalState.xp}
        onBackHome={() => navigate('/')}
        onNextLesson={
          nextLessonId
            ? () => navigate(`/learn/${unit.id}/${nextLessonId}`)
            : undefined
        }
        onReplay={resetLesson}
        stars={finalState.stars}
        totalQuestions={lesson.questions.length}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-ink p-5 text-white shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          {unit.code} · {unit.title}
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold">{lesson.title}</h2>
      </div>
      <ProgressBar
        current={lesson.cards.length + questionIndex + 1}
        total={lesson.cards.length + questionQueue.length}
      />
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
