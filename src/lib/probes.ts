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

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
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
      states[target.slug] = probe.ok ? "healthy" : "degraded";
    }
  }

  return { probed: results.length, transitions, states, persisted: canPersist };
}
