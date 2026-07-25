import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/0002_admin_reporting.sql'),
  'utf8'
);
const rollback = readFileSync(
  resolve('supabase/rollbacks/0002_admin_reporting_rollback.sql'),
  'utf8'
);

describe('FEATURE-016 SQL security contract', () => {
  it('giữ own-read policies và thêm policy admin chỉ-select tách biệt', () => {
    expect(migration).toContain('profiles_select_admin_read_only');
    expect(migration).toContain('progress_select_admin_read_only');
    expect(migration).not.toMatch(/drop policy[^;]*profiles_select_own/i);
    expect(migration).not.toMatch(/drop policy[^;]*progress_select_own/i);
    expect(migration).toMatch(/for select\s+to authenticated/i);
  });

  it('không cấp tracking state trực tiếp cho authenticated và RPC dùng grant tối thiểu', () => {
    expect(migration).toContain(
      'revoke all on table public.study_tracking_state from public, anon, authenticated;'
    );
    expect(migration).not.toMatch(
      /grant\s+[^;]*on table public\.study_tracking_state to authenticated/i
    );
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain(
      'grant execute on function public.record_study_heartbeat() to authenticated;'
    );
    expect(migration).toContain(
      'revoke all on function public.record_study_heartbeat() from public, anon, authenticated, service_role;'
    );
  });

  it('rollback thu hồi RPC rồi bỏ policy/bảng mới mà không động tới policy own', () => {
    expect(rollback.indexOf('revoke all on function')).toBeLessThan(
      rollback.indexOf('drop function')
    );
    expect(rollback).toContain(
      'drop policy if exists "profiles_select_admin_read_only"'
    );
    expect(rollback).toContain(
      'drop table if exists public.study_daily_totals;'
    );
    expect(rollback).not.toContain('profiles_select_own');
    expect(rollback).not.toContain('progress_select_own');
  });
});
