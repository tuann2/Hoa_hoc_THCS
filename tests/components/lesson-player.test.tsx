import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LessonPlayer } from '../../src/components/LessonPlayer';
import {
  getProgressStore,
  resetProgressStoreForTests
} from '../../src/store/progress';
import type { UnitContent } from '../../src/types/content';

const fixtureUnits: UnitContent[] = [
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
        title: 'Bài đang học',
        order: 1,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c1', heading: 'Ghi nhớ', body: 'H2 + O2 -> H2O' }],
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            level: 'basic',
            category: 'theory',
            prompt: 'Chọn đáp án đúng',
            options: ['Sai', 'Đúng'],
            answer: 1,
            explanation: 'B1. Đáp án đúng là lựa chọn thứ hai.'
          },
          {
            id: 'q2',
            type: 'fill-blank',
            level: 'applied',
            category: 'calculation',
            prompt: 'Nhập khí tạo thành',
            answer: 'H2',
            explanation: 'B1. Đó là H2.'
          }
        ]
      },
      {
        id: 'u1-l2',
        title: 'Bài tiếp theo',
        order: 2,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c2', heading: '...', body: '...' }],
        questions: [
          {
            id: 'q3',
            type: 'single-choice',
            level: 'basic',
            category: 'theory',
            prompt: '...',
            options: ['A', 'B'],
            answer: 0,
            explanation: '...'
          }
        ]
      }
    ]
  }
];

describe('LessonPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
  });

  it('mode theory dừng ở theory-done và không tính hoàn thành bài', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/learn/u1/u1-l1/theory']}>
        <Routes>
          <Route
            element={
              <LessonPlayer
                key="theory"
                lesson={fixtureUnits[0].lessons[0]}
                mode="theory"
                unit={fixtureUnits[0]}
                units={fixtureUnits}
              />
            }
            path="/learn/u1/u1-l1/theory"
          />
          <Route
            element={
              <LessonPlayer
                key="practice"
                lesson={fixtureUnits[0].lessons[0]}
                mode="practice"
                unit={fixtureUnits[0]}
                units={fixtureUnits}
              />
            }
            path="/learn/u1/u1-l1/practice"
          />
        </Routes>
      </MemoryRouter>
    );

    await user.click(
      screen.getByRole('button', { name: 'Hoàn thành lý thuyết' })
    );

    expect(
      screen.getByText('Em đã đọc xong lý thuyết bài Bài đang học!')
    ).toBeInTheDocument();
    expect(
      getProgressStore(fixtureUnits).getState().lessonProgress['u1-l1']
    ).toBeUndefined();
    expect(
      getProgressStore(fixtureUnits).getState().unlockedLessonIds
    ).not.toContain('u1-l2');

    await user.click(screen.getByRole('button', { name: 'Giải bài tập ngay' }));

    await waitFor(() =>
      expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument()
    );
  });

  it('mode practice bỏ qua theory và giữ nguyên logic hỏi lại câu sai', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/learn/u1/u1-l1/practice']}>
        <Routes>
          <Route
            element={
              <LessonPlayer
                lesson={fixtureUnits[0].lessons[0]}
                mode="practice"
                unit={fixtureUnits[0]}
                units={fixtureUnits}
              />
            }
            path="/learn/u1/u1-l1/practice"
          />
          <Route
            element={<div>Bài tiếp theo practice</div>}
            path="/learn/u1/u1-l2/practice"
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();
    expect(screen.queryByText('Ghi nhớ')).not.toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sai' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));
    await user.type(screen.getByRole('textbox'), 'H2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    expect(screen.getByText(/Làm lại/)).toBeInTheDocument();
    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    await waitFor(() =>
      expect(screen.getByText('Em đã xong lượt luyện này')).toBeInTheDocument()
    );

    expect(
      screen.getByText(/Em làm đúng 1\/2 câu ở lượt đầu/)
    ).toBeInTheDocument();
    expect(
      getProgressStore(fixtureUnits).getState().unlockedLessonIds
    ).toContain('u1-l2');

    await user.click(
      screen.getByRole('button', { name: 'Sang bài tiếp theo' })
    );

    expect(screen.getByText('Bài tiếp theo practice')).toBeInTheDocument();
  });
});
