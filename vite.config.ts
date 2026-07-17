import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function spaFallback404(): Plugin {
  let outDir = '';

  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    }
  };
}

const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/pwa-192.png',
        'icons/pwa-512.png',
        'icons/pwa-maskable-512.png'
      ],
      manifest: {
        id: base,
        name: 'Hoá học THCS',
        short_name: 'Hoá học THCS',
        description:
          'Ôn luyện Hoá học THCS theo lộ trình, dùng được khi offline.',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#075b63',
        background_color: '#f7fbf9',
        icons: [
          {
            src: `${base}icons/pwa-192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${base}icons/pwa-512.png`,
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: `${base}icons/pwa-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false
      }
    }),
    spaFallback404()
  ],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 500
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/.git/**', 'tests/e2e/**'],
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
