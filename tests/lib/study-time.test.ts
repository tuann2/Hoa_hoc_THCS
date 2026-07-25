import { describe, expect, it } from 'vitest';
import {
  canRecordStudyTime,
  STUDY_IDLE_TIMEOUT_MS
} from '../../src/lib/studyTime';

const base = {
  isConfigured: true,
  isFocused: true,
  isOnline: true,
  isVisible: true,
  lastInteractionAt: 1_000,
  now: 1_000,
  scopeActive: true,
  userId: 'user-1'
};

describe('study time eligibility', () => {
  it('chỉ chạy heartbeat khi mọi điều kiện foreground/online/scope hợp lệ', () => {
    expect(canRecordStudyTime(base)).toBe(true);
    expect(canRecordStudyTime({ ...base, isOnline: false })).toBe(false);
    expect(canRecordStudyTime({ ...base, isVisible: false })).toBe(false);
    expect(canRecordStudyTime({ ...base, isFocused: false })).toBe(false);
    expect(canRecordStudyTime({ ...base, scopeActive: false })).toBe(false);
    expect(canRecordStudyTime({ ...base, userId: null })).toBe(false);
  });

  it('dừng đúng tại ngưỡng idle 5 phút', () => {
    expect(
      canRecordStudyTime({
        ...base,
        now: base.lastInteractionAt + STUDY_IDLE_TIMEOUT_MS - 1
      })
    ).toBe(true);
    expect(
      canRecordStudyTime({
        ...base,
        now: base.lastInteractionAt + STUDY_IDLE_TIMEOUT_MS
      })
    ).toBe(false);
  });
});
