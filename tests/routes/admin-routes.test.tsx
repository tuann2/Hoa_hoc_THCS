import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchAdminLearners, fetchAdminLearnerDetail } = vi.hoisted(() => ({
  fetchAdminLearners: vi.fn(),
  fetchAdminLearnerDetail: vi.fn()
}));

vi.mock('../../src/lib/adminReports', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/lib/adminReports')
  >('../../src/lib/adminReports');
  return { ...actual, fetchAdminLearners, fetchAdminLearnerDetail };
});

import { AdminLearnerDetailRoute } from '../../src/routes/AdminLearnerDetailRoute';
import { AdminLearnersRoute } from '../../src/routes/AdminLearnersRoute';
import { ProfileRoute } from '../../src/routes/ProfileRoute';
import { getAuthStore, resetAuthStoreForTests } from '../../src/store/auth';

function account(id: string): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-07-24T00:00:00.000Z',
    id,
    email: `${id}@example.com`,
    user_metadata: {}
  };
}

const learner = {
  userId: 'learner-1',
  displayName: 'Mai An',
  totalXp: 120,
  completedLessons: 1,
  availableLessons: 10,
  completionPercent: 10,
  masteredLessons: 1,
  pendingReviewCount: 2,
  streakCurrent: 3,
  lastStudyDate: '2026-07-22',
  lastSyncedAt: '2026-07-22T03:00:00.000Z',
  studySecondsToday: 65,
  studySecondsLast7Days: 500
};

const detail = {
  ...learner,
  partBreakdown: [],
  lessonStatus: [],
  recentExamHistory: [],
  accuracy: { averageBestAccuracy: 80, bestAccuracy: 90, measuredLessons: 1 },
  dailyStudyTime: [
    { date: '2026-07-20', activeSeconds: 0 },
    { date: '2026-07-21', activeSeconds: 125 }
  ]
};

function renderAdminRoutes(path = '/admin/learners') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile" element={<div>Hồ sơ</div>} />
        <Route path="/admin/learners" element={<AdminLearnersRoute />} />
        <Route
          path="/admin/learners/:userId"
          element={<AdminLearnerDetailRoute />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('admin routes', () => {
  beforeEach(() => {
    resetAuthStoreForTests();
    fetchAdminLearners.mockReset();
    fetchAdminLearnerDetail.mockReset();
    getAuthStore().setState({
      user: account('admin-1'),
      isAdmin: true,
      authGeneration: 4
    });
  });

  it('chặn non-admin khi gõ URL trực tiếp và không fetch báo cáo', () => {
    getAuthStore().setState({ isAdmin: false });
    renderAdminRoutes();

    expect(
      screen.getByText('Bạn không có quyền xem trang này')
    ).toBeInTheDocument();
    expect(fetchAdminLearners).not.toHaveBeenCalled();
  });

  it('student không thấy CTA admin trong profile và list rỗng có empty state', async () => {
    getAuthStore().setState({ isAdmin: false });
    const { unmount } = render(
      <MemoryRouter>
        <ProfileRoute />
      </MemoryRouter>
    );
    expect(
      screen.queryByRole('link', { name: 'Xem học viên' })
    ).not.toBeInTheDocument();
    unmount();

    getAuthStore().setState({ isAdmin: true });
    fetchAdminLearners.mockResolvedValue([]);
    renderAdminRoutes();
    expect(
      await screen.findByText('Chưa có học viên nào để hiển thị.')
    ).toBeInTheDocument();
  });

  it('admin thấy danh sách và điều hướng tới chi tiết học viên', async () => {
    const user = userEvent.setup();
    fetchAdminLearners.mockResolvedValue([learner]);
    fetchAdminLearnerDetail.mockResolvedValue(detail);

    renderAdminRoutes();

    expect(await screen.findByText('Mai An')).toBeInTheDocument();
    expect(screen.getByText('1 phút 5 giây')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Xem chi tiết' }));
    expect(
      await screen.findByText('Thời gian học online (GMT+7)')
    ).toBeInTheDocument();
    expect(fetchAdminLearnerDetail).toHaveBeenCalled();
  });

  it('đổi preset, chặn custom range sai trước khi fetch và hiển thị error/empty', async () => {
    const user = userEvent.setup();
    fetchAdminLearnerDetail.mockResolvedValue(detail);
    renderAdminRoutes('/admin/learners/learner-1');

    expect(
      await screen.findByText('Tổng trong khoảng: 2 phút 5 giây')
    ).toBeInTheDocument();
    const callsBeforeInvalidRange = fetchAdminLearnerDetail.mock.calls.length;
    await user.clear(screen.getByLabelText('Từ ngày'));
    await user.type(screen.getByLabelText('Từ ngày'), '2026-12-31');
    await user.clear(screen.getByLabelText('Đến ngày'));
    await user.type(screen.getByLabelText('Đến ngày'), '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(
      await screen.findByText(/Ngày bắt đầu phải trước/)
    ).toBeInTheDocument();
    expect(fetchAdminLearnerDetail).toHaveBeenCalledTimes(
      callsBeforeInvalidRange
    );

    await user.clear(screen.getByLabelText('Từ ngày'));
    await user.type(screen.getByLabelText('Từ ngày'), '2025-01-01');
    await user.clear(screen.getByLabelText('Đến ngày'));
    await user.type(screen.getByLabelText('Đến ngày'), '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByText(/tối đa là 365 ngày/)).toBeInTheDocument();
    expect(fetchAdminLearnerDetail).toHaveBeenCalledTimes(
      callsBeforeInvalidRange
    );

    await user.click(screen.getByRole('button', { name: '30 ngày' }));
    expect(fetchAdminLearnerDetail.mock.calls.length).toBeGreaterThan(
      callsBeforeInvalidRange
    );

    fetchAdminLearnerDetail.mockRejectedValueOnce(new Error('offline'));
    await user.click(screen.getByRole('button', { name: '7 ngày' }));
    expect(
      await screen.findByText(
        'Không tải được báo cáo chi tiết. Hãy thử lại sau.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Tổng trong khoảng: 2 phút 5 giây')
    ).not.toBeInTheDocument();
  });

  it('bỏ response danh sách cũ khi session chuyển từ admin sang học viên', async () => {
    let resolveLearners: ((value: (typeof learner)[]) => void) | undefined;
    fetchAdminLearners.mockImplementation(
      () =>
        new Promise<(typeof learner)[]>((resolve) => {
          resolveLearners = resolve;
        })
    );
    renderAdminRoutes();

    getAuthStore().setState({
      user: account('student-1'),
      isAdmin: false,
      authGeneration: 5
    });
    resolveLearners?.([learner]);

    expect(
      await screen.findByText('Bạn không có quyền xem trang này')
    ).toBeInTheDocument();
    expect(screen.queryByText('Mai An')).not.toBeInTheDocument();
  });
});
