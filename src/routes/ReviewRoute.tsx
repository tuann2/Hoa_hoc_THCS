import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExitButton } from '../components/ExitButton';
import {
  QuestionRenderer,
  type SubmissionResult
} from '../components/QuestionRenderer';
import { isQuestionCorrect } from '../lib/chemistry';
import {
  findLesson,
  findQuestion,
  findUnit,
  getAllUnits
} from '../lib/content';
import {
  getProgressStore,
  isWrongQuestionPending,
  type WrongQuestionEntry
} from '../store/progress';
import type { Lesson, Question, UnitContent } from '../types/content';

interface ReviewQueueItem {
  key: string;
  entry: WrongQuestionEntry;
  lesson: Lesson;
  question: Question;
  unit: UnitContent;
}

function resolveReviewQueue(
  units: UnitContent[],
  wrongQuestions: Record<string, WrongQuestionEntry>
): ReviewQueueItem[] {
  return Object.entries(wrongQuestions)
    .filter(([, entry]) => isWrongQuestionPending(entry))
    .sort((left, right) => {
      if (left[1].lastMissedAt === right[1].lastMissedAt) {
        return left[0].localeCompare(right[0]);
      }

      return right[1].lastMissedAt.localeCompare(left[1].lastMissedAt);
    })
    .map(([key, entry]) => {
      const unit = findUnit(entry.unitId);
      const lesson = findLesson(entry.unitId, entry.lessonId);
      const question = findQuestion(
        entry.unitId,
        entry.lessonId,
        entry.questionId
      );

      if (
        !unit ||
        !lesson ||
        !question ||
        !units.some((item) => item.id === unit.id)
      ) {
        return null;
      }

      return {
        key,
        entry,
        lesson,
        question,
        unit
      };
    })
    .filter((item): item is ReviewQueueItem => item !== null);
}

export function ReviewRoute() {
  const units = getAllUnits();
  const progressStore = getProgressStore(units);
  const wrongQuestions = progressStore((state) => state.wrongQuestions);
  const clearWrongAnswer = progressStore((state) => state.clearWrongAnswer);
  const recordWrongAnswer = progressStore((state) => state.recordWrongAnswer);
  const [queue] = useState(() => resolveReviewQueue(units, wrongQuestions));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<SubmissionResult | null>(
    null
  );
  const [correctCount, setCorrectCount] = useState(0);

  if (queue.length === 0) {
    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
          Ôn lại câu sai
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Không có câu nào cần ôn
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">
          Không có câu nào cần ôn, học tiếp bài mới nhé!
        </p>
        <Link
          className="mt-5 inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
          to="/"
        >
          Quay về lộ trình
        </Link>
      </section>
    );
  }

  if (questionIndex >= queue.length) {
    const remainingWrongCount = queue.length - correctCount;

    return (
      <section className="rounded-[2rem] bg-white/90 p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea/70">
          Ôn lại câu sai
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-ink">
          Em đã xong lượt ôn này
        </h2>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Trả lời đúng {correctCount}/{queue.length} câu trong phiên này, còn{' '}
          {remainingWrongCount} câu vẫn ở lại danh sách cần ôn.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full bg-sea px-5 py-3 font-semibold text-white"
            to="/"
          >
            Quay về lộ trình
          </Link>
          {remainingWrongCount > 0 ? (
            <Link
              className="inline-flex rounded-full border border-ink/10 px-5 py-3 font-semibold text-ink/80"
              to="/review"
            >
              Ôn lại lần nữa
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const currentItem = queue[questionIndex];

  function handleSubmit(response: string | number[] | number) {
    setCurrentResult({
      correct: isQuestionCorrect(currentItem.question, response),
      response
    });
  }

  function handleNext() {
    if (currentResult?.correct) {
      clearWrongAnswer(
        currentItem.entry.unitId,
        currentItem.entry.lessonId,
        currentItem.entry.questionId
      );
      setCorrectCount((count) => count + 1);
    } else {
      recordWrongAnswer(
        currentItem.entry.unitId,
        currentItem.entry.lessonId,
        currentItem.entry.questionId,
        new Date(),
        { incrementMissCount: false }
      );
    }

    setCurrentResult(null);
    setQuestionIndex((index) => index + 1);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Ôn lại câu sai
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold">
              {currentItem.unit.code} · {currentItem.lesson.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/80">
              {currentItem.unit.title} · {queue.length} câu trong hàng đợi phiên
              này.
            </p>
          </div>
          <ExitButton confirmMessage="Thoát ôn tập? Câu đã làm vẫn được lưu, các câu còn lại vẫn ở trong danh sách cần ôn." />
        </div>
      </section>

      <QuestionRenderer
        index={questionIndex}
        key={currentItem.key}
        onNext={handleNext}
        onSubmit={handleSubmit}
        question={currentItem.question}
        result={currentResult}
        retryMode={false}
        total={queue.length}
      />
    </div>
  );
}
