/**
 * Live HTTP probes → real fleet health.
 *
 * Replaces audit-time `updatedAt` as the health source. State machine with a
 * two-consecutive-failure rule so one cold start or a single 5xx blip never
 * pages anyone:
 *
 *   success (2xx–3xx)          → healthy, failures reset
 *   first failure              → degraded (no alert)
 *   2+ consecutive failures    → down (alert on the transition)
 *   down → success             → healthy (recovery alert)
 *
 * Persistence + transition detection happen inside ONE plpgsql function
 * (`fil_record_probe`), so concurrent probe runs can't lose failure
 * increments or double-alert. Probe rows are append-only in `fil_probes`;
 * per-slug state lives in `fil_project_health`.
 *
 * Failure isolation:
 *  - Supabase unreachable → probes still run and report, nothing persists,
 *    no transitions are claimed (we can't know the previous state).
 *  - Health-row read error → persistence is SKIPPED for the whole run, so a
 *    transient read failure can never overwrite `down` with a stale reset.
 */

import { sbSelect, sbRpc, supabaseEnabled } from "@/lib/supabase";

export type ProbeResult = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  error: string | null;
};

export type HealthState = "healthy" | "degraded" | "down" | "unknown";

export interface HealthRow {
  slug: string;
  state: HealthState;
  consecutive_failures: number;
  last_ok_at: string | null;
  last_change_at: string;
  last_status: number | null;
  last_latency_ms: number | null;
  updated_at: string;
}

export interface Transition {
  slug: string;
  name: string;
  url: string;
  from: HealthState;
  to: HealthState;
  status: number | null;
  latencyMs: number;
}

const PROBE_TIMEOUT_MS = 8000;

export async function probeUrl(url: string): Promise<ProbeResult> {
  const started = Date.now();
  const attempt = async (method: "HEAD" | "GET") => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        cache: "no-store",
        headers: { "User-Agent": "fleet-ideas-lab-probe/1.0" },
      });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let res = await attempt("HEAD");
    // Some apps 405/403 on HEAD — fall back to GET before judging.
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await attempt("GET");
    }
    const latencyMs = Date.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    return { ok, status: res.status, latencyMs, error: ok ? null : `http_${res.status}` };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const msg = err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message.slice(0, 120)) : "unknown";
    return { ok: false, status: null, latencyMs, error: msg };
  }
}

/**
 * Jitter between probes.
 *
 * Without it all 38 targets are hit in a tight burst at :00/:15/:30/:45, from
 * one Vercel egress IP. Several of them are our own Vercel projects, so the
 * fleet was effectively rate-limit-testing itself four times an hour. A short
 * random gap costs nothing inside a 120-second function.
 */
const PROBE_JITTER_MAX_MS = 400;

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async (_unused, worker) => {
    // Stagger the workers themselves so they do not all start on the same tick.
    if (worker > 0) await new Promise((r) => setTimeout(r, worker * 60));
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
      await new Promise((r) => setTimeout(r, Math.random() * PROBE_JITTER_MAX_MS));
    }
  });
  await Promise.all(workers);
  return out;
}

export interface LatencyRow {
  slug: string;
  probes: number;
  p50_ms: number | null;
  p95_ms: number | null;
  max_ms: number | null;
}

/**
 * Latency percentiles over a recent window. p95 is the number that says
 * whether a dashboard is getting slower; an average hides exactly the tail
 * that users notice.
 */
export async function getLatencyPercentiles(slug?: string, hours = 24): Promise<LatencyRow[]> {
  if (!supabaseEnabled()) return [];
  try {
    const rows = await sbRpc<LatencyRow[]>("fil_probe_latency", {
      p_slug: slug ?? null,
      p_hours: hours,
    });
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn("[probes] latency read failed:", (err as Error).message);
    return [];
  }
}

/**
 * Roll finished days into fil_probe_daily and drop raw rows past the window.
 * Called from the daily sync cron — measured 2026-08-17, the raw table grows
 * about 3,650 rows a day and would reach the storage tier inside a year.
 */
export async function rollupProbes(keepDays = 30): Promise<{ rolled: number; deleted: number } | null> {
  if (!supabaseEnabled()) return null;
  try {
    const rows = await sbRpc<{ out_rolled: number; out_deleted: number }[]>("fil_rollup_probes", {
      p_keep_days: keepDays,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ? { rolled: row.out_rolled, deleted: row.out_deleted } : null;
  } catch (err) {
    console.warn("[probes] rollup failed:", (err as Error).message);
    return null;
  }
}

/** null = read failed (callers must not trust an empty map as "no rows"). */
export async function getHealthRows(): Promise<Record<string, HealthRow> | null> {
  if (!supabaseEnabled()) return {};
  try {
    const rows = await sbSelect<HealthRow>("fil_project_health", "select=*");
    return Object.fromEntries(rows.map((r) => [r.slug, r]));
  } catch (err) {
    console.warn("[probes] health-row read failed:", (err as Error).message);
    return null;
  }
}

interface RecordProbeResult {
  state: HealthState;
  previous: HealthState;
  failures: number;
  transitioned: boolean;
}

export async function runFleetProbes(
  targets: { slug: string; name: string; url: string }[],
): Promise<{ probed: number; transitions: Transition[]; states: Record<string, HealthState>; persisted: boolean }> {
  const transitions: Transition[] = [];
  const states: Record<string, HealthState> = {};
  if (targets.length === 0) return { probed: 0, transitions, states, persisted: false };

  // A failed read must not become a write that clobbers state — skip the run's persistence.
  const healthRows = await getHealthRows();
  const canPersist = supabaseEnabled() && healthRows !== null;

  const results = await mapPool(targets, 6, async (t) => ({ target: t, probe: await probeUrl(t.url) }));

  let recordFailures = 0;
  for (const { target, probe } of results) {
    if (!canPersist) {
      // Local-only verdict: single-run view, no transition claims.
      states[target.slug] = probe.ok ? "healthy" : "degraded";
      continue;
    }
    try {
      const r = await sbRpc<RecordProbeResult>("fil_record_probe", {
        p_slug: target.slug,
        p_ok: probe.ok,
        p_status: probe.status,
        p_latency: probe.latencyMs,
        p_error: probe.error,
      });
      const state = r?.state ?? (probe.ok ? "healthy" : "degraded");
      states[target.slug] = state;
      if (r?.transitioned) {
        transitions.push({
          slug: target.slug,
          name: target.name,
          url: target.url,
          from: r.previous,
          to: r.state,
          status: probe.status,
          latencyMs: probe.latencyMs,
        });
      }
    } catch (err) {
      console.warn("[probes] record failed for", target.slug, (err as Error).message);
      recordFailures += 1;
      states[target.slug] = probe.ok ? "healthy" : "degraded";
    }
  }

  // persisted only when EVERY record landed — a partial write is reported as such.
  return { probed: results.length, transitions, states, persisted: canPersist && recordFailures === 0 };
}
