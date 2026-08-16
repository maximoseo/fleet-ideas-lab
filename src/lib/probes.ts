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
 * Probe results are append-only in `fil_probes`; the per-slug state machine
 * lives in `fil_project_health`. Without Supabase the module still probes and
 * reports — it just can't persist or detect transitions.
 */

import { sbInsert, sbSelect, sbUpsert, supabaseEnabled } from "@/lib/supabase";

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
const FAILURES_FOR_DOWN = 2;

export async function probeUrl(url: string): Promise<ProbeResult> {
  const started = Date.now();
  const attempt = async (method: "HEAD" | "GET") => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        cache: "no-store",
        headers: { "User-Agent": "fleet-ideas-lab-probe/1.0" },
      });
      return res;
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
    const msg = err instanceof Error ? err.name === "AbortError" ? "timeout" : err.message.slice(0, 120) : "unknown";
    return { ok: false, status: null, latencyMs, error: msg };
  }
}

/** Simple concurrency limiter. */
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

export async function getHealthRows(): Promise<Record<string, HealthRow>> {
  if (!supabaseEnabled()) return {};
  try {
    const rows = await sbSelect<HealthRow>("fil_project_health", "select=*");
    return Object.fromEntries(rows.map((r) => [r.slug, r]));
  } catch {
    return {};
  }
}

/**
 * Probe a set of targets, persist results, and return confirmed transitions.
 * Never throws — alerting/probing must not break the caller.
 */
export async function runFleetProbes(
  targets: { slug: string; name: string; url: string }[],
): Promise<{ probed: number; transitions: Transition[]; states: Record<string, HealthState> }> {
  const transitions: Transition[] = [];
  const states: Record<string, HealthState> = {};
  if (targets.length === 0) return { probed: 0, transitions, states };

  const existing = await getHealthRows();
  const results = await mapPool(targets, 6, async (t) => ({ target: t, probe: await probeUrl(t.url) }));

  const now = new Date().toISOString();
  for (const { target, probe } of results) {
    const prev = existing[target.slug];
    const prevState: HealthState = prev?.state ?? "unknown";
    const prevFailures = prev?.consecutive_failures ?? 0;

    let state: HealthState;
    let failures: number;
    if (probe.ok) {
      state = "healthy";
      failures = 0;
    } else {
      failures = prevFailures + 1;
      state = failures >= FAILURES_FOR_DOWN ? "down" : "degraded";
    }
    states[target.slug] = state;

    const stateChanged = state !== prevState && prevState !== "unknown";
    const confirmed = state === "down" ? failures >= FAILURES_FOR_DOWN : true;
    if (stateChanged && confirmed) {
      transitions.push({
        slug: target.slug,
        name: target.name,
        url: target.url,
        from: prevState,
        to: state,
        status: probe.status,
        latencyMs: probe.latencyMs,
      });
    }

    if (supabaseEnabled()) {
      try {
        await sbInsert("fil_probes", {
          slug: target.slug,
          checked_at: now,
          ok: probe.ok,
          status: probe.status,
          latency_ms: probe.latencyMs,
          error: probe.error,
        });
        await sbUpsert(
          "fil_project_health",
          {
            slug: target.slug,
            state,
            consecutive_failures: failures,
            last_ok_at: probe.ok ? now : prev?.last_ok_at ?? null,
            last_change_at: stateChanged ? now : prev?.last_change_at ?? now,
            last_status: probe.status,
            last_latency_ms: probe.latencyMs,
            updated_at: now,
          },
          "slug",
        );
      } catch (err) {
        console.warn("[probes] persistence failed for", target.slug, (err as Error).message);
      }
    }
  }

  return { probed: results.length, transitions, states };
}
