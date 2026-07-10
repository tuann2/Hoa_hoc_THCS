import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { resetProgressStoreForTests } from '../../src/store/progress';
import type { UnitContent } from '../../src/types/content';

const {
  fixtureUnits,
  initializeMock,
  subscribeProgressPushMock,
  syncProgressOnSignInMock
} = vi.hoisted(() => ({
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
              prompt: 'Câu hỏi luyện tập',
              options: ['Sai', 'Đúng'],
              answer: 1,
              explanation: '...'
            }
          ]
        },
        {
          id: 'u1-l2',
          title: 'Bài đang khoá',
          order: 2,
          summary: '...',
          status: 'available',
          cards: [{ id: 'c2', heading: '...', body: '...' }],
          questions: [
            {
              id: 'q2',
              type: 'single-choice',
              level: 'basic',
              prompt: '...',
              options: ['A', 'B'],
              answer: 0,
              explanation: '...'
            }
          ]
        },
        {
          id: 'u1-l3',
          title: 'Bài chưa mở',
          order: 3,
          summary: '...',
          status: 'coming-soon',
          cards: [{ id: 'c3', heading: '...', body: '...' }],
          questions: []
        }
      ]
    }
  ] satisfies UnitContent[],
  initializeMock: vi.fn(async () => {}),
  subscribeProgressPushMock: vi.fn(),
  syncProgressOnSignInMock: vi.fn(async () => {})
}));

vi.mock('../../src/lib/content', () => ({
  getAllUnits: () => fixtureUnits,
  findUnit: (unitId: string) => fixtureUnits.find((unit) => unit.id === unitId),
  findLesson: (unitId: string, lessonId: string) =>
    fixtureUnits
      .find((unit) => unit.id === unitId)
      ?.lessons.find((lesson) => lesson.id === lessonId)
}));

vi.mock('../../src/lib/progressSync', () => ({
  subscribeProgressPush: subscribeProgressPushMock,
  syncProgressOnSignIn: syncProgressOnSignInMock
}));

vi.mock('../../src/store/auth', () => ({
  getAuthStore: () => (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      initialize: initializeMock,
      isConfigured: false,
      isReady: true,
      user: null,
      displayName: null
    })
}));

vi.mock('../../src/routes/AuthRoute', () => ({
  AuthRoute: () => <div>Auth route</div>
}));

vi.mock('../../src/routes/ExamRoute', () => ({
  ExamRoute: () => <div>Exam route</div>
}));

vi.mock('../../src/routes/HomeRoute', () => ({
  HomeRoute: () => <div>Home route</div>
}));

vi.mock('../../src/routes/ProfileRoute', () => ({
  ProfileRoute: () => <div>Profile route</div>
}));

vi.mock('../../src/routes/ReviewRoute', () => ({
  ReviewRoute: () => <div>Review route</div>
}));

describe('Lesson routes', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
    initializeMock.mockClear();
    subscribeProgressPushMock.mockClear();
    syncProgressOnSignInMock.mockClear();
  });

  it('route theory render LessonPlayer với mode theory', () => {
    render(
      <MemoryRouter initialEntries={['/learn/u1/u1-l1/theory']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Ghi nhớ')).toBeInTheDocument();
    expect(screen.queryByText('Câu hỏi luyện tập')).not.toBeInTheDocument();
  });

  it('route practice render LessonPlayer với mode practice', () => {
    render(
      <MemoryRouter initialEntries={['/learn/u1/u1-l1/practice']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Câu hỏi luyện tập')).toBeInTheDocument();
    expect(screen.queryByText('Ghi nhớ')).not.toBeInTheDocument();
  });

  it.each(['theory', 'practice'] as const)(
    'guard not-found hoạt động cho route %s',
    (mode) => {
      render(
        <MemoryRouter initialEntries={[`/learn/u1/khong-ton-tai/${mode}`]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByText('Không tìm thấy bài học')).toBeInTheDocument();
    }
  );

  it.each(['theory', 'practice'] as const)(
    'guard unavailable hoạt động cho route %s',
    (mode) => {
      render(
        <MemoryRouter initialEntries={[`/learn/u1/u1-l3/${mode}`]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByText('Bài này chưa mở')).toBeInTheDocument();
    }
  );

  it.each(['theory', 'practice'] as const)(
    'guard locked hoạt động cho route %s',
    (mode) => {
      render(
        <MemoryRouter initialEntries={[`/learn/u1/u1-l2/${mode}`]}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByText('Bài này đang bị khoá')).toBeInTheDocument();
    }
  );
});
