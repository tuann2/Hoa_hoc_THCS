import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pwa-subpath.spec.ts',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['line']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174/Hoa_hoc_THCS/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    serviceWorkers: 'allow'
  },
  projects: [{ name: 'subpath', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort --outDir dist-subpath',
    url: 'http://127.0.0.1:4174/Hoa_hoc_THCS/',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // preview đọc base từ vite.config (process.env.VITE_BASE_PATH);
      // thiếu biến này server phục vụ ở base '/' và mọi URL subpath rơi
      // vào SPA fallback.
      VITE_BASE_PATH: '/Hoa_hoc_THCS/',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key-for-e2e'
    }
  }
});
