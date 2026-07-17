import { expect, test } from './fixtures';

test('render catalog, đổi phần và mở lesson đúng unit', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Lộ trình ôn Hoá học/ })
  ).toBeVisible();
  await expect(page.getByText('A1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hữu cơ' }).click();
  await expect(page.getByText('B1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Vô cơ' }).click();
  const firstLesson = page.getByRole('link', { name: /Chất – hỗn hợp/ });
  await firstLesson.click();
  await expect(page).toHaveURL(/\/learn\/a1-nen-tang-hoa-hoc\/a1-l1\/theory/);
  await expect(page.getByText('Đang tải bài học…')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: /Chất – hỗn hợp/ })
  ).toBeVisible();
});

test('local progress survives reload without a remote account', async ({
  page
}) => {
  await page.goto('/learn/a1-nen-tang-hoa-hoc/a1-l1/theory');
  await expect(
    page.getByRole('heading', { name: /Chất – hỗn hợp/ })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Chất – hỗn hợp/ })
  ).toBeVisible();
});
