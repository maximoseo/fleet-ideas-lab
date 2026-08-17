-- Durable login throttling + fixed-window rate buckets.
--
-- Applied to project uppeyaxnksjyphpclazl on 2026-08-17.
-- Kept in the repo so the schema is reproducible: before this, the whole
-- database schema existed only in the Supabase dashboard.
--
-- Why: the login limiter lived in a per-instance JS Map. On Vercel every
-- lambda holds its own copy, so an attempt that landed on a cold instance
-- started counting from zero. The limiter looked present and did very little.

create table if not exists public.fil_login_throttle (
  key text primary key,
  fails integer not null default 0,
  first_fail_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.fil_login_throttle enable row level security;
create index if not exists fil_login_throttle_updated_at_idx
  on public.fil_login_throttle (updated_at);

create table if not exists public.fil_rate_buckets (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.fil_rate_buckets enable row level security;
create index if not exists fil_rate_buckets_reset_at_idx
  on public.fil_rate_buckets (reset_at);

-- Atomic failure recording. The window and lock maths run in SQL so two
-- concurrent lambdas cannot both read "9 fails" and both write "10".
create or replace function public.fil_record_login_failure(
  p_key text,
  p_window_ms integer,
  p_max_fails integer,
  p_base_lock_ms integer,
  p_max_lock_ms integer
) returns table (out_fails integer, out_locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_fails integer;
  v_first timestamptz;
  v_lock_ms bigint;
  v_locked timestamptz;
begin
  insert into public.fil_login_throttle as t (key, fails, first_fail_at, locked_until, updated_at)
    values (p_key, 1, v_now, null, v_now)
  on conflict (key) do update
    set fails = case
          when v_now - t.first_fail_at > make_interval(secs => p_window_ms / 1000.0) then 1
          else t.fails + 1
        end,
        first_fail_at = case
          when v_now - t.first_fail_at > make_interval(secs => p_window_ms / 1000.0) then v_now
          else t.first_fail_at
        end,
        updated_at = v_now
  returning t.fails, t.first_fail_at into v_fails, v_first;

  if v_fails >= p_max_fails then
    v_lock_ms := least(
      p_base_lock_ms::bigint * power(2, floor((v_fails - p_max_fails) / 5.0))::bigint,
      p_max_lock_ms::bigint
    );
    v_locked := v_now + make_interval(secs => v_lock_ms / 1000.0);
    update public.fil_login_throttle set locked_until = v_locked where key = p_key;
  else
    select locked_until into v_locked from public.fil_login_throttle where key = p_key;
  end if;

  out_fails := v_fails;
  out_locked_until := v_locked;
  return next;
end;
$$;

-- Atomic fixed-window counter. Returns the count AFTER this hit.
create or replace function public.fil_bucket_hit(
  p_key text,
  p_window_ms integer
) returns table (out_count integer, out_reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  insert into public.fil_rate_buckets as b (key, count, reset_at, updated_at)
    values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0), v_now)
  on conflict (key) do update
    set count = case when v_now > b.reset_at then 1 else b.count + 1 end,
        reset_at = case
          when v_now > b.reset_at then v_now + make_interval(secs => p_window_ms / 1000.0)
          else b.reset_at
        end,
        updated_at = v_now
  returning b.count, b.reset_at into out_count, out_reset_at;
  return next;
end;
$$;

revoke all on function public.fil_record_login_failure(text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.fil_bucket_hit(text, integer) from public, anon, authenticated;
