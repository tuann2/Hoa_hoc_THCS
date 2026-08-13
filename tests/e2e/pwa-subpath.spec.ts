import { expect, test } from './fixtures';

const basePath = '/Hoa_hoc_THCS/';

test('@pwa subpath manifest, service worker, and offline navigation', async ({
  context,
  page
}) => {
  await page.goto(basePath);

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const href = link?.getAttribute('href') ?? '';
    const response = await fetch(href);
    return {
      href,
      data: (await response.json()) as {
        start_url?: string;
        scope?: string;
      }
    };
  });

  expect(manifest.href).toBe(`${basePath}manifest.webmanifest`);
  expect(manifest.data.start_url).toBe(basePath);
  expect(manifest.data.scope).toBe(basePath);
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean(await navigator.serviceWorker?.getRegistration())
      )
    )
    .toBe(true);

  // Chờ precache hoàn tất trước khi ngắt mạng; đăng ký SW xong chưa đồng
  // nghĩa cache đã sẵn sàng cho offline navigation.
  await expect(page.getByText('Đã sẵn sàng học offline.')).toBeVisible({
    timeout: 20_000
  });

  const learnPath = `${basePath}learn/n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc/n1-l1/theory`;
  const referencePath = `${basePath}tra-cuu`;
  await page.goto(learnPath);
  await expect(
    page.getByRole('heading', { name: /Chất – hỗn hợp/ })
  ).toBeVisible();

  await context.setOffline(true);
  const offlineRoutes = [
    { path: basePath, heading: /Lộ trình ôn Hoá học/ },
    { path: learnPath, heading: /Chất – hỗn hợp/ },
    { path: referencePath, heading: /Bảng tuần hoàn, tính tan và hằng số/ }
  ];
  for (const route of offlineRoutes) {
    await page.goto(route.path);
    await expect(
      page.getByRole('heading', { name: route.heading })
    ).toBeVisible();
  }
  await context.setOffline(false);
});
