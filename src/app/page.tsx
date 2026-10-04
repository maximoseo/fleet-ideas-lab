"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import FleetStrip from "@/components/FleetStrip";
import AskFleetCard from "@/components/AskFleetCard";
import { STYLES } from "@/lib/styles";
import { FLEET_PROJECTS, FLEET_IDEAS, FLEET_COUNT, DOMAIN_LABEL, DOMAIN_COLOR, healthLevel, HEALTH_COLOR, statusLabel, statusExplainer, GAP_SCORES, gapLevel, type FleetDomain, type Capability, type FleetStatus } from "@/lib/fleet";
import { buildImprovePromptForProject } from "@/lib/agentPrompt";
import TrustLine from "@/components/TrustLine";
import { useLang, pick, type Bi, type Lang } from "@/components/i18n";
import { localizeIdea, localizeProject, localizeStatusExplainer } from "@/lib/fleet.he";

const VIOLET = STYLES.violet;
const DOMAINS: (FleetDomain | "all")[] = ["all", "seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
const STATUS: (FleetDomain | "all" | "live" | "beta" | "build" | "concept")[] = ["all", "live", "beta", "build", "concept"];

// Display labels (stored values stay unchanged)
const DOMAIN_HE: Record<string, string> = {
  seo: "SEO", content: "תוכן", local: "מקומי", analytics: "אנליטיקס", automation: "אוטומציה", design: "עיצוב", outreach: "פנייה ללקוחות", technical: "טכני",
  geo: "GEO", whm: "WHM", competitor: "מתחרים", reporting: "דוחות", "client-ops": "תפעול לקוחות",
};
function domainLabel(d: string, lang: Lang) {
  return lang === "he" ? DOMAIN_HE[d] ?? DOMAIN_LABEL[d] : DOMAIN_LABEL[d];
}
const STATUS_LABEL: Record<string, Bi> = {
  live: { en: "Live", he: "חי" },
  beta: { en: "Beta", he: "בטא" },
  build: { en: "Build", he: "בנייה" },
  concept: { en: "Concept", he: "קונספט" },
};
const HEALTH_LABEL: Record<string, Bi> = {
  excellent: { en: "excellent", he: "מצוין" },
  good: { en: "good", he: "טוב" },
  "needs-attention": { en: "needs-attention", he: "דורש תשומת לב" },
  critical: { en: "critical", he: "קריטי" },
};
const GAP_LEVEL_LABEL: Record<string, Bi> = {
  strong: { en: "strong", he: "חזק" },
  ok: { en: "ok", he: "סביר" },
  gap: { en: "gap", he: "פער" },
  "white-space": { en: "white-space", he: "שטח לבן" },
};

function formatDate(iso: string, tr: (en: string, he: string) => string, locale: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return tr("today", "היום");
    if (diff === 1) return tr("1d ago", "לפני יום");
    if (diff < 30) return tr(`${diff}d ago`, `לפני ${diff} ימים`);
    return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
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
  const { lang, tr } = useLang();
  // Derived — single source of truth: GAP_SCORES (domain x capability % within each domain)
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
        {caps.map((c) => <div key={c} className="text-center text-[9px] font-bold uppercase tracking-widest text-white/65">{capLabel[c]}</div>)}
        {domains.map((d) => (
          <div key={`row-${d}`} className="contents">
            <div className="text-end pe-2 text-[11px] font-medium text-white/75 self-center">{domainLabel(d, lang)}</div>
            {caps.map((c) => {
              const s = GAP_SCORES[d]?.[c] ?? 8;
              const lvl = gapLevel(s);
              return <div key={`${d}-${c}`} title={tr(`${DOMAIN_LABEL[d]} x ${c}: ${s}% (${lvl}) — % of the dashboards in this domain`, `${domainLabel(d, lang)} x ${c}: ${s}% (${pick(GAP_LEVEL_LABEL[lvl], lang)}) — % מהדשבורדים בתחום הזה`)} className={`h-7 rounded-md ${cellColor(s)} flex items-center justify-center text-[10px] font-bold ${s < 30 ? "text-white/75" : "text-white/90"}`}>{s}</div>;
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-3 text-white/60">{tr("ANL=analytics · ALT=alerts · AUT=automation · REP=reporting · VIS=visualization · Scores = coverage % derived from FLEET_INVENTORY (not mock)", "ANL=אנליטיקס · ALT=התראות · AUT=אוטומציה · REP=דוחות · VIS=ויזואליזציה · הציונים = אחוזי כיסוי שנגזרים מ-FLEET_INVENTORY (לא נתוני דמה)")}</p>
    </div>
  );
}

export default function InventoryPage() {
  const { lang, t, tr, locale } = useLang();
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
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted flag guards a hydration-sensitive render; there is no server value to read
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle={tr("Inventory • Fleet grid", "מלאי • רשת הצי")} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
        {/* Hero */}
        <div className="rounded-2xl border border-white/10 p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${VIOLET.surface}, ${VIOLET.elevated})`, borderColor: VIOLET.border }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>{tr("Fleet Inventory", "מלאי הצי")}</h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>{tr(`${FLEET_COUNT} verified dashboards across 13 domains — live Vercel fleet. Filter by domain, status, or search. Every URL is a real production alias, health from last deploy date. Audit 2026-08-15.`, `${FLEET_COUNT} דשבורדים מאומתים ב-13 תחומים — צי Vercel חי. אפשר לסנן לפי תחום וסטטוס, או לחפש. כל URL הוא alias אמיתי בפרודקשן, והבריאות נגזרת מתאריך הפריסה האחרון. ביקורת 2026-08-15.`)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500">{tr("Explore Ideas →", "גילוי רעיונות ←")}</Link>
                <Link href="/gaps" className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">{tr("Gap Radar", "רדאר פערים")}</Link>
                <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 text-[13px] font-semibold text-violet-200 hover:bg-violet-500/15">{tr("Find more ideas ↻", "חיפוש רעיונות נוספים ↻")}</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {[
                { id: "total", k: tr("Total", "סך הכול"), v: stats.total },
                { id: "live", k: t("section.live"), v: stats.live },
                { id: "avg", k: tr("Avg Health (snapshot)", "בריאות ממוצעת (תמונת מצב)"), v: `${stats.avgHealth}` },
              ].map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center min-w-[84px]">
                  <div className="text-lg font-black text-white">{s.v}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/65">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet strip — triage view, worst-first, links to /dashboard/<slug> */}
        <FleetStrip />
        <AskFleetCard />

        {/* Status legend — what beta actually means */}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {tr("Live — deploy ≤3d · alias OK · healthy", "חי — פריסה ≤3 ימים · alias תקין · בריא")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/15 px-3 py-1.5 text-blue-200"><span className="h-2 w-2 rounded-full bg-blue-400" /> {tr("Beta — deploy 4–7d · still reachable · degraded", "בטא — פריסה לפני 4–7 ימים · עדיין נגיש · מדורדר")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1.5 text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-400" /> {tr("Build — >7d · needs attention · stale", "בנייה — מעל 7 ימים · דורש טיפול · מיושן")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white/75"><span className="h-2 w-2 rounded-full bg-white/30" /> {tr("Concept — not yet live", "קונספט — עדיין לא פעיל")}</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-white/65">{lang === "he" ? (<>לחצו על תגית סטטוס כדי לראות <span className="text-white/75">מדוע</span> — תאריך + בריאות + alias. בטא אינו באג: המשמעות היא ״פורסם, אך עברו כמה ימים ללא פריסה חדשה״ — עדיין שמיש לחלוטין.</>) : (<>Tap any status pill to see <span className="text-white/75">why</span> — date + health + alias. Beta is not a bug: it means &#34;deployed but a few days without a fresh deploy&#34; — still fully usable.</>)}</p>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
            {DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition ${domain === d ? "bg-violet-600 text-white" : "text-white/75 hover:text-white hover:bg-white/10"}`}
              >
                {d === "all" ? tr("All", "הכול") : domainLabel(d, lang)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {STATUS.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`min-h-[32px] rounded-full px-3 text-[12px] font-semibold capitalize transition ${status === s ? "bg-white text-[#0f0b1a]" : "text-white/75 hover:text-white"}`}>{s === "all" ? tr("all", "הכול") : STATUS_LABEL[s] ? pick(STATUS_LABEL[s], lang) : s}</button>
            ))}
          </div>
          <div className="ms-auto flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search name, slug, capability…", "חיפוש לפי שם, slug או יכולת…")} className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:border-violet-500 focus:outline-none" />
            </div>
            <span className="hidden sm:inline text-xs text-white/65">{filtered.length} / {FLEET_PROJECTS.length}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!mounted ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))
          ) : filtered.map((p0) => {
            const p = localizeProject(p0, lang);
            const lvl = healthLevel(p.health);
            return (
              <div key={p.slug} className="group flex flex-col rounded-2xl border p-4 transition hover:shadow-lg hover:shadow-violet-500/10" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOMAIN_COLOR[p.domain] }} />
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[p.domain] }}>{domainLabel(p.domain, lang)}</span>
                    <button onClick={() => setExpanded(expanded === p.slug ? null : p.slug)} title={localizeStatusExplainer(p.status as FleetStatus, p.lastDeploy.slice(0,10), lang)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${p.status === "live" ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20" : p.status === "beta" ? "bg-blue-500/15 text-blue-200 border-blue-500/20" : p.status === "build" ? "bg-amber-500/15 text-amber-200 border border-amber-500/20" : "bg-white/10 text-white/75 border-white/10"}`}>{pick(STATUS_LABEL[p.status] ?? { en: statusLabel(p.status as FleetStatus), he: statusLabel(p.status as FleetStatus) }, lang)} ▾</button>
                  </div>
                  <span className="text-[11px] text-white/65">{formatDate(p.lastDeploy, tr, locale)}</span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold leading-tight text-white group-hover:text-violet-200"><Link href={`/dashboard/${p.slug}`} className="hover:underline">{p.name}</Link></h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5" style={{ color: VIOLET.textSecondary }}>{p.description}</p>
                <p className="mt-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[12px] leading-4 text-violet-100"><span className="font-bold">{tr("In plain English:", "במילים פשוטות:")}</span> {p.plainExplainer}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.capabilities.map((c) => (
                    <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75">{c}</span>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-4 text-white/65">
                  <span className="font-semibold text-white/75">{tr("Evidence:", "ראיות:")}</span> {tr("derived within its domain — primary", "נגזר בתוך התחום שלו — ראשי")} <span className="text-white/75">{domainLabel(p.domain, lang)}</span>
                  <span className="mx-1 text-white/20">·</span>
                  {tr("caps", "יכולות")} <span className="font-mono text-white/50">{p.capabilities.join(", ")}</span>
                  <span className="mx-1 text-white/20">·</span>
                  <a href={`/gaps#${p.domain}`} className="text-violet-200 hover:text-violet-200 underline">{tr(`View gaps for ${DOMAIN_LABEL[p.domain]}`, `צפייה בפערים ב${domainLabel(p.domain, lang)}`)}</a>
                  <span className="mx-1 text-white/20">·</span>
                  <a href="/ideas" className="text-violet-200 hover:text-violet-200 underline">{tr("Ideas for this domain", "רעיונות לתחום הזה")}</a>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-widest text-white/65">{tr("Health", "בריאות")}</span>
                    <span className="font-bold" style={{ color: HEALTH_COLOR[lvl] }}>{pick(HEALTH_LABEL[lvl], lang)}</span>
                  </div>
                  <HealthBar h={p.health} />
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("Open ↗", "פתיחה ↗")}</a>
                  <Link href={`/gaps`} className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 text-[12px] font-semibold text-white hover:bg-white/10">{tr("Gaps", "פערים")}</Link>
                  <button onClick={async () => { const brief = buildImprovePromptForProject(p as unknown as never); try { await navigator.clipboard.writeText(brief); } catch { setInvToast(tr("Could not copy the IMPROVE brief.", "לא ניתן להעתיק את תקציר ה-IMPROVE.")); setTimeout(() => setInvToast(null), 2600); return; } setInvToast(tr("IMPROVE brief copied (", "תקציר IMPROVE הועתק (") + p.slug + ")"); setTimeout(() => setInvToast(null), 2600); try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: p.slug + "-improve", title: "Improve " + p.name, targetSlug: p.slug, gapScore: p.health, meta: { mode: "improve", source: "inventory-card" } }) }); } catch {} }} className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15">{tr("Copy IMPROVE", "העתקת IMPROVE")}</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setImproveSlug(p.slug)} className="inline-flex min-h-[28px] items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/15">{tr("Preview IMPROVE brief", "תצוגה מקדימה של תקציר IMPROVE")}</button>
                  <a href={`/gaps#${p.domain}`} className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] text-white/50 hover:text-white">{tr("Improve ↗ tab idea", "שיפור ↗ רעיון ללשונית")}</a>
                </div>
                {expanded === p.slug ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-4 text-white/75">
                    <div className="font-semibold text-white/80">{tr(`Why ${statusLabel(p.status as FleetStatus)}?`, `מדוע ${pick(STATUS_LABEL[p.status] ?? { en: p.status, he: p.status }, lang)}?`)}</div>
                    <div className="mt-1">{localizeStatusExplainer(p.status as FleetStatus, p.lastDeploy.slice(0,10), lang)} · alias <span className="font-mono text-white/70">{p.url.replace("https://","")}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.capabilities.map((c) => <span key={c} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">{c}</span>)}
                    </div>
                    <div className="mt-2 text-white/65">{tr(`Source: Vercel · health ${p.health} · lastDeploy ${p.lastDeploy.slice(0,10)}`, `מקור: Vercel · בריאות ${p.health} · פריסה אחרונה ${p.lastDeploy.slice(0,10)}`)}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {mounted && filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/75">{tr("No projects match your filters.", "אין פרויקטים שתואמים למסננים.")}</p>
            <button onClick={() => { setDomain("all"); setStatus("all"); setQ(""); }} className="mt-3 inline-flex min-h-[40px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">{tr("Clear filters", "ניקוי מסננים")}</button>
          </div>
        ) : null}

        {/* Mini radar */}
        <div className="mt-8 rounded-2xl border p-5" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">{tr("Gap Mini-Radar", "מיני-רדאר פערים")}</h2>
              <p className="text-xs" style={{ color: VIOLET.textSecondary }}>{tr("Derived Domains × Capabilities (analytics/alerts/automation/reporting/visualization) · white-space <30 = opportunity · Scores are per-domain coverage, same source as the Gaps page.", "תחומים × יכולות (אנליטיקס/התראות/אוטומציה/דוחות/ויזואליזציה) · שטח לבן <30 = הזדמנות · הציונים הם כיסוי לכל תחום, מאותו מקור כמו עמוד הפערים.")}</p>
            </div>
            <Link href="/gaps" className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">{tr("Open Gap Radar →", "פתיחת רדאר הפערים ←")}</Link>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <MiniGapRadar />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-500/80" /> {tr("Strong ≥70", "חזק ≥70")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-500/70" /> {tr("Ok 50-69", "סביר 50-69")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-500/60" /> {tr("Gap 30-49", "פער 30-49")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-white/10" /> {tr("White-space <30", "שטח לבן <30")}</span>
          </div>
        </div>

        {/* Ideas teaser */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{tr("Ideas teaser", "טעימה מהרעיונות")}</h2>
            <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-500">{tr("Find more ideas ↻", "חיפוש רעיונות נוספים ↻")}</Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FLEET_IDEAS.slice(0, 3).map((i0) => localizeIdea(i0, lang)).map((idea) => (
            <Link key={idea.id} href="/ideas" className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 hover:bg-violet-500/15 transition">
              <div className="text-[11px] font-bold uppercase tracking-widest text-violet-200">{domainLabel(idea.domain, lang)} · {idea.effort} · {idea.priority}</div>
              <div className="mt-1 text-[14px] font-bold text-white">{idea.title}</div>
              <div className="mt-1 line-clamp-2 text-[12px] text-white/75">{idea.whyNow}</div>
            </Link>
          ))}
        </div>
        </div>
        {invToast ? <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">{invToast}</div> : null}
        {improveSlug ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setImproveSlug(null)}>
            <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/15 bg-[var(--bg)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {(() => { const pr = FLEET_PROJECTS.find((x) => x.slug === improveSlug); if (!pr) return null; const brief = buildImprovePromptForProject(pr as unknown as never); return (<>
                <div className="inline-flex rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-black">{tr("IMPROVE → ", "IMPROVE ← ")}{pr.slug}</div>
                <h3 className="mt-3 text-lg font-bold text-white">{tr("Improve ", "שיפור ")}{pr.name}</h3>
                <p className="mt-1 text-sm text-white/75">{pr.url} · {pr.domain} · {pr.status} · {tr("health", "בריאות")} {pr.health}</p>
                <pre className="mt-4 max-h-[48vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[11px] leading-4 text-white/80">{brief.slice(0, 8000)}</pre>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setImproveSlug(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">{t("action.close")}</button>
                  <button onClick={async () => { await navigator.clipboard.writeText(brief); setInvToast(tr("IMPROVE brief copied (", "תקציר IMPROVE הועתק (") + pr.slug + ")"); setTimeout(() => setInvToast(null), 2600); setImproveSlug(null); try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: pr.slug + "-improve", title: "Improve " + pr.name, targetSlug: pr.slug, gapScore: pr.health, meta: { mode: "improve", source: "inventory-preview" } }) }); } catch {} }} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-black hover:bg-amber-600">{tr("Copy IMPROVE", "העתקת IMPROVE")}</button>
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
              {tr("Audit trail — verified 2026-08-15", "מסלול ביקורת — אומת ב-2026-08-15")}
            </summary>
            <div className="mt-3 space-y-2 text-[12px] leading-5 text-white/55">
              {lang === "he" ? (
                <p><span className="font-semibold text-white/80">מקורות:</span> Vercel <span className="font-mono text-white/70">/v9/projects?teamId=team_NVnIOFO7th3wYtoyRoqJnLhr</span> — 46 פרויקטים (צוות maximo-seo, 3 עמודים, framework nextjs/vite/unknown), בדיקת קריאה בלבד ל-Hostinger WHM <span className="font-mono">node1488.myfcloud.com:2087</span> (0 טוקנים ב-vault → <span className="text-amber-200">TBD — WHM עדיין לא מחובר לאפליקציה הזו</span>), ו-<span className="font-mono">/root/projects</span> מקומי (9 פרויקטים מקומיים בלבד, שאינם דשבורדים: jarvis-hud, brain-dashboard, grr-*, וכו׳ — הוחרגו).</p>
              ) : (
                <p><span className="font-semibold text-white/80">Sources:</span> Vercel <span className="font-mono text-white/70">/v9/projects?teamId=team_NVnIOFO7th3wYtoyRoqJnLhr</span> — 46 projects (team maximo-seo, 3 pages, framework nextjs/vite/unknown), Hostinger WHM <span className="font-mono">node1488.myfcloud.com:2087</span> read-only probe (0 tokens in vault → <span className="text-amber-200">TBD — WHM not yet wired for this app</span>), local <span className="font-mono">/root/projects</span> (9 local-only, non-dashboards: jarvis-hud, brain-dashboard, grr-*, etc. — excluded).</p>
              )}
              {lang === "he" ? (
                <p><span className="font-semibold text-white/80">סינון:</span> 46 פחות 9 כלי עזר (maximo-seo marketing, apk-download, ronyb-deploy, summit-garage-prototype, seo-audit-report, site-scan-fix, todo-tasks, to-do-tasks, dp-work) → <span className="font-bold text-white">{FLEET_COUNT} דשבורדים מאומתים</span>. לכל רשומה יש alias חי בפרודקשן + updatedAt (YYYY-MM-DD) + בריאות (תקין עד 3 ימים / מדורדר 4–7 ימים / מיושן מעל 7 ימים) + מיפוי תחום נקי.</p>
              ) : (
                <p><span className="font-semibold text-white/80">Filter:</span> 46 minus 9 utilities (maximo-seo marketing, apk-download, ronyb-deploy, summit-garage-prototype, seo-audit-report, site-scan-fix, todo-tasks, to-do-tasks, dp-work) → <span className="font-bold text-white">{FLEET_COUNT} verified dashboards</span>. Each entry has live production alias + updatedAt (YYYY-MM-DD) + health (healthy ≤3d / degraded 4–7d / stale &gt;7d) + clean domain mapping.</p>
              )}
              {lang === "he" ? (
                <p><span className="font-semibold text-white/80">כפילויות:</span> הוסרו ב-2026-10-01 — <span className="font-mono text-white/70">competitor-intelligence</span> (נשאר <span className="font-mono text-white/70">competitor-intelligence-dashboard</span>) ו-<span className="font-mono text-white/70">seo-audit-dashboard</span> (נשאר <span className="font-mono text-white/70">seo-analytics-hub</span>). לא נותרו רשומות מומצאות.</p>
              ) : (
                <p><span className="font-semibold text-white/80">Duplicates:</span> removed 2026-10-01 — <span className="font-mono text-white/70">competitor-intelligence</span> (kept <span className="font-mono text-white/70">competitor-intelligence-dashboard</span>) and <span className="font-mono text-white/70">seo-audit-dashboard</span> (kept <span className="font-mono text-white/70">seo-analytics-hub</span>). No invented entries remain.</p>
              )}
              {lang === "he" ? (
                <p className="text-white/65">נוצר מ-<span className="font-mono">/tmp/vercel-projects.json</span> + <span className="font-mono">src/lib/fleet.ts</span> כמקור אמת יחיד — משוכפל אל <span className="font-mono">android/data/FleetData.kt</span>.</p>
              ) : (
                <p className="text-white/65">Generated from <span className="font-mono">/tmp/vercel-projects.json</span> + <span className="font-mono">src/lib/fleet.ts</span> as single source of truth — mirrored to <span className="font-mono">android/data/FleetData.kt</span>.</p>
              )}
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
