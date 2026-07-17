import { expect, test, type Page } from './fixtures';

interface PersistedProgress {
  state: {
    totalXp: number;
  };
}

async function answerCurrentLessonQuestion(page: Page) {
  const answerOption = page.getByTestId('answer-option').first();
  const checkboxes = page.locator('main input[type="checkbox"]:visible');
  const textInputs = page.locator('main input:not([type="checkbox"]):visible');

  if (await answerOption.count()) {
    await answerOption.click();
  } else if (await checkboxes.count()) {
    await checkboxes.first().check();
  } else if (await textInputs.count()) {
    for (let index = 0; index < (await textInputs.count()); index += 1) {
      await textInputs.nth(index).fill('1');
    }
  } else {
    throw new Error('Không tìm thấy control trả lời câu hỏi học.');
  }
  await page.getByRole('button', { name: 'Kiểm tra' }).click();
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
}

test('render catalog, đổi phần và mở lesson đúng unit', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Lộ trình ôn Hoá học/ })
  ).toBeVisible();
  await expect(page.getByText('A1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hữu cơ' }).click();
  await expect(page.getByText('B1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Vô cơ' }).click();
  await page.getByRole('link', { name: /Chất – hỗn hợp/ }).click();
  await expect(page).toHaveURL(/\/learn\/a1-nen-tang-hoa-hoc\/a1-l1\/theory/);
  await expect(page.getByText('Đang tải bài học…')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: /Chất – hỗn hợp/ })
  ).toBeVisible();
});

test('XP and stars are persisted after completing a lesson and reloading', async ({
  page
}) => {
  await page.goto('/learn/a1-nen-tang-hoa-hoc/a1-l1/theory');
  const nextCard = page.getByRole('button', { name: 'Thẻ tiếp theo' });
  const finishTheory = page.getByRole('button', {
    name: 'Hoàn thành lý thuyết'
  });
  await expect(nextCard.or(finishTheory)).toBeVisible();
  while (!(await finishTheory.isVisible())) {
    await nextCard.click();
  }
  await finishTheory.click();

  await expect(page.getByRole('button', { name: 'Kiểm tra' })).toBeVisible();
  while (await page.getByRole('button', { name: 'Kiểm tra' }).count()) {
    await answerCurrentLessonQuestion(page);
  }

  await expect(
    page.getByRole('heading', { name: 'Em đã xong lượt luyện này' })
  ).toBeVisible();
  await expect(
    page.getByText('Hoàn thành bài học', { exact: true })
  ).toBeVisible();
  const earnedXpValue = page
    .locator('article')
    .filter({ hasText: 'XP nhận được' })
    .getByText(/^\+\d+$/);
  await expect(earnedXpValue).toBeVisible();
  const earnedXp = Number((await earnedXpValue.textContent())?.slice(1));
  expect(earnedXp).toBeGreaterThan(0);
  const persistedBeforeReload = await page.evaluate(() => {
    const raw = localStorage.getItem('hhthcs-progress');
    return raw ? (JSON.parse(raw) as PersistedProgress) : null;
  });
  expect(persistedBeforeReload?.state.totalXp).toBe(earnedXp);
  await page.reload();
  await page.goto('/profile');
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Tổng XP' })
      .getByText(String(earnedXp), { exact: true })
  ).toBeVisible();
  await page.goto('/');
  await expect(page.getByText(/[1-3]★/)).toBeVisible();
});
