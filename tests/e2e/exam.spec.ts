import { expect, test, type Page } from './fixtures';

async function answerCurrentExamQuestion(page: Page) {
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
    throw new Error('Không tìm thấy control trả lời câu hỏi thi.');
  }
  await page.getByRole('button', { name: 'Lưu & câu tiếp theo' }).click();
}

test('exam answers questions, grades, persists history, and times out on fake clock', async ({
  page
}) => {
  await page.clock.install({ time: new Date('2026-07-17T09:00:00.000Z') });
  await page.goto('/exam');
  await page.getByRole('button', { name: 'Bắt đầu thi' }).click();
  await expect(page.getByRole('button', { name: '✕ Thoát' })).toBeVisible();

  while (
    await page.getByRole('button', { name: 'Lưu & câu tiếp theo' }).count()
  ) {
    await answerCurrentExamQuestion(page);
  }

  await expect(page.getByText('Kết quả thi thử')).toBeVisible();
  const resultScore = page
    .locator('article')
    .filter({ hasText: 'Số câu đúng' })
    .getByText(/\d+\/\d+$/);
  await expect(resultScore).toBeVisible();
  const resultScoreText = (await resultScore.textContent())?.trim() ?? '';
  expect(resultScoreText).toMatch(/^\d+\/20$/);
  await page.getByRole('link', { name: 'Xem hồ sơ' }).click();
  const [correctCount] = resultScoreText.split('/');
  await expect(
    page.getByText(new RegExp(`^${correctCount}/20 câu đúng · \\d+%$`))
  ).toBeVisible();

  await page.goto('/exam');
  await page.getByRole('button', { name: 'Bắt đầu thi' }).click();
  await expect(page.getByText('Thời gian còn lại')).toBeVisible();
  // fastForward chỉ fire mỗi interval một lần; runFor mới mô phỏng đủ số tick 1s
  await page.clock.runFor(21 * 60 * 1000);
  await expect(page.getByText('Hết giờ, đề đã được nộp tự động')).toBeVisible();
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Số câu đúng' })
      .getByText(/^0\/20$/)
  ).toBeVisible();
});
