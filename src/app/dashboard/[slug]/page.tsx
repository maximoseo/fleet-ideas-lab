"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { STYLES } from "@/lib/styles";
import { DOMAIN_LABEL, DOMAIN_COLOR, FLEET_PROJECTS } from "@/lib/fleet";
import { buildImprovePromptForProject } from "@/lib/agentPrompt";

const VIOLET = STYLES.violet;

type LiveState = "healthy" | "degraded" | "down";

interface InventoryItem {
  slug: string;
  name: string;
  domains?: string[];
  capabilities?: string[];
  health?: "healthy" | "stale" | "degraded" | "unknown";
  updated?: string;
  url?: string;
  plainExplainer?: string;
  description?: string;
  live?: {
    state: LiveState;
    lastStatus: number | null;
    latencyMs: number | null;
    checkedAt: string;
    lastOkAt: string | null;
  } | null;
}

interface ProbeRow {
  checked_at: string;
  ok: boolean;
  status: number | null;
  latency_ms: number | null;
  error: string | null;
}

const STATE_META: Record<LiveState | "unknown", { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "#a78bfa" },
  degraded: { label: "Degraded", color: "#e8b14c" },
  down: { label: "Down", color: "#f2637e" },
  unknown: { label: "Unknown", color: "#8c82ab" },
};

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function freshness(updated: string | undefined): { band: "good" | "warn" | "bad"; label: string; days: number | null } {
  if (!updated) return { band: "bad", label: "no deploy date on record", days: null };
  const days = Math.floor((Date.now() - new Date(updated + "T00:00:00Z").getTime()) / 86400000);
  if (days <= 3) return { band: "good", label: `${updated} (${days}d ago)`, days };
  if (days <= 7) return { band: "warn", label: `${updated} (${days}d ago)`, days };
  return { band: "bad", label: `${updated} (${days}d ago)`, days };
}

const BAND_STYLE: Record<"good" | "warn" | "bad", string> = {
  good: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  bad: "border-red-500/30 bg-red-500/10 text-red-300",
};
const BAND_DOT: Record<"good" | "warn" | "bad", string> = { good: "#a78bfa", warn: "#e8b14c", bad: "#f2637e" };

