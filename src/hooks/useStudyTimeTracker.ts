import { useEffect, useRef, useState } from 'react';
import {
  canRecordStudyTime,
  recordStudyHeartbeat,
  STUDY_HEARTBEAT_INTERVAL_MS,
  STUDY_IDLE_TIMEOUT_MS
} from '../lib/studyTime';
import { getAuthStore } from '../store/auth';

interface UseStudyTimeTrackerOptions {
  /** True only while the learner is actively on a lesson/review/running exam. */
  scopeActive: boolean;
}

function browserIsOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function browserIsVisible() {
  return (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  );
}

function browserIsFocused() {
  return typeof document === 'undefined' || document.hasFocus();
}

/**
 * Records only foreground, recently-interacted-with learning time. Server-side
 * RPC logic remains the authority for timestamps, gap limits and aggregation.
 */
export function useStudyTimeTracker({
  scopeActive
}: UseStudyTimeTrackerOptions) {
  const authStore = getAuthStore();
  const userId = authStore((state) => state.user?.id ?? null);
  const isConfigured = authStore((state) => state.isConfigured);
  const [environmentVersion, setEnvironmentVersion] = useState(0);
  const lastInteractionAt = useRef(0);
  const eligibleRef = useRef(false);
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    const refresh = () => setEnvironmentVersion((version) => version + 1);
    const markInteraction = () => {
      lastInteractionAt.current = Date.now();
      refresh();
    };

    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('blur', refresh);
    window.addEventListener('pointerdown', markInteraction);
    window.addEventListener('keydown', markInteraction);
    window.addEventListener('touchstart', markInteraction);
    window.addEventListener('scroll', markInteraction, { passive: true });
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('blur', refresh);
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      window.removeEventListener('touchstart', markInteraction);
      window.removeEventListener('scroll', markInteraction);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    if (scopeActive) {
      // Entering an activity is itself a user navigation action. It establishes
      // a server marker but never sends client-measured seconds.
      lastInteractionAt.current = Date.now();
      setEnvironmentVersion((version) => version + 1);
    }
  }, [scopeActive]);

  const isEligible = canRecordStudyTime({
    isConfigured,
    isFocused: browserIsFocused(),
    isOnline: browserIsOnline(),
    isVisible: browserIsVisible(),
    lastInteractionAt: lastInteractionAt.current,
    now: Date.now(),
    scopeActive,
    userId
  });

  useEffect(() => {
    const send = () =>
      recordStudyHeartbeat(userId, getAuthStore().getState().user?.id ?? null);

    if (!isEligible) {
      if (eligibleRef.current && browserIsOnline()) {
        // One best-effort final marker before stopping, without queueing while
        // offline or attempting a later backfill.
        void send();
      }
      eligibleRef.current = false;
      return;
    }

    eligibleRef.current = true;
    void send();

    const heartbeatTimer = window.setInterval(() => {
      const stillEligible = canRecordStudyTime({
        isConfigured,
        isFocused: browserIsFocused(),
        isOnline: browserIsOnline(),
        isVisible: browserIsVisible(),
        lastInteractionAt: lastInteractionAt.current,
        now: Date.now(),
        scopeActive,
        userId: userIdRef.current
      });

      if (!stillEligible) {
        setEnvironmentVersion((version) => version + 1);
        return;
      }

      void send();
    }, STUDY_HEARTBEAT_INTERVAL_MS);
    const idleDelay = Math.max(
      0,
      lastInteractionAt.current + STUDY_IDLE_TIMEOUT_MS - Date.now()
    );
    const idleTimer = window.setTimeout(
      () => setEnvironmentVersion((version) => version + 1),
      idleDelay
    );

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearTimeout(idleTimer);
    };
  }, [environmentVersion, isConfigured, isEligible, scopeActive, userId]);

  useEffect(
    () => () => {
      if (eligibleRef.current && browserIsOnline()) {
        void recordStudyHeartbeat(
          userIdRef.current,
          getAuthStore().getState().user?.id ?? null
        );
      }
      eligibleRef.current = false;
    },
    []
  );
}
