import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamRoute } from '../../src/routes/ExamRoute';
import {
  getProgressStore,
  getWrongQuestionKey,
  isWrongQuestionPending,
  resetProgressStoreForTests
} from '../../src/store/progress';
import type { UnitContent } from '../../src/types/content';

const { fixtureUnits } = vi.hoisted(() => ({
  fixtureUnits: [
    {
      id: 'u1',
      part: 'inorganic',
      code: 'A1',
      title: 'Chuyên đề thi thử',
      order: 1,
      description: '...',
      status: 'available',
      lessons: [
        {
          id: 'u1-l1',
          title: 'Bài 1',
          order: 1,
          summary: '...',
          status: 'available',
          cards: [],
          questions: [
            {
              id: 'q1',
              type: 'single-choice',
              level: 'basic',
              category: 'theory',
              prompt: 'Câu từng sai',
              options: ['Sai', 'Đúng'],
              answer: 1,
              explanation: 'Lời giải câu 1'
            },
            {
              id: 'q2',
              type: 'single-choice',
              level: 'applied',
              category: 'theory',
              prompt: 'Câu sẽ bị sai',
              options: ['Đáp án đúng', 'Đáp án sai'],
              answer: 0,
              explanation: 'Lời giải câu 2'
            }
          ]
        }
      ]
    }
  ] satisfies UnitContent[]
}));

vi.mock('../../src/lib/content', () => ({
  getAllUnits: () => fixtureUnits,
  partLabels: {
    inorganic: 'Vô cơ',
    organic: 'Hữu cơ'
  }
}));

vi.mock('../../src/lib/contentLoader', () => ({
  loadUnits: () => Promise.resolve(fixtureUnits)
}));

function submitVisibleQuestion() {
  if (screen.queryByText('Câu từng sai')) {
    fireEvent.click(screen.getByRole('button', { name: 'Đúng' }));
  } else if (screen.queryByText('Câu sẽ bị sai')) {
    fireEvent.click(screen.getByRole('button', { name: 'Đáp án sai' }));
  } else {
    throw new Error('Không tìm thấy câu hỏi hiện tại');
  }

  fireEvent.click(screen.getByRole('button', { name: 'Lưu & câu tiếp theo' }));
}

async function startExam() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thi' }));
    await Promise.resolve();
  });
}

describe('ExamRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-06T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('chạy hết luồng cấu hình đến kết quả và cập nhật examHistory, wrongQuestions', async () => {
    const store = getProgressStore(fixtureUnits);
    const pendingKey = getWrongQuestionKey('u1', 'u1-l1', 'q1');
    const wrongKey = getWrongQuestionKey('u1', 'u1-l1', 'q2');

    store.setState((state) => ({
      ...state,
      wrongQuestions: {
        [pendingKey]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q1',
          missCount: 2,
          lastMissedAt: '2026-07-05T09:00:00.000Z'
        }
      }
    }));

    render(
      <MemoryRouter initialEntries={['/exam']}>
        <ExamRoute />
      </MemoryRouter>
    );

    await startExam();

    expect(screen.getByRole('button', { name: '✕ Thoát' })).toBeInTheDocument();

    submitVisibleQuestion();
    submitVisibleQuestion();
    await vi.advanceTimersByTimeAsync(0);

    expect(screen.getByText('Kết quả thi thử')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Lời giải câu 1')).toBeInTheDocument();
    expect(store.getState().examHistory).toHaveLength(1);
    expect(store.getState().examHistory[0].accuracy).toBe(50);

    const resolvedEntry = store.getState().wrongQuestions[pendingKey];

    expect(resolvedEntry).toBeDefined();
    if (!resolvedEntry) {
      throw new Error('Expected pending question to remain as tombstone');
    }
    expect(isWrongQuestionPending(resolvedEntry)).toBe(false);
    expect(store.getState().wrongQuestions[wrongKey]).toBeDefined();
    expect(
      isWrongQuestionPending(store.getState().wrongQuestions[wrongKey])
    ).toBe(true);
  });

  it('hết giờ tự nộp và tính câu bỏ trống là sai', async () => {
    const store = getProgressStore(fixtureUnits);
    const firstQuestionKey = getWrongQuestionKey('u1', 'u1-l1', 'q1');

    render(
      <MemoryRouter initialEntries={['/exam']}>
        <ExamRoute />
      </MemoryRouter>
    );

    await startExam();

    expect(screen.getByRole('button', { name: '✕ Thoát' })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(0);

    expect(
      screen.getByText('Hết giờ, đề đã được nộp tự động')
    ).toBeInTheDocument();
    expect(screen.getByText('0/2')).toBeInTheDocument();
    expect(store.getState().examHistory[0].correctCount).toBe(0);
    expect(
      isWrongQuestionPending(store.getState().wrongQuestions[firstQuestionKey])
    ).toBe(true);
  });
});
