import { act, render } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { recordStudyHeartbeat } = vi.hoisted(() => ({
  recordStudyHeartbeat: vi.fn(() => Promise.resolve(true))
}));

vi.mock('../../src/lib/studyTime', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/lib/studyTime')
  >('../../src/lib/studyTime');
  return { ...actual, recordStudyHeartbeat };
});

import { useStudyTimeTracker } from '../../src/hooks/useStudyTimeTracker';
import { getAuthStore, resetAuthStoreForTests } from '../../src/store/auth';

function Tracker({ scopeActive }: { scopeActive: boolean }) {
  useStudyTimeTracker({ scopeActive });
  return null;
}

function learner(): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-07-24T00:00:00.000Z',
    id: 'learner-1',
    email: 'learner@example.com',
    user_metadata: {}
  } as User;
}

describe('useStudyTimeTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T03:00:00.000Z'));
    recordStudyHeartbeat.mockClear();
    resetAuthStoreForTests();
    getAuthStore().setState({
      isConfigured: true,
      user: learner()
    });
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gửi marker cuối khi mất visibility, focus hoặc scope lúc vẫn online', async () => {
    const { rerender } = render(<Tracker scopeActive />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledWith('learner-1', 'learner-1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden'
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(3);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(4);

    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(5);

    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(6);

    rerender(<Tracker scopeActive={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(7);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(7);
  });

  it('không gửi marker cuối khi mất eligibility vì offline', async () => {
    const { rerender } = render(<Tracker scopeActive />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    const callsAtIdle = recordStudyHeartbeat.mock.calls.length;
    expect(callsAtIdle).toBeGreaterThan(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(callsAtIdle);

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(callsAtIdle + 1);

    rerender(<Tracker scopeActive={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(callsAtIdle + 2);
  });

  it('không gửi marker cuối khi unmount lúc offline', async () => {
    const { unmount } = render(<Tracker scopeActive />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });
    unmount();

    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('gửi marker cuối khi unmount lúc vẫn online', async () => {
    const { unmount } = render(<Tracker scopeActive />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(1);

    unmount();

    expect(recordStudyHeartbeat).toHaveBeenCalledTimes(2);
    expect(recordStudyHeartbeat).toHaveBeenLastCalledWith(
      'learner-1',
      'learner-1'
    );
  });
});
