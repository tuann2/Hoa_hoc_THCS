import { expect, test } from './fixtures';

test('exam config loads catalog scopes and creates a production-build session', async ({
  page
}) => {
  await page.goto('/exam');
  await expect(
    page.getByRole('heading', {
      name: 'Tạo đề luyện tập theo phạm vi em muốn'
    })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu thi' }).click();
  await expect(page.getByRole('button', { name: '✕ Thoát' })).toBeVisible();
});
