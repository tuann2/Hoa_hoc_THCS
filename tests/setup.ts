import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Node >= 22 khai báo sẵn global `localStorage` (experimental, là `undefined`
// khi không bật cờ --experimental-webstorage) và trong môi trường vitest/jsdom
// nó đè lên localStorage của jsdom. Polyfill một Storage in-memory để store
// tiến độ và các test hoạt động như trên trình duyệt thật.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage?.clear !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true
  });
}
