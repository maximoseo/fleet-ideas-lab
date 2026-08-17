-- Probe economics: daily rollup + retention + latency percentiles.
-- Applied to project uppeyaxnksjyphpclazl on 2026-08-17.
--
-- 38 targets every 15 minutes is ~3,650 rows a day. Measured: 5,054 rows /
-- 944 kB after 33 hours, so roughly 1.3M rows and ~250 MB a year against a
-- 500 MB tier. Raw rows are worth a month; after that the daily rollup answers
-- everything the UI asks.

create table if not exists public.fil_probe_daily (
  slug text not null,
  day date not null,
  probes integer not null,
  failures integer not null,
  p50_latency_ms integer,
  p95_latency_ms integer,
  max_latency_ms integer,
  primary key (slug, day)
);

alter table public.fil_probe_daily enable row level security;

create or replace function public.fil_rollup_probes(p_keep_days integer default 30)
returns table (out_rolled integer, out_deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rolled integer := 0;
  v_deleted integer := 0;
begin
  -- Never touches today: a day still in progress would be rolled up
  -- half-finished and then deleted.
  insert into public.fil_probe_daily (slug, day, probes, failures, p50_latency_ms, p95_latency_ms, max_latency_ms)
  select
    slug,
    (checked_at at time zone 'UTC')::date as day,
    count(*)::int,
    count(*) filter (where not ok)::int,
    percentile_disc(0.50) within group (order by latency_ms)::int,
    percentile_disc(0.95) within group (order by latency_ms)::int,
    max(latency_ms)::int
  from public.fil_probes
  where (checked_at at time zone 'UTC')::date < (now() at time zone 'UTC')::date
  group by slug, (checked_at at time zone 'UTC')::date
  on conflict (slug, day) do update
    set probes = excluded.probes,
        failures = excluded.failures,
        p50_latency_ms = excluded.p50_latency_ms,
        p95_latency_ms = excluded.p95_latency_ms,
        max_latency_ms = excluded.max_latency_ms;
  get diagnostics v_rolled = row_count;

  delete from public.fil_probes
  where checked_at < now() - make_interval(days => p_keep_days);
  get diagnostics v_deleted = row_count;

  out_rolled := v_rolled;
  out_deleted := v_deleted;
  return next;
end;
$$;

-- p95 is the number that says whether a dashboard is getting slower; an
-- average hides exactly the tail a user notices.
create or replace function public.fil_probe_latency(p_slug text default null, p_hours integer default 24)
returns table (slug text, probes bigint, p50_ms integer, p95_ms integer, max_ms integer)
language sql
security definer
set search_path = public
as $$
  select
    p.slug,
    count(*) as probes,
    percentile_disc(0.50) within group (order by p.latency_ms)::int as p50_ms,
    percentile_disc(0.95) within group (order by p.latency_ms)::int as p95_ms,
    max(p.latency_ms)::int as max_ms
  from public.fil_probes p
  where p.checked_at > now() - make_interval(hours => p_hours)
    and (p_slug is null or p.slug = p_slug)
  group by p.slug
  order by p95_ms desc nulls last;
$$;

revoke all on function public.fil_rollup_probes(integer) from public, anon, authenticated;
revoke all on function public.fil_probe_latency(text, integer) from public, anon, authenticated;
