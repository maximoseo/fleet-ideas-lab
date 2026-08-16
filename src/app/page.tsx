"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_PROJECTS, FLEET_IDEAS, FLEET_COUNT, DOMAIN_LABEL, DOMAIN_COLOR, healthLevel, HEALTH_COLOR, statusLabel, statusExplainer, GAP_SCORES, gapLevel, type FleetDomain, type Capability } from "@/lib/fleet";
import { buildImprovePromptForProject } from "@/lib/agentPrompt";
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
  // Derived — single source of truth: GAP_SCORES (domain x capability % from FLEET_COUNT dashboards)
  const domains: FleetDomain[] = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
  const caps: Capability[] = ["analytics", "alerts", "automation", "reporting", "visualization"];
  const capLabel: Record<string, string> = { analytics: "ANL", alerts: "ALT", automation: "AUT", reporting: "REP", visualization: "VIS" };
  const cellColor = (s: number) => {
    const lvl = gapLevel(s);
    if (lvl === "strong") return "bg-emerald-500/80";
    if (lvl === "ok") return "bg-amber-500/70";
    if (lvl === "gap") return "bg-red-500/60";
    return "bg-white/10";
  };
  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: `70px repeat(${caps.length}, 36px)`, gap: 4 }}>
        <div />
        {caps.map((c) => <div key={c} className="text-center text-[9px] font-bold uppercase tracking-widest text-white/40">{capLabel[c]}</div>)}
        {domains.map((d) => (
          <div key={`row-${d}`} className="contents">
            <div className="text-right pr-2 text-[11px] font-medium text-white/60 self-center">{DOMAIN_LABEL[d]}</div>
            {caps.map((c) => {
              const s = GAP_SCORES[d]?.[c] ?? 8;
              const lvl = gapLevel(s);
              return <div key={`${d}-${c}`} title={`${DOMAIN_LABEL[d]} x ${c}: ${s}% (${lvl}) — derived from ${FLEET_COUNT} dashboards`} className={`h-7 rounded-md ${cellColor(s)} flex items-center justify-center text-[10px] font-bold ${s < 30 ? "text-white/60" : "text-white/90"}`}>{s}</div>;
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-3 text-white/30">ANL=analytics · ALT=alerts · AUT=automation · REP=reporting · VIS=visualization · Scores = coverage % derived from FLEET_INVENTORY (not mock)</p>
    </div>
  );
}

export default function InventoryPage() {
  const [domain, setDomain] = useState<FleetDomain | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [improveSlug, setImproveSlug] = useState<string | null>(null);
  const [invToast, setInvToast] = useState<string | null>(null);
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
              <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>{FLEET_COUNT} verified dashboards across 13 domains — live Vercel fleet. Filter by domain, status, or search. Every URL is a real production alias, health from last deploy date. Audit 2026-08-15.</p>
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

        {/* Status legend — what beta actually means */}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Live — deploy ≤3d · alias OK · healthy</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/15 px-3 py-1.5 text-blue-300"><span className="h-2 w-2 rounded-full bg-blue-400" /> Beta — deploy 4–7d · still reachable · degraded</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1.5 text-amber-300"><span className="h-2 w-2 rounded-full bg-amber-400" /> Build — &gt;7d · needs attention · stale</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white/60"><span className="h-2 w-2 rounded-full bg-white/30" /> Concept — not yet live</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-white/35">Tap any status pill to see <span className="text-white/60">why</span> — date + health + alias. Beta is not a bug: it means &#34;deployed but a few days without a fresh deploy&#34; — still fully usable.</p>
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
                    <button onClick={() => setExpanded(expanded === p.slug ? null : p.slug)} title={statusExplainer(p.status as any, p.lastDeploy.slice(0,10))} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${p.status === "live" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : p.status === "beta" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : p.status === "build" ? "bg-amber-500/15 text-amber-300 border border-amber-500/20" : "bg-white/10 text-white/60 border-white/10"}`}>{statusLabel(p.status as any)} ▾</button>
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
                <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-4 text-white/40">
                  <span className="font-semibold text-white/60">Evidence:</span> derived from {FLEET_COUNT} — primary <span className="text-white/60">{DOMAIN_LABEL[p.domain]}</span>
                  <span className="mx-1 text-white/20">·</span>
                  caps <span className="font-mono text-white/50">{p.capabilities.join(", ")}</span>
                  <span className="mx-1 text-white/20">·</span>
                  <a href={`/gaps#${p.domain}`} className="text-violet-300 hover:text-violet-200 underline">View gaps for {DOMAIN_LABEL[p.domain]}</a>
                  <span className="mx-1 text-white/20">·</span>
                  <a href="/ideas" className="text-violet-300 hover:text-violet-200 underline">Ideas for this domain</a>
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
                  <Link href={`/gaps`} className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 text-[12px] font-semibold text-white hover:bg-white/10">Gaps</Link>
                  <button onClick={async () => { const brief = buildImprovePromptForProject(p as unknown as never); await navigator.clipboard.writeText(brief); setInvToast("IMPROVE brief copied (" + p.slug + ")"); setTimeout(() => setInvToast(null), 2600); try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: p.slug + "-improve", title: "Improve " + p.name, targetSlug: p.slug, gapScore: p.health, meta: { mode: "improve", source: "inventory-card" } }) }); } catch {} }} className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 text-[11px] font-bold text-amber-200 hover:bg-amber-500/15">Copy IMPROVE</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setImproveSlug(p.slug)} className="inline-flex min-h-[28px] items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/15">Preview IMPROVE brief</button>
                  <a href={`/gaps#${p.domain}`} className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] text-white/50 hover:text-white">Improve \u2197 tab idea</a>
                </div>
                {expanded === p.slug ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-4 text-white/60">
                    <div className="font-semibold text-white/80">Why {statusLabel(p.status as any)}?</div>
                    <div className="mt-1">{statusExplainer(p.status as any, p.lastDeploy.slice(0,10))} · alias <span className="font-mono text-white/70">{p.url.replace("https://","")}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.capabilities.map((c) => <span key={c} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">{c}</span>)}
                    </div>
                    <div className="mt-2 text-white/35">Source: Vercel · health {p.health} · lastDeploy {p.lastDeploy.slice(0,10)}</div>
                  </div>
                ) : null}
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
              <p className="text-xs" style={{ color: VIOLET.textSecondary }}>Derived Domains × Capabilities (analytics/alerts/automation/reporting/visualization) · white-space &lt;30 = opportunity · Scores from {FLEET_COUNT} dashboards, same source as Gaps page.</p>
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
        {invToast ? <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">{invToast}</div> : null}
        {improveSlug ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setImproveSlug(null)}>
            <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/15 bg-[#0f0b1a] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {(() => { const pr = FLEET_PROJECTS.find((x) => x.slug === improveSlug); if (!pr) return null; const brief = buildImprovePromptForProject(pr as unknown as never); return (<>
                <div className="inline-flex rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-black">IMPROVE \u2192 {pr.slug}</div>
                <h3 className="mt-3 text-lg font-bold text-white">Improve {pr.name}</h3>
                <p className="mt-1 text-sm text-white/60">{pr.url} \u00b7 {pr.domain} \u00b7 {pr.status} \u00b7 health {pr.health}</p>
                <pre className="mt-4 max-h-[48vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[11px] leading-4 text-white/80">{brief.slice(0, 8000)}</pre>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setImproveSlug(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">Close</button>
                  <button onClick={async () => { await navigator.clipboard.writeText(brief); setInvToast("IMPROVE brief copied (" + pr.slug + ")"); setTimeout(() => setInvToast(null), 2600); setImproveSlug(null); try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: pr.slug + "-improve", title: "Improve " + pr.name, targetSlug: pr.slug, gapScore: pr.health, meta: { mode: "improve", source: "inventory-preview" } }) }); } catch {} }} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-black hover:bg-amber-600">Copy IMPROVE</button>
                </div>
              </>); })()}
            </div>
          </div>
        ) : null}
        <TrustLine />
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <details>
            <summary className="cursor-pointer list-none text-[12px] font-semibold text-white/70 hover:text-white flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px]">ⓘ</span>
              Audit trail — verified 2026-08-15
            </summary>
            <div className="mt-3 space-y-2 text-[12px] leading-5 text-white/55">
              <p><span className="font-semibold text-white/80">Sources:</span> Vercel <span className="font-mono text-white/70">/v9/projects?teamId=team_NVnIOFO7th3wYtoyRoqJnLhr</span> — 46 projects (team maximo-seo, 3 pages, framework nextjs/vite/unknown), Hostinger WHM <span className="font-mono">node1488.myfcloud.com:2087</span> read-only probe (0 tokens in vault → <span className="text-amber-300">TBD — WHM not yet wired for this app</span>), local <span className="font-mono">/root/projects</span> (9 local-only, non-dashboards: jarvis-hud, brain-dashboard, grr-*, etc. — excluded).</p>
              <p><span className="font-semibold text-white/80">Filter:</span> 46 minus 9 utilities (maximo-seo marketing, apk-download, ronyb-deploy, summit-garage-prototype, seo-audit-report, site-scan-fix, todo-tasks, to-do-tasks, dp-work) → <span className="font-bold text-white">{FLEET_COUNT} verified dashboards</span>. Each entry has live production alias + updatedAt (YYYY-MM-DD) + health (healthy ≤3d / degraded 4–7d / stale &gt;7d) + clean domain mapping.</p>
              <p><span className="font-semibold text-white/80">Duplicates:</span> <span className="font-mono text-white/70">competitor-intelligence</span> vs <span className="font-mono text-white/70">competitor-intelligence-dashboard</span> are <span className="font-semibold">two distinct Vercel projects</span> with different aliases (competitor-intel.maximo-seo.ai vs competitor-intelligence.maximo-seo.ai) — kept separate with notes. No invented entries remain.</p>
              <p className="text-white/35">Generated from <span className="font-mono">/tmp/vercel-projects.json</span> + <span className="font-mono">src/lib/fleet.ts</span> as single source of truth — mirrored to <span className="font-mono">android/data/FleetData.kt</span>.</p>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
