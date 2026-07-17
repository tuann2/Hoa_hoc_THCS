import { expect, test } from './fixtures';

test('review route remains usable with an empty local queue', async ({
  page
}) => {
  await page.goto('/review');
  await expect(
    page.getByRole('heading', { name: 'Không có câu nào cần ôn' })
  ).toBeVisible();
});
