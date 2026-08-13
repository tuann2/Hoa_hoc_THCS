import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProgressStore,
  resetProgressStoreForTests,
  type ProgressSnapshot
} from '../../src/store/progress';
import { createAdminLearnerDetail } from '../../src/lib/adminReports';
import { resetAuthStoreForTests } from '../../src/store/auth';
import { getUnitCatalog } from '../../src/lib/contentCatalog';

const fixtureUnits = getUnitCatalog();

const fixture: ProgressSnapshot = {
  totalXp: 0,
  streakCurrent: 4,
  streakLongest: 4,
  lastStudyDate: '2026-07-05',
  lastMutationAt: '2026-07-05T10:00:00.000Z',
  lessonProgress: {},
  unlockedLessonIds: [],
  wrongQuestions: {},
  examHistory: []
};

vi.mock('../../src/components/LessonMap', () => ({
  LessonMap: () => null
}));

import { HomeRoute } from '../../src/routes/HomeRoute';
import { ProfileRoute } from '../../src/routes/ProfileRoute';

describe('streak consumers', () => {
  beforeEach(() => {
    localStorage.clear();
    resetProgressStoreForTests();
    resetAuthStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T00:00:00.000Z'));
    getProgressStore(fixtureUnits).setState((state) => ({
      ...state,
      ...fixture
    }));
  });

  afterEach(() => vi.useRealTimers());

  it('derives the same expired streak for Home, Profile, and admin reports', () => {
    const home = render(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('0 ngày')).toBeInTheDocument();
    home.unmount();

    render(
      <MemoryRouter>
        <ProfileRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('0 ngày')).toBeInTheDocument();

    const detail = createAdminLearnerDetail(
      { id: 'learner-1', display_name: 'Mai An' },
      {
        user_id: 'learner-1',
        data: fixture,
        version: 5,
        updated_at: '2026-07-05T10:00:00.000Z'
      },
      [],
      { from: '2026-07-07', to: '2026-07-07' },
      new Date('2026-07-07T00:00:00.000Z'),
      fixtureUnits
    );
    expect(detail.streakCurrent).toBe(0);
  });

  it('shows the Home reminder before today is studied and a static milestone label', () => {
    vi.setSystemTime(new Date('2026-07-06T00:00:00.000Z'));
    getProgressStore(fixtureUnits).setState((state) => ({
      ...state,
      ...fixture,
      streakCurrent: 3
    }));

    render(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Học một chút hôm nay để giữ streak nhé!')
    ).toBeInTheDocument();
    expect(screen.getByText('Chúc mừng streak 3 ngày!')).toBeInTheDocument();
  });
});
