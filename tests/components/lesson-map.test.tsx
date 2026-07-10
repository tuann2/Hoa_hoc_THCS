import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LessonMap } from '../../src/components/LessonMap';
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
        questions: []
      },
      {
        id: 'u1-l2',
        title: 'Bài bị khoá',
        order: 2,
        summary: '...',
        status: 'available',
        cards: [],
        questions: []
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

describe('LessonMap', () => {
  it.each([
    ['theory', '/learn/u1/u1-l1/theory'],
    ['practice', '/learn/u1/u1-l1/practice']
  ] as const)('tạo link bài học đúng theo mode %s', (mode, href) => {
    render(
      <MemoryRouter>
        <LessonMap
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
          lessonStars={{}}
          mode="theory"
          unlockedLessonIds={['u1-l1']}
          units={fixtureUnits}
        />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('link', { name: /Bài bị khoá/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Hoàn thành bài trước để mở khoá.')
    ).toBeInTheDocument();
    expect(screen.getByText('Nội dung đang biên soạn.')).toBeInTheDocument();
  });
});
