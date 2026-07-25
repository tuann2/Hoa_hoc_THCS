import { supabase } from './supabase';

export const STUDY_HEARTBEAT_INTERVAL_MS = 30_000;
export const STUDY_IDLE_TIMEOUT_MS = 5 * 60_000;

export interface StudyTrackingEligibility {
  isConfigured: boolean;
  isFocused: boolean;
  isOnline: boolean;
  isVisible: boolean;
  lastInteractionAt: number;
  now: number;
  scopeActive: boolean;
  userId: string | null;
}

export function canRecordStudyTime(
  eligibility: StudyTrackingEligibility
): boolean {
  return (
    eligibility.isConfigured &&
    Boolean(eligibility.userId) &&
    eligibility.scopeActive &&
    eligibility.isOnline &&
    eligibility.isVisible &&
    eligibility.isFocused &&
    eligibility.now - eligibility.lastInteractionAt < STUDY_IDLE_TIMEOUT_MS
  );
}

/**
 * The RPC receives no client-supplied date or duration. The expected user id
 * binds a queued heartbeat to the current account before it leaves the SPA.
 */
export async function recordStudyHeartbeat(
  expectedUserId: string | null,
  currentUserId: string | null
): Promise<boolean> {
  if (!supabase || !expectedUserId || expectedUserId !== currentUserId) {
    return false;
  }

  try {
    const { error } = await supabase.rpc('record_study_heartbeat');
    return !error;
  } catch {
    // Tracking is intentionally best-effort: learning and offline progress
    // must continue if the telemetry request cannot be sent.
    return false;
  }
}
