import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000/'
      }
    },
    setupFiles: './tests/setup.ts',
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