export default function DashboardDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [liveHealth, setLiveHealth] = useState(false);
  const [probes, setProbes] = useState<ProbeRow[]>([]);
  const [probesPersisted, setProbesPersisted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [probing, setProbing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      // Inventory is the critical read; probe-history failure degrades to
      // "history unavailable" instead of blanking the whole page.
      const [invResult, probeResult] = await Promise.allSettled([
        fetch("/api/fleet/inventory"),
        fetch(`/api/fleet/probe-history?slug=${encodeURIComponent(slug)}`),
      ]);
      if (invResult.status === "rejected") throw invResult.reason;
      const invRes = invResult.value;
      if (!invRes.ok) throw new Error("inventory HTTP " + invRes.status);
      const inv = (await invRes.json()) as { inventory?: InventoryItem[]; liveHealth?: boolean };
      const found = (inv.inventory || []).find((p) => p.slug === slug) || null;
      if (!found) {
        setNotFound(true);
        setItem(null);
      } else {
        setItem(found);
      }
      setLiveHealth(inv.liveHealth === true);
      if (probeResult.status === "fulfilled" && probeResult.value.ok) {
        const ph = (await probeResult.value.json()) as { probes?: ProbeRow[]; persisted?: boolean };
        setProbes((ph.probes || []).slice(0, 50));
        setProbesPersisted(ph.persisted !== false);
      } else {
        setProbes([]);
        setProbesPersisted(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount for the route's slug; load() sets its own loading flag
    if (slug) load();
  }, [slug, load]);

  async function rerunProbe() {
    setProbing(true);
    try {
      const res = await fetch(`/api/fleet/probe?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      setToast("Probe finished — reloading data");
      await load();
    } catch (e) {
      setToast("✗ Probe failed — " + (e instanceof Error ? e.message : "unknown error"));
    } finally {
      setProbing(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function copyImprove() {
    const project = FLEET_PROJECTS.find((p) => p.slug === slug);
    if (!project) return;
    const brief = buildImprovePromptForProject(project as unknown as never);
    try {
      await navigator.clipboard.writeText(brief);
      setToast("IMPROVE brief copied (" + slug + ")");
    } catch {
      setToast("✗ Copy failed — clipboard unavailable (select the text manually)");
    }
    setTimeout(() => setToast(null), 2600);
    try {
      await fetch("/api/fleet/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "copy",
          slug: slug + "-improve",
          title: "Improve " + (item?.name || slug),
          targetSlug: slug,
          meta: { mode: "improve", source: "dashboard-detail" },
        }),
      });
    } catch {}
  }

  const state: LiveState | "unknown" = item?.live ? item.live.state : "unknown";
  const fresh = useMemo(() => freshness(item?.updated), [item?.updated]);
  const isCustomDomain = !!item?.url && item.url.replace(/\/$/, "").endsWith(".maximo-seo.ai");
  const hasImproveBrief = FLEET_PROJECTS.some((p) => p.slug === slug);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle={item ? item.name : "Dashboard detail"} />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
        <Link href="/" className="text-[13px] font-semibold text-violet-200 hover:text-violet-200">
          ← Fleet inventory
        </Link>

        {loading ? (
          <div className="mt-5 space-y-3">
            <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/75">Could not load this dashboard ({error}).</p>
            <button
              onClick={load}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : notFound || !item ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-lg font-bold text-white">No dashboard named “{slug}” in the fleet inventory.</p>
            <p className="mt-2 text-sm text-white/50">
              The slug may be wrong or the dashboard was removed. Check the{" "}
              <Link href="/" className="text-violet-200 underline">
                fleet inventory
              </Link>{" "}
              for the current list.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mt-4 rounded-2xl border border-white/10 p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${VIOLET.surface}, ${VIOLET.elevated})`, borderColor: VIOLET.border }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>
                    {item.name}
                  </h1>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener" className="mt-1 inline-block font-mono text-[13px] text-violet-200 hover:text-violet-200">
                      {item.url.replace("https://", "")} ↗
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] text-white/65">No production URL on record.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(item.domains || []).map((d) => (
                      <span
                        key={d}
                        className="rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{
                          color: DOMAIN_COLOR[d] || "#8c82ab",
                          borderColor: (DOMAIN_COLOR[d] || "#8c82ab") + "44",
                          background: (DOMAIN_COLOR[d] || "#8c82ab") + "14",
                        }}
                      >
                        {DOMAIN_LABEL[d] || d}
                      </span>
                    ))}
                    {(item.capabilities || []).map((c) => (
                      <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75">
                        {c}
                      </span>
                    ))}
                  </div>
                  {item.plainExplainer ? (
                    <p className="mt-3 max-w-2xl rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-[13px] leading-5 text-violet-100">
                      <span className="font-bold">In plain English:</span> {item.plainExplainer}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* LIVE panel */}
            <section aria-label="Live health" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-white">Live</h2>
                {!liveHealth ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
                    static snapshot — live probes offline
                  </span>
                ) : null}
              </div>
              {item.live ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_META[state].color }} aria-hidden />
                      <span className="text-[14px] font-bold" style={{ color: STATE_META[state].color }}>
                        {STATE_META[state].label}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/65">Current state</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="font-mono text-[14px] font-bold text-white">{item.live.lastStatus ?? "—"}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/65">Last HTTP status</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="font-mono text-[14px] font-bold text-white">
                      {item.live.latencyMs != null ? item.live.latencyMs + " ms" : "—"}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/65">Latency</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="font-mono text-[14px] font-bold text-white">{fmtTime(item.live.checkedAt)}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-white/65">Last check</div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-white/50">
                  No live probe data for this dashboard yet
                  {item.health ? (
                    <>
                      {" "}— static health from the last audit: <span className="font-semibold text-white/70">{item.health}</span>.
                    </>
                  ) : (
                    "."
                    )}
                </p>
              )}
            </section>

            {/* Scorecard */}
            <section aria-label="Scorecard" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={`rounded-xl border px-4 py-3 ${BAND_STYLE[isCustomDomain ? "good" : "warn"]}`}>
                <div className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="h-2 w-2 rounded-full" style={{ background: BAND_DOT[isCustomDomain ? "good" : "warn"] }} aria-hidden />
                  Custom domain
                </div>
                <div className="mt-1 text-[12px]">{isCustomDomain ? "yes — *.maximo-seo.ai" : "no — not on a maximo-seo.ai alias"}</div>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${BAND_STYLE[item.live ? (item.live.state === "healthy" ? "good" : item.live.state === "degraded" ? "warn" : "bad") : "warn"]}`}>
                <div className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="h-2 w-2 rounded-full" style={{ background: BAND_DOT[item.live ? (item.live.state === "healthy" ? "good" : item.live.state === "degraded" ? "warn" : "bad") : "warn"] }} aria-hidden />
                  Reachable
                </div>
                <div className="mt-1 text-[12px]">
                  {item.live ? (item.live.state === "healthy" ? "yes — last probe healthy" : item.live.state) : "no live data"}
                </div>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${BAND_STYLE[fresh.band]}`}>
                <div className="flex items-center gap-2 text-[13px] font-bold">
                  <span className="h-2 w-2 rounded-full" style={{ background: BAND_DOT[fresh.band] }} aria-hidden />
                  Deploy freshness
                </div>
                <div className="mt-1 text-[12px]">{fresh.label}</div>
              </div>
            </section>

            {/* Quick actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13px] font-semibold text-[#0f0b1a] hover:bg-white/90">
                  Open site ↗
                </a>
              ) : null}
              <button
                onClick={rerunProbe}
                disabled={probing}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 text-[13px] font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {probing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" aria-hidden /> : null}
                {probing ? "Probing…" : "Re-run probe"}
              </button>
              {hasImproveBrief ? (
                <button
                  onClick={copyImprove}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-5 text-[13px] font-bold text-amber-100 hover:bg-amber-500/15"
                >
                  Copy improve prompt
                </button>
              ) : null}
            </div>

            {/* Probe history */}
            <section aria-label="Probe history" className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm font-bold text-white">Probe history <span className="font-mono text-white/65">(last {probes.length})</span></h2>
              {!probesPersisted ? (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] font-semibold text-amber-100">
                  Probe persistence offline — history unavailable.
                </p>
              ) : probes.length === 0 ? (
                <p className="mt-3 text-[13px] text-white/50">No probes recorded for this dashboard yet — use Re-run probe to capture one now.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/65">
                        <th className="py-2 pr-3 font-semibold">Result</th>
                        <th className="py-2 pr-3 font-semibold">HTTP</th>
                        <th className="py-2 pr-3 font-semibold">Latency</th>
                        <th className="py-2 pr-3 font-semibold">Checked</th>
                        <th className="py-2 font-semibold">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {probes.map((p, i) => (
                        <tr key={p.checked_at + "-" + i} className="border-b border-white/5">
                          <td className="py-2 pr-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.ok ? "border-violet-500/30 bg-violet-500/10 text-violet-200" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                              {p.ok ? "✓ ok" : "✗ fail"}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-white/70">{p.status ?? "—"}</td>
                          <td className="py-2 pr-3 font-mono text-white/70">{p.latency_ms != null ? p.latency_ms + " ms" : "—"}</td>
                          <td className="py-2 pr-3 font-mono text-white/50">{fmtTime(p.checked_at)}</td>
                          <td className="max-w-[220px] truncate py-2 text-white/65" title={p.error || undefined}>{p.error || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {toast ? (
          <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl lg:bottom-6">
            {toast}
          </div>
        ) : null}
        <TrustLine />
      </main>
    </div>
  );
}
