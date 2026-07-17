import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyPwaUpdate,
  initializePwa,
  resetPwaForTests,
  setPwaSessionActive
} from '../../src/lib/pwa';

const { updateMock, registerMock } = vi.hoisted(() => ({
  updateMock: vi.fn(async () => {}),
  registerMock: vi.fn(() => updateMock)
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerMock
}));

describe('PWA update safety', () => {
  beforeEach(() => {
    resetPwaForTests();
    updateMock.mockClear();
    registerMock.mockClear();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {}
    });
  });

  it('defers worker activation while a lesson or exam session is active', async () => {
    initializePwa();
    setPwaSessionActive(true);

    await applyPwaUpdate();

    expect(updateMock).not.toHaveBeenCalled();

    setPwaSessionActive(false);
    await applyPwaUpdate();

    expect(updateMock).toHaveBeenCalledOnce();
  });
});
