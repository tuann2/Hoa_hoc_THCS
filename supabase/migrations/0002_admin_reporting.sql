begin;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.study_tracking_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_heartbeat_at timestamptz not null
);

create table public.study_daily_totals (
  user_id uuid not null references auth.users (id) on delete cascade,
  study_date date not null,
  active_seconds integer not null default 0 check (active_seconds between 0 and 86400),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, study_date)
);

alter table public.admin_users enable row level security;
alter table public.study_tracking_state enable row level security;
alter table public.study_daily_totals enable row level security;

revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.study_tracking_state from public, anon, authenticated;
revoke all on table public.study_daily_totals from public, anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select on table public.study_daily_totals to authenticated;
grant all on table public.admin_users to service_role;
grant all on table public.study_tracking_state to service_role;
grant all on table public.study_daily_totals to service_role;

create policy "admin_users_select_own"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "study_daily_totals_select_own_or_admin"
on public.study_daily_totals
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

-- These are additional permissive SELECT policies. Do not alter or drop the
-- existing *_select_own policies from 0001: students must retain own-row read.
create policy "profiles_select_admin_read_only"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create policy "progress_select_admin_read_only"
on public.progress
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create function public.record_study_heartbeat()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_now timestamptz;
  v_previous timestamptz;
  v_inserted integer;
  v_gap_seconds double precision;
  v_total_seconds integer;
  v_previous_date date;
  v_current_date date;
  v_next_midnight_local timestamp;
  v_old_day_seconds integer;
  v_new_day_seconds integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required to record study time'
      using errcode = '42501';
  end if;

  -- A transaction-scoped lock serializes both the first insert and later
  -- heartbeats for one account. The database clock is deliberately read only
  -- after acquiring this lock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );
  v_now := pg_catalog.clock_timestamp();

  insert into public.study_tracking_state (user_id, last_heartbeat_at)
  values (v_user_id, v_now)
  on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;

  select last_heartbeat_at
  into v_previous
  from public.study_tracking_state
  where user_id = v_user_id
  for update;

  -- The first heartbeat is a marker only and contributes no duration.
  if v_inserted = 1 then
    return;
  end if;

  v_gap_seconds := extract(epoch from (v_now - v_previous));

  -- Always resynchronize the marker. Gaps outside the valid interval are not
  -- added to totals; a sub-second call similarly does not write a total row.
  update public.study_tracking_state
  set last_heartbeat_at = v_now
  where user_id = v_user_id;

  if v_gap_seconds < 1 or v_gap_seconds > 60 then
    return;
  end if;

  v_total_seconds := pg_catalog.floor(v_gap_seconds)::integer;
  v_previous_date := (v_previous at time zone 'Asia/Ho_Chi_Minh')::date;
  v_current_date := (v_now at time zone 'Asia/Ho_Chi_Minh')::date;

  if v_previous_date = v_current_date then
    insert into public.study_daily_totals (
      user_id,
      study_date,
      active_seconds,
      updated_at
    )
    values (v_user_id, v_current_date, v_total_seconds, v_now)
    on conflict (user_id, study_date) do update
    set
      active_seconds = least(
        86400,
        public.study_daily_totals.active_seconds + excluded.active_seconds
      ),
      updated_at = excluded.updated_at;
    return;
  end if;

  v_next_midnight_local := (v_previous_date + 1)::timestamp;
  v_old_day_seconds := least(
    v_total_seconds,
    greatest(
      0,
      pg_catalog.floor(
        extract(
          epoch
          from (
            v_next_midnight_local - (v_previous at time zone 'Asia/Ho_Chi_Minh')
          )
        )
      )::integer
    )
  );
  v_new_day_seconds := v_total_seconds - v_old_day_seconds;

  if v_old_day_seconds > 0 then
    insert into public.study_daily_totals (
      user_id,
      study_date,
      active_seconds,
      updated_at
    )
    values (v_user_id, v_previous_date, v_old_day_seconds, v_now)
    on conflict (user_id, study_date) do update
    set
      active_seconds = least(
        86400,
        public.study_daily_totals.active_seconds + excluded.active_seconds
      ),
      updated_at = excluded.updated_at;
  end if;

  if v_new_day_seconds > 0 then
    insert into public.study_daily_totals (
      user_id,
      study_date,
      active_seconds,
      updated_at
    )
    values (v_user_id, v_current_date, v_new_day_seconds, v_now)
    on conflict (user_id, study_date) do update
    set
      active_seconds = least(
        86400,
        public.study_daily_totals.active_seconds + excluded.active_seconds
      ),
      updated_at = excluded.updated_at;
  end if;
end;
$$;

revoke all on function public.record_study_heartbeat() from public, anon, authenticated, service_role;
grant execute on function public.record_study_heartbeat() to authenticated;

commit;
