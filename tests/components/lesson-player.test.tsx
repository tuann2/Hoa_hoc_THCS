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
        title: 'Bài chỉ có lý thuyết',
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
            prompt: 'Câu chỉ có lý thuyết',
            options: ['A', 'B'],
            answer: 0,
            explanation: '...'
          }
        ]
      },
      {
        id: 'u1-l3',
        title: 'Bài tiếp theo',
        order: 3,
        summary: '...',
        status: 'available',
        cards: [{ id: 'c3', heading: '...', body: '...' }],
        questions: [
          {
            id: 'q4',
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

function renderLessonPlayer(
  lessonIndex: number,
  mode: 'theory' | 'practice',
  initialEntry = `/learn/u1/${fixtureUnits[0].lessons[lessonIndex].id}/${mode}`
) {
  const lesson = fixtureUnits[0].lessons[lessonIndex];

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={
            <LessonPlayer
              key={`${lesson.id}-theory`}
              lesson={lesson}
              mode="theory"
              unit={fixtureUnits[0]}
              units={fixtureUnits}
            />
          }
          path={`/learn/u1/${lesson.id}/theory`}
        />
        <Route
          element={
            <LessonPlayer
              key={`${lesson.id}-practice`}
              lesson={lesson}
              mode="practice"
              unit={fixtureUnits[0]}
              units={fixtureUnits}
            />
          }
          path={`/learn/u1/${lesson.id}/practice`}
        />
        <Route
          element={<div>Bài tiếp theo</div>}
          path="/learn/u1/u1-l3/practice"
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('LessonPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
  });

  it('mode theory đi qua thẻ rồi chỉ hỏi câu theory và cập nhật part theory', async () => {
    const user = userEvent.setup();

    renderLessonPlayer(0, 'theory');

    expect(screen.getByText('Ghi nhớ')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Hoàn thành lý thuyết' })
    );

    expect(screen.getByText('Chọn đáp án đúng')).toBeInTheDocument();
    expect(screen.queryByText('Nhập khí tạo thành')).not.toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đúng' }));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    await waitFor(() =>
      expect(screen.getByText('Em đã xong lượt luyện này')).toBeInTheDocument()
    );

    expect(
      getProgressStore(fixtureUnits).getState().lessonProgress['u1-l1']
    ).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: false, accuracy: 0 },
      completed: false
    });
    expect(
      getProgressStore(fixtureUnits).getState().unlockedLessonIds
    ).not.toContain('u1-l2');
    expect(
      screen.getByRole('button', { name: 'Làm phần Bài tập' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sang bài tiếp theo' })
    ).not.toBeInTheDocument();
  });

  it('mode practice chỉ hỏi câu calculation, giữ retry logic, và mở bài sau khi đủ hai phần', async () => {
    const user = userEvent.setup();
    const store = getProgressStore(fixtureUnits);

    store
      .getState()
      .completeLessonPart(
        fixtureUnits[0].lessons[0],
        'theory',
        100,
        10,
        'u1-l2',
        new Date('2026-07-10')
      );

    renderLessonPlayer(0, 'practice');

    expect(screen.getByText('Nhập khí tạo thành')).toBeInTheDocument();
    expect(screen.queryByText('Chọn đáp án đúng')).not.toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'O2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    expect(screen.getByText(/Làm lại/)).toBeInTheDocument();
    expect(screen.getByText('Nhập khí tạo thành')).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'H2');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: 'Câu tiếp theo' }));

    await waitFor(() =>
      expect(screen.getByText('Em đã xong lượt luyện này')).toBeInTheDocument()
    );

    expect(
      getProgressStore(fixtureUnits).getState().lessonProgress['u1-l1']
    ).toMatchObject({
      theory: { completed: true, accuracy: 100, bestXp: 10 },
      practice: { completed: true, accuracy: 0, bestXp: 0 },
      completed: true
    });
    expect(
      getProgressStore(fixtureUnits).getState().unlockedLessonIds
    ).toContain('u1-l2');
    expect(
      screen.getByRole('button', { name: 'Sang bài tiếp theo' })
    ).toBeInTheDocument();
  });

  it('practice mode với bài không có calculation hiển thị màn thân thiện', async () => {
    const user = userEvent.setup();

    renderLessonPlayer(1, 'practice');

    expect(
      screen.getByText('Bài này không có bài tập tính toán')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ôn phần Lý thuyết' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ôn phần Lý thuyết' }));
    await user.click(
      screen.getByRole('button', { name: 'Hoàn thành lý thuyết' })
    );

    await waitFor(() =>
      expect(screen.getByText('Câu chỉ có lý thuyết')).toBeInTheDocument()
    );
  });
});
