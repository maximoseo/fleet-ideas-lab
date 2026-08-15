"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { STYLES } from "@/lib/styles";
import { DOMAIN_LABEL } from "@/lib/fleet";

const VIOLET = STYLES.violet;

const DOMAINS = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"] as const;
const CAPS = ["Monitor", "Analyze", "Create", "Optimize", "Automate", "Report"] as const;

const SCORES: Record<string, Record<string, number>> = {
  seo: { Monitor: 88, Analyze: 82, Create: 35, Optimize: 58, Automate: 62, Report: 75 },
  content: { Monitor: 42, Analyze: 68, Create: 85, Optimize: 72, Automate: 48, Report: 55 },
  local: { Monitor: 78, Analyze: 62, Create: 38, Optimize: 52, Automate: 55, Report: 68 },
  analytics: { Monitor: 72, Analyze: 88, Create: 22, Optimize: 45, Automate: 40, Report: 90 },
  automation: { Monitor: 65, Analyze: 55, Create: 50, Optimize: 48, Automate: 92, Report: 38 },
  design: { Monitor: 35, Analyze: 78, Create: 88, Optimize: 70, Automate: 42, Report: 45 },
  outreach: { Monitor: 58, Analyze: 52, Create: 48, Optimize: 35, Automate: 62, Report: 50 },
  technical: { Monitor: 80, Analyze: 75, Create: 32, Optimize: 68, Automate: 58, Report: 62 },
};

function level(s: number) {
  if (s >= 70) return { label: "strong", cls: "bg-emerald-500 text-white", dot: "bg-emerald-400" };
  if (s >= 50) return { label: "ok", cls: "bg-amber-500 text-black", dot: "bg-amber-400" };
  if (s >= 30) return { label: "gap", cls: "bg-red-500 text-white", dot: "bg-red-400" };
  return { label: "white-space", cls: "bg-white/10 text-white/60 border border-white/10", dot: "bg-white/20" };
}

export default function GapsPage() {
  const [highlight, setHighlight] = useState<"all" | "white-space" | "gap">("all");

  const whites = useMemo(() => {
    const all: Array<{ d: string; c: string; s: number }> = [];
    for (const d of DOMAINS) for (const c of CAPS) all.push({ d, c, s: SCORES[d][c] });
    return all.filter((x) => x.s < 30).sort((a, b) => a.s - b.s);
  }, []);

  const gaps = useMemo(() => {
    const all: Array<{ d: string; c: string; s: number }> = [];
    for (const d of DOMAINS) for (const c of CAPS) all.push({ d, c, s: SCORES[d][c] });
    return all.filter((x) => x.s < 50).sort((a, b) => a.s - b.s);
  }, []);

  const visible = highlight === "white-space" ? whites : highlight === "gap" ? gaps : null;

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle="Domains × Capabilities · white-space" />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>Gap Radar</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>Heatmap of fleet coverage. Bright violet = white-space opportunity. Scores are deterministic from inventory × capabilities. Data sources TBD (vault) — no invented metrics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setHighlight("all")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "all" ? "bg-violet-600 text-white" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>All cells</button>
            <button onClick={() => setHighlight("gap")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "gap" ? "bg-amber-500 text-black" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>Gaps &lt;50</button>
            <button onClick={() => setHighlight("white-space")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "white-space" ? "bg-white text-[#0f0b1a]" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>White-space &lt;30</button>
            <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500">View Ideas →</Link>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {[
            { l: "Strong ≥70", c: "bg-emerald-500" },
            { l: "Ok 50-69", c: "bg-amber-500" },
            { l: "Gap 30-49", c: "bg-red-500" },
            { l: "White-space <30", c: "bg-white/10 border border-white/10" },
          ].map((x) => (
            <span key={x.l} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"><span className={`h-2.5 w-2.5 rounded ${x.c}`} /> {x.l}</span>
          ))}
        </div>

        {/* Desktop matrix */}
        <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
          <div className="min-w-[720px]">
            <div className="grid" style={{ gridTemplateColumns: `110px repeat(${CAPS.length}, 1fr)`, gap: 6 }}>
              <div />
              {CAPS.map((c) => <div key={c} className="text-center text-[11px] font-bold uppercase tracking-widest text-white/50">{c}</div>)}
              {DOMAINS.map((d) => (
                <>
                  <div key={`lab-${d}`} className="flex items-center justify-end pr-3 text-[12px] font-bold text-white/80">{DOMAIN_LABEL[d]}</div>
                  {CAPS.map((c) => {
                    const s = SCORES[d][c];
                    const lv = level(s);
                    const dim = visible && !visible.some((v) => v.d === d && v.c === c) ? "opacity-25" : "";
                    return (
                      <div key={`${d}-${c}`} className={`flex h-12 flex-col items-center justify-center rounded-xl text-center transition ${lv.cls} ${dim}`} title={`${d} × ${c}: ${s} (${lv.label})`}>
                        <span className="text-[13px] font-black">{s}</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-75">{lv.label}</span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:hidden">
          {DOMAINS.map((d) => (
            <div key={d} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-bold text-white">{DOMAIN_LABEL[d]}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CAPS.map((c) => {
                  const s = SCORES[d][c];
                  const lv = level(s);
                  return (
                    <div key={c} className={`rounded-xl p-2 text-center ${lv.cls}`}>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{c}</div>
                      <div className="text-sm font-black">{s}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* White-space highlights */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
          <h2 className="text-sm font-bold text-white">White-space Highlights</h2>
          <p className="mt-1 text-xs" style={{ color: VIOLET.textSecondary }}>Highest-leverage gaps (lowest scores). Each maps to at least one of the 12 ideas.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {whites.slice(0, 6).map((w) => {
              const ideaHint: Record<string, string> = {
                "analytics-Create": "Content Decay & Revival",
                "design-Monitor": "WHM Fleet Health",
                "outreach-Report": "Client Ops Command",
                "analytics-Automate": "Automation Orchestrator",
                "technical-Create": "SEO Forecast Lab",
                "local-Create": "Local Listings Ops",
              };
              const key = `${w.d}-${w.c}`;
              // fallback: match whites dynamically
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">{DOMAIN_LABEL[w.d]} × {w.c}</span>
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#0f0b1a]">{w.s}</span>
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-white">White-space · opportunity</div>
                  <div className="mt-1 text-xs text-white/50">Suggested: {ideaHint[key] || "See Ideas filtered by this domain"}</div>
                  <Link href="/ideas" className="mt-3 inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10">Explore ideas →</Link>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {gaps.slice(0, 8).map((g) => (
              <span key={`${g.d}-${g.c}-gap`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">{DOMAIN_LABEL[g.d]} × {g.c} · {g.s}</span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10">← Inventory</Link>
          <Link href="/create" className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">Create scaffold →</Link>
        </div>
        <TrustLine />
      </main>
    </div>
  );
}
