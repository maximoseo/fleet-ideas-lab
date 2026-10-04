"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { STYLES } from "@/lib/styles";
import { useLang, pick, type Bi, type Lang } from "@/components/i18n";
import { DOMAIN_LABEL, GAP_SCORES, gapProjects, FLEET_INVENTORY, FLEET_COUNT, type FleetDomain, type Capability } from "@/lib/fleet";

const VIOLET = STYLES.violet;

// Gaps uses the same 8 FleetDomain + 5 Capability axes as the inventory derives
const DOMAINS: FleetDomain[] = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
const CAPS: Capability[] = ["analytics", "alerts", "automation", "reporting", "visualization"];
const CAP_LABEL: Record<string, Bi> = {
  analytics: { en: "Analytics", he: "אנליטיקס" },
  alerts: { en: "Alerts", he: "התראות" },
  automation: { en: "Automate", he: "אוטומציה" },
  reporting: { en: "Report", he: "דוחות" },
  visualization: { en: "Visualize", he: "ויזואליזציה" },
};
// Raw capability ids shown as column headers / chips
const CAP_RAW: Record<string, Bi> = {
  analytics: { en: "analytics", he: "אנליטיקס" },
  alerts: { en: "alerts", he: "התראות" },
  automation: { en: "automation", he: "אוטומציה" },
  reporting: { en: "reporting", he: "דוחות" },
  visualization: { en: "visualization", he: "ויזואליזציה" },
};

const DOMAIN_HE: Record<string, string> = {
  seo: "SEO", content: "תוכן", local: "מקומי", analytics: "אנליטיקס", automation: "אוטומציה", design: "עיצוב", outreach: "פנייה ללקוחות", technical: "טכני",
  geo: "GEO", whm: "WHM", competitor: "מתחרים", reporting: "דוחות", "client-ops": "תפעול לקוחות",
};
function domainLabel(d: string, lang: Lang) {
  return lang === "he" ? DOMAIN_HE[d] ?? DOMAIN_LABEL[d] : DOMAIN_LABEL[d];
}

function level(s: number) {
  if (s >= 70) return { label: "strong", he: "חזק", cls: "bg-emerald-500 text-white", dot: "bg-emerald-400" };
  if (s >= 50) return { label: "ok", he: "סביר", cls: "bg-amber-500 text-black", dot: "bg-amber-400" };
  if (s >= 30) return { label: "gap", he: "פער", cls: "bg-red-500 text-white", dot: "bg-red-400" };
  return { label: "white-space", he: "שטח לבן", cls: "bg-white/10 text-white/75 border border-white/10", dot: "bg-white/20" };
}

