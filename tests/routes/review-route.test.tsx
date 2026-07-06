import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      code: 'A0',
      title: 'Unit thử nghiệm',
      order: 1,
      description: '...',
      status: 'available',
      lessons: [
        {
          id: 'u1-l1',
          title: 'Bài ôn tập',
          order: 1,
          summary: '...',
          status: 'available',
          cards: [],
          questions: [
            {
              id: 'q1',
              type: 'single-choice',
              level: 'basic',
              prompt: 'Chọn đáp án đúng',
              options: ['Sai', 'Đúng'],
              answer: 1,
              explanation: '...'
            },
            {
              id: 'q2',
              type: 'fill-blank',
              level: 'applied',
              prompt: 'Điền công thức khí hiđro',
              answer: 'H2',
              explanation: '...'
            }
          ]
        }
      ]
    }
  ] satisfies UnitContent[]
}));

vi.mock('../../src/lib/content', () => ({
  getAllUnits: () => fixtureUnits,
  findUnit: (unitId: string) => fixtureUnits.find((unit) => unit.id === unitId),
  findLesson: (unitId: string, lessonId: string) =>
    fixtureUnits
      .find((unit) => unit.id === unitId)
      ?.lessons.find((lesson) => lesson.id === lessonId),
  findQuestion: (unitId: string, lessonId: string, questionId: string) =>
    fixtureUnits
      .find((unit) => unit.id === unitId)
      ?.lessons.find((lesson) => lesson.id === lessonId)
      ?.questions.find((question) => question.id === questionId)
}));

import { ReviewRoute } from '../../src/routes/ReviewRoute';

const firstQuestionKey = getWrongQuestionKey('u1', 'u1-l1', 'q1');
const secondQuestionKey = getWrongQuestionKey('u1', 'u1-l1', 'q2');

describe('ReviewRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
  });

  it('hiển thị trạng thái rỗng khi không có câu cần ôn', () => {
    render(
      <MemoryRouter>
        <ReviewRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Không có câu nào cần ôn')).toBeInTheDocument();
  });

  it('chạy hết hàng đợi, resolve câu đúng và giữ câu sai với missCount cũ', async () => {
    const user = userEvent.setup();
    const store = getProgressStore(fixtureUnits);

    store.setState((state) => ({
      ...state,
      wrongQuestions: {
        [firstQuestionKey]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q1',
          missCount: 1,
          lastMissedAt: '2026-07-05T10:00:00.000Z'
        },
        [secondQuestionKey]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q2',
          missCount: 4,
          lastMissedAt: '2026-07-05T09:00:00.000Z'
        }
      },
      lastMutationAt: '2026-07-05T10:00:00.000Z'
    }));

    render(
      <MemoryRouter>
        <ReviewRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    const resolvedEntry = store.getState().wrongQuestions[firstQuestionKey];

    expect(screen.getByText('Điền công thức khí hiđro')).toBeInTheDocument();
    expect(resolvedEntry).toBeDefined();
    if (!resolvedEntry) {
      throw new Error('Expected resolved review entry to exist');
    }
    expect(resolvedEntry).toMatchObject({ questionId: 'q1' });
    expect(typeof resolvedEntry.resolvedAt).toBe('string');
    expect(isWrongQuestionPending(resolvedEntry)).toBe(false);

    await user.type(screen.getByRole('textbox'), 'O2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    expect(screen.getByText('Em đã xong lượt ôn này')).toBeInTheDocument();
    expect(screen.getByText(/Trả lời đúng 1\/2 câu/)).toBeInTheDocument();
    expect(store.getState().wrongQuestions[secondQuestionKey]).toMatchObject({
      questionId: 'q2',
      missCount: 4
    });
    expect(
      store.getState().wrongQuestions[secondQuestionKey].lastMissedAt
    ).not.toBe('2026-07-05T09:00:00.000Z');
  });

  it('bỏ qua entry không còn tìm thấy trong content', () => {
    const store = getProgressStore(fixtureUnits);

    store.setState((state) => ({
      ...state,
      wrongQuestions: {
        [getWrongQuestionKey('u1', 'u1-l1', 'q-missing')]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q-missing',
          missCount: 1,
          lastMissedAt: '2026-07-05T09:00:00.000Z'
        }
      }
    }));

    render(
      <MemoryRouter>
        <ReviewRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Không có câu nào cần ôn')).toBeInTheDocument();
  });

  it('không đưa entry đã resolved vào hàng đợi ôn tập', () => {
    const store = getProgressStore(fixtureUnits);

    store.setState((state) => ({
      ...state,
      wrongQuestions: {
        [firstQuestionKey]: {
          unitId: 'u1',
          lessonId: 'u1-l1',
          questionId: 'q1',
          missCount: 1,
          lastMissedAt: '2026-07-05T09:00:00.000Z',
          resolvedAt: '2026-07-05T10:00:00.000Z'
        }
      }
    }));

    render(
      <MemoryRouter>
        <ReviewRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Không có câu nào cần ôn')).toBeInTheDocument();
  });
});
