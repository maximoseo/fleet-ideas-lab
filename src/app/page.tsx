"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_PROJECTS, FLEET_IDEAS, DOMAIN_LABEL, DOMAIN_COLOR, healthLevel, HEALTH_COLOR, type FleetDomain } from "@/lib/fleet";
import TrustLine from "@/components/TrustLine";

const VIOLET = STYLES.violet;
const DOMAINS: (FleetDomain | "all")[] = ["all", "seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
const STATUS: (FleetDomain | "all" | "live" | "beta" | "build" | "concept")[] = ["all", "live", "beta", "build", "concept"];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "1d ago";
    if (diff < 30) return `${diff}d ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch { return iso.slice(0, 10); }
}

function HealthBar({ h }: { h: number }) {
  const lvl = healthLevel(h);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${h}%`, background: HEALTH_COLOR[lvl] }} />
      </div>
      <span className="text-[11px] font-bold" style={{ color: HEALTH_COLOR[lvl] }}>{h}</span>
    </div>
  );
}

function MiniGapRadar() {
  // tiny 6x8 heat for preview
  const domains: FleetDomain[] = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
  const caps = ["Monitor", "Analyze", "Create", "Optimize", "Automate", "Report"];
  // use GAP_SCORES mock mapping from fleet lib
  const score = (d: string, c: string) => {
    const map: Record<string, Record<string, number>> = {
      seo: { Monitor: 88, Analyze: 82, Create: 35, Optimize: 58, Automate: 62, Report: 75 },
      content: { Monitor: 42, Analyze: 68, Create: 85, Optimize: 72, Automate: 48, Report: 55 },
      local: { Monitor: 78, Analyze: 62, Create: 38, Optimize: 52, Automate: 55, Report: 68 },
      analytics: { Monitor: 72, Analyze: 88, Create: 22, Optimize: 45, Automate: 40, Report: 90 },
      automation: { Monitor: 65, Analyze: 55, Create: 50, Optimize: 48, Automate: 92, Report: 38 },
      design: { Monitor: 35, Analyze: 78, Create: 88, Optimize: 70, Automate: 42, Report: 45 },
      outreach: { Monitor: 58, Analyze: 52, Create: 48, Optimize: 35, Automate: 62, Report: 50 },
      technical: { Monitor: 80, Analyze: 75, Create: 32, Optimize: 68, Automate: 58, Report: 62 },
    };
    return map[d]?.[c] ?? 50;
  };
  const cellColor = (s: number) => s >= 70 ? "bg-emerald-500/80" : s >= 50 ? "bg-amber-500/70" : s >= 30 ? "bg-red-500/60" : "bg-white/10";
  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: `70px repeat(${caps.length}, 32px)`, gap: 4 }}>
        <div />
        {caps.map((c) => <div key={c} className="text-center text-[9px] font-bold uppercase tracking-widest text-white/40">{c.slice(0, 3)}</div>)}
        {domains.map((d) => (
          <>
            <div key={`l-${d}`} className="text-right pr-2 text-[11px] font-medium text-white/60 self-center">{DOMAIN_LABEL[d]}</div>
            {caps.map((c) => {
              const s = score(d, c);
              return <div key={`${d}-${c}`} title={`${d} × ${c}: ${s}`} className={`h-7 rounded-md ${cellColor(s)} flex items-center justify-center text-[10px] font-bold ${s < 30 ? "text-white/60" : "text-white/90"}`}>{s}</div>;
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [domain, setDomain] = useState<FleetDomain | "all">("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return FLEET_PROJECTS.filter((p) => {
      if (domain !== "all" && p.domain !== domain) return false;
      if (status !== "all" && p.status !== status) return false;
      if (q && !`${p.name} ${p.slug} ${p.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [domain, status, q]);

  const stats = useMemo(() => {
    const live = FLEET_PROJECTS.filter((p) => p.status === "live").length;
    const avgHealth = Math.round(FLEET_PROJECTS.reduce((a, b) => a + b.health, 0) / FLEET_PROJECTS.length);
    const stale = FLEET_PROJECTS.filter((p) => p.health < 50).length;
    return { total: FLEET_PROJECTS.length, live, avgHealth, stale };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle="Inventory • Fleet grid" />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
        {/* Hero */}
        <div className="rounded-2xl border border-white/10 p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${VIOLET.surface}, ${VIOLET.elevated})`, borderColor: VIOLET.border }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>Fleet Inventory</h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>12 products across 8 domains. Health, deploys, and gaps at a glance. Filter by domain or status — explore white-space via the mini-radar.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500">Explore Ideas →</Link>
                <Link href="/gaps" className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">Gap Radar</Link>
                <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 text-[13px] font-semibold text-violet-200 hover:bg-violet-500/15">Find more ideas ↻</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {[
                { k: "Total", v: stats.total },
                { k: "Live", v: stats.live },
                { k: "Avg Health", v: `${stats.avgHealth}` },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center min-w-[84px]">
                  <div className="text-lg font-black text-white">{s.v}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
            {DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition ${domain === d ? "bg-violet-600 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                {d === "all" ? "All" : DOMAIN_LABEL[d]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {STATUS.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`min-h-[32px] rounded-full px-3 text-[12px] font-semibold capitalize transition ${status === s ? "bg-white text-[#0f0b1a]" : "text-white/60 hover:text-white"}`}>{s}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, slug, capability…" className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none" />
            </div>
            <span className="hidden sm:inline text-xs text-white/40">{filtered.length} / {FLEET_PROJECTS.length}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!mounted ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))
          ) : filtered.map((p) => {
            const lvl = healthLevel(p.health);
            return (
              <div key={p.slug} className="group flex flex-col rounded-2xl border p-4 transition hover:shadow-lg hover:shadow-violet-500/10" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOMAIN_COLOR[p.domain] }} />
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[p.domain] }}>{DOMAIN_LABEL[p.domain]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.status === "live" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : p.status === "beta" ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" : p.status === "build" ? "bg-amber-500/15 text-amber-300 border border-amber-500/20" : "bg-white/10 text-white/60 border border-white/10"}`}>{p.status}</span>
                  </div>
                  <span className="text-[11px] text-white/35">{formatDate(p.lastDeploy)}</span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold leading-tight text-white group-hover:text-violet-200">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5" style={{ color: VIOLET.textSecondary }}>{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.capabilities.map((c) => (
                    <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60">{c}</span>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-widest text-white/40">Health</span>
                    <span className="font-bold" style={{ color: HEALTH_COLOR[lvl] }}>{lvl}</span>
                  </div>
                  <HealthBar h={p.health} />
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={p.url} target="_blank" rel="noopener" className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#0f0b1a] hover:bg-white/90">Open ↗</a>
                  <Link href={`/gaps`} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">Gaps</Link>
                </div>
              </div>
            );
          })}
        </div>
        {mounted && filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">No projects match your filters.</p>
            <button onClick={() => { setDomain("all"); setStatus("all"); setQ(""); }} className="mt-3 inline-flex min-h-[40px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">Clear filters</button>
          </div>
        ) : null}

        {/* Mini radar */}
        <div className="mt-8 rounded-2xl border p-5" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Gap Mini-Radar</h2>
              <p className="text-xs" style={{ color: VIOLET.textSecondary }}>Domains × Capabilities · highlights white-space (score &lt; 30) — full matrix on Gaps page.</p>
            </div>
            <Link href="/gaps" className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">Open Gap Radar →</Link>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <MiniGapRadar />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-500/80" /> Strong ≥70</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-500/70" /> Ok 50-69</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-500/60" /> Gap 30-49</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-white/10" /> White-space &lt;30</span>
          </div>
        </div>

        {/* Ideas teaser */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Ideas teaser</h2>
            <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-500">Find more ideas ↻</Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FLEET_IDEAS.slice(0, 3).map((idea) => (
            <Link key={idea.id} href="/ideas" className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 hover:bg-violet-500/15 transition">
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-300">{DOMAIN_LABEL[idea.domain]} · {idea.effort} · {idea.priority}</div>
              <div className="mt-1 text-[14px] font-bold text-white">{idea.title}</div>
              <div className="mt-1 line-clamp-2 text-[12px] text-white/60">{idea.whyNow}</div>
            </Link>
          ))}
        </div>
        </div>
        <TrustLine />
      </main>
    </div>
  );
}
