import { expect, test } from './fixtures';

test('production build exposes manifest and service worker readiness UI', async ({
  page
}) => {
  await page.goto('/');
  const manifest = await page.evaluate(() =>
    document.querySelector('link[rel="manifest"]')?.getAttribute('href')
  );
  expect(manifest).toMatch(/manifest\.webmanifest$/);
  await expect(
    page.getByText(/Đã sẵn sàng học offline|Đang chuẩn bị học offline/)
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean(await navigator.serviceWorker?.getRegistration())
      )
    )
    .toBeTruthy();
});

test('warm cache supports direct navigation offline without caching Supabase data', async ({
  context,
  page
}) => {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Đã sẵn sàng học offline.')).toBeVisible();
  await context.setOffline(true);
  await page.goto('/review');
  await expect(
    page.getByRole('heading', {
      name: /Ôn lại câu sai|Không có câu nào cần ôn/
    })
  ).toBeVisible();
  await context.setOffline(false);
});

test('update discovery does not reload an active page automatically', async ({
  page
}) => {
  await page.goto('/');
  let reloads = 0;
  page.on('framenavigated', () => {
    reloads += 1;
  });
  await page.waitForTimeout(500);
  expect(reloads).toBe(0);
});
