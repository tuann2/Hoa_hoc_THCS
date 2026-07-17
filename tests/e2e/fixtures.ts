import { test as base, expect, type Page } from '@playwright/test';

async function mockSupabase(page: Page) {
  await page.route('https://example.supabase.co/**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]'
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}'
    });
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await mockSupabase(page);
    await use(page);
  }
});

export { expect };
