import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from './fixtures';

async function startRevisionServer() {
  const distDirectory = resolve(process.cwd(), 'dist');
  const originalServiceWorker = await readFile(resolve(distDirectory, 'sw.js'));
  const revisedServiceWorker = Buffer.concat([
    originalServiceWorker,
    Buffer.from('\n// simulated waiting-worker revision')
  ]);
  let serveRevision = false;
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  const server = createServer((request, response) => {
    void (async () => {
      const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
      const filePath = resolve(distDirectory, relativePath);
      let servedPath = filePath;
      const body =
        pathname === '/sw.js' && serveRevision
          ? revisedServiceWorker
          : await readFile(filePath).catch(() => {
              servedPath = resolve(distDirectory, 'index.html');
              return readFile(servedPath);
            });
      const extension = servedPath.slice(servedPath.lastIndexOf('.'));

      response.statusCode = 200;
      response.setHeader(
        'Content-Type',
        contentTypes[extension] ?? 'application/octet-stream'
      );
      response.end(body);
    })().catch(() => {
      response.statusCode = 500;
      response.end();
    });
  });

  await new Promise<void>((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveServer());
  });
  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Không lấy được cổng máy chủ PWA test.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    enableRevision() {
      serveRevision = true;
    },
    close() {
      return new Promise<void>((resolveServer, reject) => {
        server.close((error) => (error ? reject(error) : resolveServer()));
      });
    }
  };
}

test.describe('@pwa', () => {
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

  test('warm cache supports direct navigation offline and contains no Supabase/Auth responses', async ({
    context,
    page
  }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Đã sẵn sàng học offline.')).toBeVisible();
    const cachedUrls = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const entries = await Promise.all(
        cacheNames.map(async (name) => (await caches.open(name)).keys())
      );
      return entries.flat().map((request) => request.url);
    });
    expect(
      cachedUrls.some((url) =>
        /example\.supabase\.co|\/auth\/v1|\/rest\/v1|\/supabase/i.test(url)
      )
    ).toBe(false);

    await context.setOffline(true);
    const offlineRoutes = [
      { path: '/', heading: /Lộ trình ôn Hoá học/ },
      {
        path: '/learn/n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc/n1-l1/theory',
        heading: /Chất – hỗn hợp/
      },
      { path: '/review', heading: /Ôn lại câu sai|Không có câu nào cần ôn/ },
      { path: '/exam', heading: /Tạo đề luyện tập theo phạm vi em muốn/ },
      { path: '/profile', heading: /Tiến độ của em/ },
      { path: '/auth', heading: /^Đăng nhập$/ }
    ];

    for (const route of offlineRoutes) {
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { name: route.heading })
      ).toBeVisible();
    }

    // Gỡ mock Supabase của fixture trước khi assert: route interception
    // hoạt động cả khi offline nên fetch sẽ được mock trả lời thay vì
    // chứng minh SW không phục vụ Supabase từ cache.
    await page.unroute('https://example.supabase.co/**');
    await expect(
      page.evaluate(async () => {
        await fetch('https://example.supabase.co/rest/v1/progress');
        return true;
      })
    ).rejects.toThrow();
    await context.setOffline(false);
  });

  test('waiting worker defers update during a lesson and activates at a safe point', async ({
    page
  }) => {
    const server = await startRevisionServer();
    const appUrl = `${server.baseUrl}/`;

    try {
      await page.goto(
        `${server.baseUrl}/learn/n1-nguyen-tu-nguyen-to-cong-thuc-hoa-hoc/n1-l1/theory`
      );
      await expect(
        page.getByRole('heading', { name: /Chất – hỗn hợp/ })
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            async () =>
              (await navigator.serviceWorker.getRegistration())?.active
                ?.state === 'activated'
          )
        )
        .toBe(true);

      // Reload để trang bị SW cũ control; nếu không, worker mới sẽ activate
      // ngay (không có client bị control) thay vì vào trạng thái waiting.
      await page.reload();
      await expect(
        page.getByRole('heading', { name: /Chất – hỗn hợp/ })
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => Boolean(navigator.serviceWorker.controller))
        )
        .toBe(true);

      server.enableRevision();
      await page.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration())?.update();
      });
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const registration =
                await navigator.serviceWorker.getRegistration();
              return {
                installing: Boolean(registration?.installing),
                waiting: Boolean(registration?.waiting)
              };
            }),
          { timeout: 20_000 }
        )
        .toMatchObject({ waiting: true });
      await expect(
        page.getByText(/Nút cập nhật sẽ hiện sau khi em kết thúc phiên học/)
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Cập nhật khi sẵn sàng' })
      ).toHaveCount(0);

      await page.goto(appUrl);
      await expect(
        page.getByRole('button', { name: 'Cập nhật khi sẵn sàng' })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Cập nhật khi sẵn sàng' }).click();
      // Click cập nhật kích hoạt worker mới + reload một lần; evaluate có thể
      // bị huỷ giữa chừng bởi chính navigation đó nên phải retry.
      await expect
        .poll(async () => {
          try {
            return await page.evaluate(async () =>
              Boolean(
                (await navigator.serviceWorker.getRegistration())?.waiting
              )
            );
          } catch {
            // Fail-safe: exception (navigation đang diễn ra) phải trả true để
            // poll retry; trả false sẽ pass assertion ngay cả khi evaluate
            // hỏng vĩnh viễn.
            return true;
          }
        })
        .toBe(false);
      await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    } finally {
      await server.close();
    }
  });
});