export default function GapsPage() {
  const { lang, tr } = useLang();
  const cap = (c: string) => (CAP_RAW[c] ? pick(CAP_RAW[c], lang) : c);
  const capName = (c: string) => (CAP_LABEL[c] ? pick(CAP_LABEL[c], lang) : c);
  const [highlight, setHighlight] = useState<"all" | "white-space" | "gap">("all");
  const [cell, setCell] = useState<{ d: FleetDomain; c: Capability } | null>(null);

  const whites = useMemo(() => {
    const all: Array<{ d: string; c: string; s: number }> = [];
    for (const d of DOMAINS) for (const c of CAPS) all.push({ d, c, s: GAP_SCORES[d][c] });
    return all.filter((x) => x.s < 30).sort((a, b) => a.s - b.s);
  }, []);

  const gaps = useMemo(() => {
    const all: Array<{ d: string; c: string; s: number }> = [];
    for (const d of DOMAINS) for (const c of CAPS) all.push({ d, c, s: GAP_SCORES[d][c] });
    return all.filter((x) => x.s < 50).sort((a, b) => a.s - b.s);
  }, []);

  const visible = highlight === "white-space" ? whites : highlight === "gap" ? gaps : null;

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle={tr("Domains × Capabilities · white-space", "תחומים × יכולות · שטח לבן")} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>{tr("Gap Radar", "רדאר פערים")}</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>{tr(`Derived heatmap: each cell = % of the dashboards in that domain that expose the capability (${FLEET_COUNT} in the fleet overall). White-space means “no one does this yet” — opportunity. Tap any cell for why the score + which dashboards cover it (or none — see linked idea). Data sources TBD (vault) — no invented metrics.`, `מפת חום נגזרת: כל תא = אחוז הדשבורדים בתחום שמספקים את היכולת (${FLEET_COUNT} בצי כולו). שטח לבן אומר ״אף אחד עדיין לא עושה את זה״ — הזדמנות. לחצו על תא כדי לראות מדוע הציון כזה ואילו דשבורדים מכסים אותו (או אף אחד — ראו את הרעיון המקושר). מקורות הנתונים TBD (vault) — בלי מדדים מומצאים.`)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setHighlight("all")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "all" ? "bg-violet-600 text-white" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>{tr("All cells", "כל התאים")}</button>
            <button onClick={() => setHighlight("gap")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "gap" ? "bg-amber-500 text-black" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>{tr("Gaps <50", "פערים <50")}</button>
            <button onClick={() => setHighlight("white-space")} className={`min-h-[36px] rounded-full px-4 text-[13px] font-semibold ${highlight === "white-space" ? "bg-white text-[#0f0b1a]" : "border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>{tr("White-space <30", "שטח לבן <30")}</button>
            <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500">{tr("View Ideas →", "צפייה ברעיונות ←")}</Link>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {[
            { l: tr("Strong ≥70", "חזק ≥70"), c: "bg-emerald-500" },
            { l: tr("Ok 50-69", "סביר 50-69"), c: "bg-amber-500" },
            { l: tr("Gap 30-49", "פער 30-49"), c: "bg-red-500" },
            { l: tr("White-space <30", "שטח לבן <30"), c: "bg-white/10 border border-white/10" },
          ].map((x) => (
            <span key={x.c} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"><span className={`h-2.5 w-2.5 rounded ${x.c}`} /> {x.l}</span>
          ))}
        </div>

        {/* Desktop matrix */}
        <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
          <div className="min-w-[720px]">
            <div className="grid" style={{ gridTemplateColumns: `110px repeat(${CAPS.length}, 1fr)`, gap: 6 }}>
              <div />
              {CAPS.map((c) => <div key={c} className="text-center text-[11px] font-bold uppercase tracking-widest text-white/50">{cap(c)}</div>)}
              {DOMAINS.map((d) => (
                <>
                  <div key={`lab-${d}`} className="flex items-center justify-end pe-3 text-[12px] font-bold text-white/80">{domainLabel(d, lang)}</div>
                  {CAPS.map((c) => {
                    const s = GAP_SCORES[d][c];
                    const lv = level(s);
                    const dim = visible && !visible.some((v) => v.d === d && v.c === c) ? "opacity-25" : "";
                    return (
                      <button key={`${d}-${c}`} onClick={() => setCell({ d: d as FleetDomain, c: c as Capability })} className={`flex h-12 w-full flex-col items-center justify-center rounded-xl text-center transition ${lv.cls} ${dim} hover:brightness-110`} title={tr(`${d} × ${c}: ${s} (${lv.label}) — tap for details`, `${domainLabel(d, lang)} × ${cap(c)}: ${s} (${lv.he}) — לחצו לפרטים`)}>
                        <span className="text-[13px] font-black">{s}</span>
                        <span className="text-[9px] uppercase tracking-widest opacity-75">{tr(lv.label, lv.he)}</span>
                      </button>
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
              <div className="text-sm font-bold text-white">{domainLabel(d, lang)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CAPS.map((c) => {
                  const s = GAP_SCORES[d][c];
                  const lv = level(s);
                  return (
                    <button key={c} onClick={() => setCell({ d: d as FleetDomain, c: c as Capability })} className={`rounded-xl p-2 text-center w-full ${lv.cls} hover:brightness-110`}>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{capName(c as string)}</div>
                      <div className="text-sm font-black">{s}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cell drawer */}
        {cell ? (() => {
          const s = GAP_SCORES[cell.d][cell.c];
          const lv = level(s);
          const projects = gapProjects(cell.d, cell.c);
          return (
            <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-violet-200">{domainLabel(cell.d, lang)} × {capName(cell.c)}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{tr("Score", "ציון")} {s} · <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lv.cls}`}>{tr(lv.label, lv.he)}</span></div>
                  <p className="mt-2 max-w-2xl text-[12px] leading-5 text-white/75">{lang === "he" ? (<>למה {s}? <span className="text-white/80">{projects.length === 0 ? "כרגע אף דשבורד לא מכסה את צירוף התחום והיכולת הזה — הזדמנות של שטח לבן." : `${projects.length} מתוך ${FLEET_INVENTORY.filter((p) => p.domains[0] === cell.d).length || projects.length} דשבורדים ב${domainLabel(cell.d, lang)} מכסים את הצירוף הזה (${Math.round(s)}% כיסוי).`}</span> שיטה: ספירת רשומות מלאי מאומתות שהתחום הראשי שלהן = {domainLabel(cell.d, lang)} והיכולות שלהן כוללות {capName(cell.c)}. בלי מדדים מומצאים — מקורות vault מסומנים TBD.</>) : (<>Why {s}? <span className="text-white/80">{projects.length === 0 ? "No dashboard currently covers this exact domain×capability — white-space opportunity." : `${projects.length} of ${FLEET_INVENTORY.filter((p) => p.domains[0] === cell.d).length || projects.length} dashboards in ${DOMAIN_LABEL[cell.d]} cover this pair (${Math.round(s)}% coverage).`}</span> Method: count of verified inventory entries whose primary domain = {DOMAIN_LABEL[cell.d]} and capabilities include {CAP_LABEL[cell.c].en}. No invented metrics — vault sources flagged TBD.</>)}</p>
                </div>
                <button onClick={() => setCell(null)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">{tr("Close ✕", "סגירה ✕")}</button>
              </div>
              {projects.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {projects.slice(0, 8).map((p) => (
                    <a key={p.slug} href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0f0b1a] hover:bg-white/90">{p.name} ↗</a>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-white px-4 text-xs font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("See ideas for this gap →", "רעיונות לפער הזה ←")}</Link>
                  <Link href="/" className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white/10">{tr("View matching dashboards", "צפייה בדשבורדים תואמים")}</Link>
                </div>
              )}
            </div>
          );
        })() : null}

        {/* White-space highlights */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
          <h2 className="text-sm font-bold text-white">{tr("White-space Highlights", "שטחים לבנים מובילים")}</h2>
          <p className="mt-1 text-xs" style={{ color: VIOLET.textSecondary }}>{tr("Highest-leverage gaps (lowest scores). Each maps to at least one of the 12 ideas.", "הפערים בעלי ההשפעה הגבוהה ביותר (הציונים הנמוכים ביותר). כל אחד מהם מתאים ללפחות אחד מ-12 הרעיונות.")}</p>
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
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/75">{domainLabel(w.d, lang)} × {cap(w.c)}</span>
                    <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#0f0b1a]">{w.s}</span>
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-white">{tr("White-space · opportunity", "שטח לבן · הזדמנות")}</div>
                  <div className="mt-1 text-xs text-white/50">{tr("Suggested:", "מוצע:")} {ideaHint[key] || tr("See Ideas filtered by this domain", "ראו רעיונות מסוננים לפי התחום הזה")}</div>
                  <Link href="/ideas" className="mt-3 inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10">{tr("Explore ideas →", "גילוי רעיונות ←")}</Link>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {gaps.slice(0, 8).map((g) => (
              <span key={`${g.d}-${g.c}-gap`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">{domainLabel(g.d, lang)} × {cap(g.c)} · {g.s}</span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10">{tr("← Inventory", "→ מלאי")}</Link>
          <Link href="/create" className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">{tr("Create scaffold →", "יצירת שלד ←")}</Link>
        </div>
        <TrustLine />
      </main>
    </div>
  );
}
