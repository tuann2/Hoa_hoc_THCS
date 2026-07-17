import { expect, test } from './fixtures';

test('auth boundary uses mocked Supabase and keeps unauthenticated state visible', async ({
  page
}) => {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await page.getByRole('link', { name: 'Lộ trình', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Chưa đăng nhập')).toBeVisible();
});
