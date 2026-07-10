import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LessonMap } from '../../src/components/LessonMap';
import type { LessonProgress } from '../../src/store/progress';
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
        title: 'Bài mở khoá',
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
            prompt: '...',
            options: ['A', 'B'],
            answer: 0,
            explanation: '...'
          },
          {
            id: 'q2',
            type: 'single-choice',
            level: 'basic',
            category: 'calculation',
            prompt: '...',
            options: ['A', 'B'],
            answer: 0,
            explanation: '...'
          }
        ]
      },
      {
        id: 'u1-l2',
        title: 'Bài không có bài tập',
        order: 2,
        summary: '...',
        status: 'available',
        cards: [],
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
      },
      {
        id: 'u1-l3',
        title: 'Bài sắp ra mắt',
        order: 3,
        summary: '...',
        status: 'coming-soon',
        cards: [],
        questions: []
      }
    ]
  }
];

const lessonProgress: Record<string, LessonProgress> = {
  'u1-l1': {
    theory: { completed: true, accuracy: 100, bestXp: 10 },
    practice: { completed: false, accuracy: 0 },
    completed: false,
    stars: 1,
    bestAccuracy: 50,
    bestXp: 10
  }
};

describe('LessonMap', () => {
  it.each([
    ['theory', '/learn/u1/u1-l1/theory'],
    ['practice', '/learn/u1/u1-l1/practice']
  ] as const)('tạo link bài học đúng theo mode %s', (mode, href) => {
    render(
      <MemoryRouter>
        <LessonMap
          lessonProgress={lessonProgress}
          lessonStars={{ 'u1-l1': 2 }}
          mode={mode}
          unlockedLessonIds={['u1-l1']}
          units={fixtureUnits}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Bài mở khoá/ })).toHaveAttribute(
      'href',
      href
    );
  });

  it('giữ nguyên render tĩnh cho bài bị khoá hoặc chưa mở', () => {
    render(
      <MemoryRouter>
        <LessonMap
          lessonProgress={{}}
          lessonStars={{}}
          mode="theory"
          unlockedLessonIds={['u1-l1']}
          units={fixtureUnits}
        />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('link', { name: /Bài không có bài tập/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Hoàn thành bài trước để mở khoá.')
    ).toBeInTheDocument();
    expect(screen.getByText('Nội dung đang biên soạn.')).toBeInTheDocument();
  });

  it('practice mode hiển thị ghi chú không có bài tập và dẫn sang theory', () => {
    render(
      <MemoryRouter>
        <LessonMap
          lessonProgress={{}}
          lessonStars={{}}
          mode="practice"
          unlockedLessonIds={['u1-l1', 'u1-l2']}
          units={fixtureUnits}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText('không có bài tập')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /Bài không có bài tập/ })
    ).toHaveAttribute('href', '/learn/u1/u1-l2/theory');
  });

  it('hiển thị chip trạng thái LT/BT theo tiến độ từng phần', () => {
    render(
      <MemoryRouter>
        <LessonMap
          lessonProgress={lessonProgress}
          lessonStars={{ 'u1-l1': 1 }}
          mode="theory"
          unlockedLessonIds={['u1-l1']}
          units={fixtureUnits}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('LT ✓')).toBeInTheDocument();
    expect(screen.getByText('BT')).toBeInTheDocument();
  });
});
