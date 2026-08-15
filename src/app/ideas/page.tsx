"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import TrustLine from "@/components/TrustLine";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, DOMAIN_LABEL, DOMAIN_COLOR, type FleetDomain, type Effort, type Priority, type Impact, type IdeaStatus, type FleetIdea } from "@/lib/fleet";
import { buildAgentPrompt } from "@/lib/agentPrompt";

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
  const [kind, setKind] = useState<"all" | "new" | "enhancement">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [scaffolding, setScaffolding] = useState<string | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [confirmIdea, setConfirmIdea] = useState<FleetIdea | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pullStart = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const base = FLEET_IDEAS.filter((it) => {
      if (domain !== "all" && it.domain !== domain) return false;
      if (effort !== ("all" as unknown as Effort) && it.effort !== effort) return false;
      if (impact !== ("all" as unknown as Impact) && it.impact !== impact) return false;
      if (status !== ("all" as unknown as IdeaStatus) && it.status !== status) return false;
      if (kind !== "all" && (it as unknown as { kind: string }).kind !== kind) return false;
      if (q && !`${it.title} ${it.slug} ${it.description} ${it.whyNow} ${it.problem} ${it.solution}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (shuffleSeed === 0) return base;
    const n = base.length || 1;
    const k = shuffleSeed % n;
    return [...base.slice(k), ...base.slice(0, k)];
  }, [domain, effort, impact, status, kind, q, shuffleSeed]);

  async function copyPrompt(idea: FleetIdea) {
    const full = buildAgentPrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast("Full agent brief copied (" + idea.slug + ")");
    setTimeout(() => setToast(null), 2200);
  }

  async function doScaffold(idea: FleetIdea) {
    setScaffolding(idea.id);
    setScaffoldResult(null);
    setConfirmIdea(null);
    try {
      const res = await fetch("/api/fleet/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: idea.slug, ideaId: idea.id, kind: idea.kind, targetSlug: idea.targetSlug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const modeNote = data.mode === "vercel-tmp" ? " (Vercel /tmp — ephemeral, clone to /root/projects/" + data.slug + " on dev server)" : "";
      const kindNote = data.kind === "enhancement" && data.targetSlug ? " — feature branch for " + data.targetSlug + " (merge as tab)" : " — new standalone dashboard";
      setScaffoldResult("\u2713 " + (data.kind === "enhancement" ? "Tab scaffolded" : "Dashboard scaffolded") + " " + data.slug + " at " + data.dir + modeNote + kindNote + (data.note ? " · " + data.note : ""));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setScaffoldResult("\u2717 " + msg);
    } finally {
      setScaffolding(null);
      setTimeout(() => setScaffoldResult(null), 6000);
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
      <SiteHeader subtitle="12 ideas \u00b7 professional briefs + scaffold" />
      {pullY > 0 ? (
        <div className="flex justify-center py-2" style={{ height: 36, opacity: pullY / 72 }}>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${pullY > 48 ? "border-violet-500/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-white/50"}`}>
            <span className={pullY > 48 || reloading ? "animate-spin inline-block" : ""}>{pullY > 48 ? "\u21bb" : "\u2193"}</span>
            {pullY > 48 ? "Release to reload" : "Pull to reload"}
          </span>
        </div>
      ) : null}
      {reloading ? <div className="h-0.5 w-full overflow-hidden bg-white/10"><div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-violet-500" /></div> : null}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>Ideas</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>{FLEET_IDEAS.length} professional briefs — deduplicated against 37 live dashboards. <span className="font-semibold text-emerald-300">5 New dashboards</span> (white-space) + <span className="font-semibold text-amber-300">6 Enhancements</span> (add as tab inside existing dashboard) — 1 duplicate removed (Content Decay already live). Tap to expand full brief with evidence.</p>
          </div>
          <div className="flex gap-2"><button onClick={doReload} disabled={reloading} className="inline-flex min-h-[44px] items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50">{reloading ? "\u21bb Reloading\u2026" : "Find more ideas \u21bb"}</button><Link href="/create" className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">Create \u2192</Link></div>
        </div>

        {/* Filters */}
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"] as const).map((d) => (
                <button key={d} onClick={() => setDomain(d as FleetDomain | "all")} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold transition ${domain === d ? "bg-violet-600 text-white" : "text-white/60 hover:text-white"}`}>{d === "all" ? "All Domains" : DOMAIN_LABEL[d]}</button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "new", "enhancement"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${kind === k ? "bg-violet-600 text-white" : "text-white/60 hover:text-white"}`}>{k === "all" ? "All kinds" : k === "new" ? "New" : "Enhancement"}</button>
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
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ideas, problem, solution\u2026" className="w-full sm:w-64 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500 focus:outline-none" />
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
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${idea.kind === "new" ? "bg-emerald-500 text-white" : "bg-amber-500 text-black"}`}>{idea.kind === "new" ? "NEW" : "ENHANCE"}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${idea.impact === "high" ? "bg-emerald-500/15 text-emerald-300" : idea.impact === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-white/60"}`}>{idea.impact}</span>
              </div>
              <h3 className="mt-2 text-[15px] font-bold leading-tight text-white">{idea.title}</h3>
              <p className="mt-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] leading-5 text-amber-100/90">
                <span className="font-bold">Why now:</span> {idea.whyNow}
              </p>
              <p className="mt-2 text-[13px] leading-5 line-clamp-2" style={{ color: VIOLET.textSecondary }}>{idea.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {idea.widgets.slice(0, 4).map((w) => (
                  <span key={w} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60">{w}</span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-bold ${idea.gapScore < 30 ? "bg-white text-[#0f0b1a]" : idea.gapScore < 50 ? "bg-red-500 text-white" : idea.gapScore < 70 ? "bg-amber-500 text-black" : "bg-emerald-500 text-white"}`}>Gap {idea.gapScore}%</span>
                {idea.targetSlug ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/60">→ {idea.targetSlug}</span> : null}
                <span className="text-white/30">{idea.kind === "new" ? "New dashboard" : "Add as tab inside existing"}</span>
              </div>

              {/* Professional brief toggle */}
              <button onClick={() => setExpanded(expanded === idea.id ? null : idea.id)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]">
                <span className="text-[12px] font-semibold text-white">{expanded === idea.id ? "Hide professional brief \u25b2" : "Professional brief \u25bc"}</span>
                <span className="text-[11px] text-white/40">Problem \u00b7 Solution \u00b7 Benefit \u00b7 Data \u00b7 Feasibility</span>
              </button>

              {expanded === idea.id ? (
                <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-[12px] leading-5">
                  <div><span className="font-bold text-red-300">Problem:</span> <span className="text-white/70">{idea.problem}</span></div>
                  <div><span className="font-bold text-violet-300">Solution:</span> <span className="text-white/70">{idea.solution}</span></div>
                  <div><span className="font-bold text-emerald-300">Benefit:</span> <span className="text-white/70">{idea.benefit}</span></div>
                  <div><span className="font-bold text-amber-300">Data needed:</span> <span className="text-white/60">{idea.dataNeeded}</span></div>
                  <div><span className="font-bold text-white/60">Feasibility:</span> <span className="text-white/60">{idea.feasibility}</span></div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3"><span className="font-bold text-amber-200">Evidence (vs 37 live):</span> <span className="text-amber-100/80">{idea.evidence}</span></div>
                  <div className="rounded-lg bg-white/5 p-3"><span className="font-bold text-white">Next step:</span> <span className="text-violet-200">{idea.nextStep}</span> {idea.targetSlug ? <span className="text-white/40">· target: {idea.targetSlug}</span> : null}</div>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2">
                {idea.dashboardUrl ? (
                  <a href={idea.dashboardUrl} target="_blank" rel="noopener" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#0f0b1a] hover:bg-white/90 text-center leading-tight px-2">Open \u2197</a>
                ) : (
                  <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white/40">No URL</span>
                )}
                <button onClick={() => copyPrompt(idea)} title="Copy full agent brief (Markdown) — Web Next.js + Android Kotlin + data + widgets + acceptance" className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-[12px] font-semibold text-white hover:bg-white/10">Copy brief</button>
                <button onClick={() => setConfirmIdea(idea)} disabled={scaffolding === idea.id} title={idea.kind === "enhancement" ? "Scaffold as feature tab inside " + (idea.targetSlug || "") + " at /root/projects/" + idea.slug + " (or /tmp on Vercel)" : "Create new dashboard at /root/projects/" + idea.slug + " (or /tmp on Vercel)"} className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-2 text-[12px] font-semibold disabled:opacity-50 ${idea.kind === "enhancement" ? "border border-amber-500/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/20" : "bg-violet-600 text-white hover:bg-violet-500"}`}> 
                  {scaffolding === idea.id ? "\u2026" : idea.kind === "enhancement" ? "Scaffold tab \u2192 " + (idea.targetSlug || "") : "Create dashboard"}
                </button>
              </div>
              <div className="mt-2 text-center text-[11px] text-white/30">{idea.slug}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">No ideas match your filters.</p>
            <button onClick={() => { setDomain("all"); setEffort("all" as unknown as Effort); setImpact("all" as unknown as Impact); setStatus("all" as unknown as IdeaStatus); setKind("all"); setQ(""); }} className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">Clear filters</button>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">
            {toast}
          </div>
        ) : null}
        {/* Scaffold confirmation — distinct for new vs enhancement */}
        {confirmIdea ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmIdea(null)}>
            <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0f0b1a] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${confirmIdea.kind === "new" ? "bg-emerald-500 text-white" : "bg-amber-500 text-black"}`}>{confirmIdea.kind === "new" ? "NEW DASHBOARD" : "ENHANCEMENT → " + (confirmIdea.targetSlug || "")}</div>
              <h3 className="mt-3 text-lg font-bold text-white">{confirmIdea.kind === "new" ? "Create new dashboard: " + confirmIdea.slug + "?" : "Add feature tab to " + (confirmIdea.targetSlug || "") + "?"}</h3>
              <p className="mt-2 text-sm leading-5 text-white/60">
                {confirmIdea.kind === "new"
                  ? "This will scaffold a new Next.js project at /root/projects/" + confirmIdea.slug + " (or /tmp/" + confirmIdea.slug + " on Vercel — ephemeral, clone to dev server). Includes package.json + README.md. No inventory entry is added until the Vercel alias is verified live. Source: this Fleet Ideas Lab brief."
                  : "This will scaffold at /root/projects/" + confirmIdea.slug + " as a feature branch for " + (confirmIdea.targetSlug || "") + " — intended to be merged as a tab inside " + (confirmIdea.targetSlug || "") + ", not a standalone project or Vercel site."}
              </p>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-4 text-white/50">
                <div>Slug: <span className="font-mono text-white/70">{confirmIdea.slug}</span> · Gap {confirmIdea.gapScore}% · {confirmIdea.evidence.slice(0, 120)}…</div>
                <div className="mt-1">Widgets: {confirmIdea.widgets.join(" · ")}</div>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setConfirmIdea(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">Cancel</button>
                <button onClick={() => doScaffold(confirmIdea)} className={`flex-1 rounded-full py-3 text-sm font-semibold ${confirmIdea.kind === "new" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-amber-500 text-black hover:bg-amber-600"}`}>{confirmIdea.kind === "new" ? "Create dashboard" : "Scaffold tab"}</button>
              </div>
            </div>
          </div>
        ) : null}
        <TrustLine />
      </main>
    </div>
  );
}
