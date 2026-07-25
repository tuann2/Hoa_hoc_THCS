import { expect, installSupabaseMock, test } from './fixtures';

function progressSnapshot(totalXp: number, localOnlyLessonXp = 0) {
  const lessonProgress: Record<string, unknown> = {
    'n1-l1': {
      theory: { completed: true, accuracy: 100, bestXp: totalXp },
      practice: { completed: true, accuracy: 100, bestXp: 0 },
      completed: true,
      stars: 3,
      bestAccuracy: 100,
      bestXp: totalXp,
      completedAt: '2026-07-17T00:00:00.000Z'
    }
  };

  if (localOnlyLessonXp > 0) {
    lessonProgress['n1-l2'] = {
      theory: { completed: true, accuracy: 100, bestXp: localOnlyLessonXp },
      practice: { completed: false, accuracy: 0, bestXp: 0 },
      completed: false,
      stars: 1,
      bestAccuracy: 100,
      bestXp: localOnlyLessonXp,
      completedAt: '2026-07-17T00:00:00.000Z'
    };
  }

  return {
    totalXp: totalXp + localOnlyLessonXp,
    streakCurrent: 1,
    streakLongest: 1,
    lastStudyDate: '2026-07-17',
    lastMutationAt: '2026-07-17T00:00:00.000Z',
    lessonProgress,
    unlockedLessonIds: ['n1-l1'],
    wrongQuestions: {},
    examHistory: []
  };
}

test('sign-in merges and pushes per user, then sign-out never mixes users', async ({
  page
}) => {
  await page.unroute('https://example.supabase.co/**');
  const mock = await installSupabaseMock(page, {
    progress: {
      'user-alice': progressSnapshot(10),
      'user-bob': progressSnapshot(1)
    }
  });
  await page.addInitScript(
    (snapshot) => {
      if (!localStorage.getItem('hhthcs-progress')) {
        localStorage.setItem(
          'hhthcs-progress',
          JSON.stringify({ state: snapshot, version: 5 })
        );
      }
    },
    progressSnapshot(5, 5)
  );

  await page.goto('/auth');
  await page.getByLabel('Email').fill('alice@example.com');
  await page.getByLabel('Mật khẩu').fill('alice-password');
  await page
    .getByRole('button', { name: 'Đăng nhập', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole('heading', { name: 'Tiến độ của Alice' })
  ).toBeVisible();
  await expect
    .poll(() =>
      mock.requests.some(
        (request) =>
          request.method === 'POST' && request.url.includes('/rest/v1/progress')
      )
    )
    .toBeTruthy();
  await expect(
    page.locator('article').filter({ hasText: 'Tổng XP' }).getByText('15', {
      exact: true
    })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(
    page.getByRole('heading', { name: 'Tiến độ của em' })
  ).toBeVisible();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Đăng nhập để lưu tiến độ' })
    .click();
  await page.getByLabel('Email').fill('bob@example.com');
  await page.getByLabel('Mật khẩu').fill('bob-password');
  await page
    .getByRole('button', { name: 'Đăng nhập', exact: true })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Tiến độ của Bob' })
  ).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: 'Tổng XP' }).getByText('1', {
      exact: true
    })
  ).toBeVisible();

  const progressWrites = mock.requests.filter(
    (request) =>
      request.method === 'POST' && request.url.includes('/rest/v1/progress')
  );
  expect(
    progressWrites.map(
      (request) => (request.body as { user_id?: string })?.user_id
    )
  ).toEqual(['user-alice', 'user-bob']);
});
