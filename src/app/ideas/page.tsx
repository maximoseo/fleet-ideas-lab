"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import TrustLine from "@/components/TrustLine";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, DOMAIN_LABEL, DOMAIN_COLOR, type FleetDomain, type Effort, type Priority, type Impact, type IdeaStatus } from "@/lib/fleet";

const VIOLET = STYLES.violet;

function badgeEffort(e: Effort) {
  const m: Record<string, string> = { S: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", M: "bg-blue-500/15 text-blue-300 border-blue-500/20", L: "bg-amber-500/15 text-amber-300 border-amber-500/20", XL: "bg-red-500/15 text-red-300 border-red-500/20" };
  return m[e] || "bg-white/10 text-white/60";
}
function badgePriority(p: Priority) {
  const m: Record<string, string> = { P0: "bg-red-500 text-white", P1: "bg-amber-500 text-black", P2: "bg-white/15 text-white", P3: "bg-white/5 text-white/60" };
  return m[p] || "bg-white/10";
}

export default function IdeasPage() {
  const [domain, setDomain] = useState<FleetDomain | "all">("all");
  const [effort, setEffort] = useState<Effort | "all">("all" as unknown as Effort);
  const [impact, setImpact] = useState<Impact | "all">("all" as unknown as Impact);
  const [status, setStatus] = useState<IdeaStatus | "all">("all" as unknown as IdeaStatus);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [scaffolding, setScaffolding] = useState<string | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [pullY, setPullY] = useState(0);
  const pullStart = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const base = FLEET_IDEAS.filter((it) => {
      if (domain !== "all" && it.domain !== domain) return false;
      if (effort !== ("all" as unknown as Effort) && it.effort !== effort) return false;
      if (impact !== ("all" as unknown as Impact) && it.impact !== impact) return false;
      if (status !== ("all" as unknown as IdeaStatus) && it.status !== status) return false;
      if (q && !`${it.title} ${it.slug} ${it.description} ${it.whyNow}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (shuffleSeed === 0) return base;
    const n = base.length || 1;
    const k = shuffleSeed % n;
    return [...base.slice(k), ...base.slice(0, k)];
  }, [domain, effort, impact, status, q, shuffleSeed]);

  async function copyPrompt(prompt: string) {
    await navigator.clipboard.writeText(prompt);
    setToast("Prompt copied");
    setTimeout(() => setToast(null), 1800);
  }

  async function doScaffold(idea: typeof FLEET_IDEAS[number]) {
    setScaffolding(idea.id);
    setScaffoldResult(null);
    try {
      const res = await fetch("/api/fleet/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: idea.slug, ideaId: idea.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setScaffoldResult(`✓ Scaffolded ${data.slug} at ${data.dir}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setScaffoldResult(`✗ ${msg}`);
    } finally {
      setScaffolding(null);
      setTimeout(() => setScaffoldResult(null), 4000);
    }
  }

  const doReload = useCallback(() => {
    setReloading(true);
    setShuffleSeed((s) => s + 1);
    setToast(`\u21bb Reloaded \u00b7 ${filtered.length} ideas`);
    setTimeout(() => { setReloading(false); setToast(null); }, 1800);
  }, [filtered.length]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) pullStart.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0 && window.scrollY === 0) setPullY(Math.min(dy * 0.4, 72));
  }, []);
  const onTouchEnd = useCallback(() => {
    if (pullY > 48) doReload();
    pullStart.current = null;
    setPullY(0);
  }, [pullY, doReload]);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <SiteHeader subtitle="12 ideas • filters & scaffold" />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>Ideas</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>12 dashboard concepts derived from gap radar. Filter by domain, effort, impact, status. Actions: Open dashboard, Copy prompt, Scaffold stub.</p>
          </div>
          <div className="flex gap-2"><button onClick={doReload} className="inline-flex min-h-[44px] items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20">Find more ideas ↻</button><Link href="/create" className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">Create →</Link></div>
        </div>

        {/* Filters */}
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"] as const).map((d) => (
                <button key={d} onClick={() => setDomain(d as FleetDomain | "all")} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold transition ${domain === d ? "bg-violet-600 text-white" : "text-white/60 hover:text-white"}`}>{d === "all" ? "All Domains" : DOMAIN_LABEL[d]}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "S", "M", "L", "XL"] as const).map((e) => (
                <button key={e} onClick={() => setEffort(e as unknown as Effort)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold ${effort === e ? "bg-white text-[#0f0b1a]" : "text-white/60 hover:text-white"}`}>{e === "all" ? "Any Effort" : e}</button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "high", "medium", "low"] as const).map((v) => (
                <button key={v} onClick={() => setImpact(v as unknown as Impact)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${impact === v ? "bg-white text-[#0f0b1a]" : "text-white/60 hover:text-white"}`}>{v === "all" ? "Any Impact" : v}</button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "new", "scoped", "backlog", "shipped"] as const).map((v) => (
                <button key={v} onClick={() => setStatus(v as unknown as IdeaStatus)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${status === v ? "bg-white text-[#0f0b1a]" : "text-white/60 hover:text-white"}`}>{v}</button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ideas…" className="w-full sm:w-64 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none" />
              <span className="hidden sm:inline text-xs text-white/40">{filtered.length} / {FLEET_IDEAS.length}</span>
            </div>
          </div>
        </div>

        {scaffoldResult ? (
          <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-3 text-sm text-violet-100">{scaffoldResult}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <div key={idea.id} className="flex flex-col rounded-2xl border p-4 sm:p-5 hover:shadow-lg hover:shadow-violet-500/10 transition" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: DOMAIN_COLOR[idea.domain] }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[idea.domain] }}>{DOMAIN_LABEL[idea.domain]}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeEffort(idea.effort)}`}>{idea.effort}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgePriority(idea.priority)}`}>{idea.priority}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${idea.impact === "high" ? "bg-emerald-500/15 text-emerald-300" : idea.impact === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-white/60"}`}>{idea.impact}</span>
              </div>
              <h3 className="mt-2 text-[15px] font-bold leading-tight text-white">{idea.title}</h3>
              <p className="mt-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] leading-5 text-amber-100/90">
                <span className="font-bold">Why now:</span> {idea.whyNow}
              </p>
              <p className="mt-2 text-[13px] leading-5" style={{ color: VIOLET.textSecondary }}>{idea.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {idea.widgets.map((w) => (
                  <span key={w} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60">{w}</span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {idea.dashboardUrl ? (
                  <a href={idea.dashboardUrl} target="_blank" rel="noopener" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#0f0b1a] hover:bg-white/90 text-center leading-tight px-2">Open ↗</a>
                ) : (
                  <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white/40">No URL</span>
                )}
                <button onClick={() => copyPrompt(idea.prompt)} className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-[12px] font-semibold text-white hover:bg-white/10">Copy prompt</button>
                <button onClick={() => doScaffold(idea)} disabled={scaffolding === idea.id} className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-violet-600 px-2 text-[12px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                  {scaffolding === idea.id ? "…" : "Scaffold"}
                </button>
              </div>
              <div className="mt-2 text-center text-[11px] text-white/30">{idea.slug}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">No ideas match your filters.</p>
            <button onClick={() => { setDomain("all"); setEffort("all" as unknown as Effort); setImpact("all" as unknown as Impact); setStatus("all" as unknown as IdeaStatus); setQ(""); }} className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">Clear filters</button>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">
            {toast}
          </div>
        ) : null}
        <TrustLine />
      </main>
    </div>
  );
}
