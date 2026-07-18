import { expect, test } from './fixtures';

interface PersistedReviewState {
  wrongQuestions: Record<string, { resolvedAt?: string }>;
}

function reviewSnapshot() {
  return {
    totalXp: 0,
    streakCurrent: 0,
    streakLongest: 0,
    lastStudyDate: null,
    lastMutationAt: '2026-07-17T00:00:00.000Z',
    lessonProgress: {},
    unlockedLessonIds: ['a1-l1'],
    wrongQuestions: {
      'a1-nen-tang-hoa-hoc::a1-l1::a1-l1-q1': {
        unitId: 'a1-nen-tang-hoa-hoc',
        lessonId: 'a1-l1',
        questionId: 'a1-l1-q1',
        missCount: 1,
        lastMissedAt: '2026-07-17T00:00:00.000Z'
      },
      'a1-nen-tang-hoa-hoc::a1-l1::a1-l1-q2': {
        unitId: 'a1-nen-tang-hoa-hoc',
        lessonId: 'a1-l1',
        questionId: 'a1-l1-q2',
        missCount: 1,
        lastMissedAt: '2026-07-16T00:00:00.000Z'
      }
    },
    examHistory: []
  };
}

test('review resolves a correct answer and keeps a wrong answer queued', async ({
  page
}) => {
  await page.addInitScript((snapshot) => {
    if (!localStorage.getItem('hhthcs-progress')) {
      localStorage.setItem(
        'hhthcs-progress',
        JSON.stringify({ state: snapshot, version: 4 })
      );
    }
  }, reviewSnapshot());
  await page.goto('/review');

  await expect(
    page.getByText('Chất nào sau đây là chất tinh khiết?')
  ).toBeVisible();
  await page.getByRole('button', { name: 'nước cất' }).click();
  await page.getByRole('button', { name: 'Kiểm tra' }).click();
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();

  await expect(
    page.getByText('Trong nguyên tử, hạt nào mang điện tích dương?')
  ).toBeVisible();
  await page.getByRole('button', { name: 'electron', exact: true }).click();
  await page.getByRole('button', { name: 'Kiểm tra' }).click();
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
  await expect(page.getByText('Em đã xong lượt ôn này')).toBeVisible();

  const persisted = await page.evaluate(() => {
    const value = JSON.parse(
      localStorage.getItem('hhthcs-progress') ?? '{}'
    ) as { state: PersistedReviewState };
    return value.state;
  });
  expect(
    persisted.wrongQuestions['a1-nen-tang-hoa-hoc::a1-l1::a1-l1-q1'].resolvedAt
  ).toEqual(expect.any(String));
  // App ghi resolvedAt: null cho câu chưa resolve (store/progress.ts:741)
  expect(
    persisted.wrongQuestions['a1-nen-tang-hoa-hoc::a1-l1::a1-l1-q2'].resolvedAt
  ).toBeFalsy();
});
