begin;

revoke all on function public.record_study_heartbeat() from public, anon, authenticated, service_role;
drop function if exists public.record_study_heartbeat();

drop policy if exists "progress_select_admin_read_only" on public.progress;
drop policy if exists "profiles_select_admin_read_only" on public.profiles;
drop policy if exists "study_daily_totals_select_own_or_admin" on public.study_daily_totals;
drop policy if exists "admin_users_select_own" on public.admin_users;

drop table if exists public.study_daily_totals;
drop table if exists public.study_tracking_state;
drop table if exists public.admin_users;

commit;
