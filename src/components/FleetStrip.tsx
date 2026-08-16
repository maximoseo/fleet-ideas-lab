"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LiveState = "healthy" | "degraded" | "down" | "unknown";
type Band = "healthy" | "degraded" | "down" | "unknown";
type SortMode = "worst" | "name" | "domain";

interface InventoryItem {
  slug: string;
  name: string;
  domains?: string[];
  health?: "healthy" | "stale" | "degraded" | "unknown";
  url?: string;
  live?: {
    state: "healthy" | "degraded" | "down";
    lastStatus: number | null;
    latencyMs: number | null;
    checkedAt: string;
    lastOkAt: string | null;
  } | null;
}

interface InventoryResponse {
  inventory?: InventoryItem[];
  liveHealth?: boolean;
}

const BAND_ORDER: Record<Band, number> = { down: 0, degraded: 1, unknown: 2, healthy: 3 };

const BAND_META: Record<Band, { label: string; height: number; color: string | null; word: string }> = {
  healthy: { label: "Healthy", height: 48, color: "#a78bfa", word: "cool" },
  degraded: { label: "Degraded", height: 32, color: "#e8b14c", word: "warm" },
  down: { label: "Down", height: 20, color: "#f2637e", word: "warm" },
  unknown: { label: "Unknown", height: 12, color: null, word: "no data" },
};

function bandOf(item: InventoryItem, liveHealth: boolean): Band {
  if (liveHealth) {
    if (!item.live) return "unknown";
    return item.live.state;
  }
  // Static snapshot fallback — engine vocabulary has "stale", map it to degraded band
  if (item.health === "healthy") return "healthy";
  if (item.health === "degraded" || item.health === "stale") return "degraded";
  return "unknown";
}

export default function FleetStrip() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [liveHealth, setLiveHealth] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("worst");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fleet/inventory");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = (await res.json()) as InventoryResponse;
        if (cancelled) return;
        setItems(data.inventory || []);
        setLiveHealth(data.liveHealth === true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load inventory");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const withBand = items.map((it) => ({ ...it, band: bandOf(it, liveHealth) }));
    if (sort === "name") withBand.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "domain")
      withBand.sort((a, b) => (a.domains?.[0] || "").localeCompare(b.domains?.[0] || "") || a.name.localeCompare(b.name));
    else withBand.sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || a.name.localeCompare(b.name));
    return withBand;
  }, [items, liveHealth, sort]);

  const counts = useMemo(() => {
    const c: Record<Band, number> = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
    for (const r of rows) c[r.band]++;
    return c;
  }, [rows]);

  return (
    <section aria-label="Fleet health strip" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Fleet strip</h2>
          <p className="text-[12px] text-white/50">
            One segment per dashboard — height follows live health, worst first.
            {!liveHealth && !loading ? (
              <span className="ml-1 font-semibold text-amber-300">static snapshot — live probes offline</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Sort fleet strip">
          {(
            [
              { id: "worst", label: "Worst-first" },
              { id: "name", label: "Name" },
              { id: "domain", label: "Domain" },
            ] as { id: SortMode; label: string }[]
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setSort(o.id)}
              aria-pressed={sort === o.id}
              className={`min-h-[32px] rounded-full px-3 text-[12px] font-semibold transition ${sort === o.id ? "bg-violet-600 text-white" : "text-white/60 hover:text-white"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      ) : error ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/60">
          Fleet strip could not load ({error}).
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/60">
          No dashboards in the inventory yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-[3px]" role="list">
            {rows.map((r) => {
              const meta = BAND_META[r.band];
              const stateLabel = liveHealth ? (r.live ? r.live.state : "unknown") : r.health || "unknown";
              return (
                <Link
                  key={r.slug}
                  role="listitem"
                  href={`/dashboard/${r.slug}`}
                  aria-label={`${r.name}: ${stateLabel}`}
                  title={`${r.name} — ${stateLabel}`}
                  className="min-w-[6px] flex-1 rounded-t-sm transition-transform hover:scale-y-110 focus-visible:scale-y-110"
                  style={{
                    height: meta.height,
                    transformOrigin: "bottom",
                    background: meta.color
                      ? meta.color
                      : "repeating-linear-gradient(45deg, rgba(140,130,171,0.35) 0 3px, transparent 3px 6px)",
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 h-px w-full bg-white/10" aria-hidden />

          {/* Legend — counts per band + the rule in words; colour never alone (height + label pair with it) */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
            {(["healthy", "degraded", "down", "unknown"] as Band[]).map((b) => {
              const meta = BAND_META[b];
              return (
                <span key={b} className="inline-flex items-center gap-1.5 text-white/70">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{
                      background: meta.color
                        ? meta.color
                        : "repeating-linear-gradient(45deg, rgba(140,130,171,0.5) 0 2px, transparent 2px 4px)",
                    }}
                    aria-hidden
                  />
                  {meta.label}
                  <span className="font-mono font-bold text-white">{counts[b]}</span>
                </span>
              );
            })}
            <span className="w-full text-white/40 sm:ml-auto sm:w-auto">
              Warm colours mean a dashboard wants attention. Cool means it does not.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
