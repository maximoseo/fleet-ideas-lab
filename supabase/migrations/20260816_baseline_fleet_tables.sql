-- Baseline for the objects that existed only in the live database until 2026-10-04 (diagnosis F19).
-- Reconstructed from the live schema of project fleet-ideas-lab (read-only catalog queries).
-- Idempotent: safe to run on a fresh project and a no-op on production.
--
-- Access model, as found in production: RLS is ON for every fil_* table with NO policies, so only the
-- service role (which bypasses RLS) can read or write. The app only ever uses the service-role key
-- on the server (src/lib/supabase.ts). Do not add anon/authenticated policies without a reason.

create table if not exists public.fil_alerts (
  id bigserial primary key,
  slug text not null,
  kind text not null,
  payload jsonb default '{}'::jsonb,
  sent_at timestamptz default now()
);

create table if not exists public.fil_analyses (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.fil_favorites (
  idea_slug text primary key,
  created_at timestamptz default now()
);

create table if not exists public.fil_ideas (
  slug text primary key,
  title text not null,
  payload jsonb default '{}'::jsonb,
  status text not null default 'backlog',
  priority text,
  effort text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fil_idea_events (
  id bigserial primary key,
  slug text not null,
  event text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz default now()
);

-- Record of every WordPress injection made on a client site.
create table if not exists public.fil_injections (
  id uuid primary key default gen_random_uuid(),
  site_url text not null,
  page_id integer,
  page_slug text,
  marker_id text,
  mode text,
  style_name text,
  status text not null default 'live',
  created_at timestamptz default now(),
  removed_at timestamptz
);

create table if not exists public.fil_probes (
  id bigserial primary key,
  slug text not null,
  checked_at timestamptz default now(),
  ok boolean not null,
  status integer,
  latency_ms integer,
  error text
);
create index if not exists fil_probes_slug_time on public.fil_probes (slug, checked_at desc);

create table if not exists public.fil_project_health (
  slug text primary key,
  state text not null default 'unknown',
  consecutive_failures integer default 0,
  last_ok_at timestamptz,
  last_change_at timestamptz default now(),
  last_status integer,
  last_latency_ms integer,
  updated_at timestamptz default now()
);

create table if not exists public.fil_projects (
  slug text primary key,
  name text not null,
  url text,
  domains jsonb default '[]'::jsonb,
  capabilities jsonb default '[]'::jsonb,
  description text,
  plain_explainer text,
  source text default 'vercel-sync',
  vercel_updated_at timestamptz,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table public.fil_alerts enable row level security;
alter table public.fil_analyses enable row level security;
alter table public.fil_favorites enable row level security;
alter table public.fil_ideas enable row level security;
alter table public.fil_idea_events enable row level security;
alter table public.fil_injections enable row level security;
alter table public.fil_probes enable row level security;
alter table public.fil_project_health enable row level security;
alter table public.fil_projects enable row level security;

-- Atomic status change: row lock, validation, update and append-only event in one transaction.
create or replace function public.fil_transition_idea(p_slug text, p_to text, p_note text default null)
returns jsonb
language plpgsql
as $function$
declare
  prev_status text;
  allowed text[] := array['backlog','planned','building','shipped','archived'];
begin
  if not (p_to = any(allowed)) then
    raise exception 'invalid status %', p_to;
  end if;

  select status into prev_status from fil_ideas where slug = p_slug for update;
  if prev_status is null then
    raise exception 'idea not found: %', p_slug;
  end if;
  if prev_status = p_to then
    return jsonb_build_object('slug', p_slug, 'from', prev_status, 'to', p_to, 'changed', false);
  end if;

  update fil_ideas set status = p_to, updated_at = now() where slug = p_slug;
  insert into fil_idea_events (slug, event, from_status, to_status, note)
  values (p_slug, 'status_change', prev_status, p_to, p_note);

  return jsonb_build_object('slug', p_slug, 'from', prev_status, 'to', p_to, 'changed', true);
end $function$;

-- Records one probe and the health state change it causes; flags alert-worthy transitions only.
create or replace function public.fil_record_probe(p_slug text, p_ok boolean, p_status integer, p_latency integer, p_error text)
returns jsonb
language plpgsql
as $function$
declare
  prev record;
  new_state text;
  new_failures int;
  transitioned boolean := false;
  now_ts timestamptz := now();
begin
  insert into fil_probes (slug, checked_at, ok, status, latency_ms, error)
  values (p_slug, now_ts, p_ok, p_status, p_latency, p_error);

  select * into prev from fil_project_health where slug = p_slug for update;

  if p_ok then
    new_state := 'healthy'; new_failures := 0;
  else
    new_failures := coalesce(prev.consecutive_failures, 0) + 1;
    new_state := case when new_failures >= 2 then 'down' else 'degraded' end;
  end if;

  -- alert-worthy transitions only: -> down, or down -> healthy
  if prev.slug is not null and prev.state <> 'unknown' and prev.state <> new_state then
    if new_state = 'down' or (new_state = 'healthy' and prev.state = 'down') then
      transitioned := true;
    end if;
  end if;

  insert into fil_project_health (slug, state, consecutive_failures, last_ok_at, last_change_at, last_status, last_latency_ms, updated_at)
  values (p_slug, new_state, new_failures,
          case when p_ok then now_ts else prev.last_ok_at end,
          case when prev.slug is null or prev.state <> new_state then now_ts else prev.last_change_at end,
          p_status, p_latency, now_ts)
  on conflict (slug) do update set
    state = excluded.state,
    consecutive_failures = excluded.consecutive_failures,
    last_ok_at = excluded.last_ok_at,
    last_change_at = excluded.last_change_at,
    last_status = excluded.last_status,
    last_latency_ms = excluded.last_latency_ms,
    updated_at = excluded.updated_at;

  return jsonb_build_object('state', new_state, 'previous', coalesce(prev.state,'unknown'), 'failures', new_failures, 'transitioned', transitioned);
end $function$;
