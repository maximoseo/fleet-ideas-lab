"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import TrustLine from "@/components/TrustLine";
import SiteHeader from "@/components/SiteHeader";
import IdeaBoard from "@/components/IdeaBoard";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, FLEET_GENERATED_POOL, FLEET_COUNT, DOMAIN_LABEL, DOMAIN_COLOR, type FleetDomain, type Effort, type Priority, type Impact, type IdeaStatus, type FleetIdea } from "@/lib/fleet";
import { buildAgentPrompt, buildImprovePrompt } from "@/lib/agentPrompt";
import { usePersistedSet } from "@/lib/usePersistedSet";
import { useLang, pick, type Bi, type Lang } from "@/components/i18n";
import { localizeIdea } from "@/lib/fleet.he";

const VIOLET = STYLES.violet;

// Hebrew display labels for the domain chips. English comes from DOMAIN_LABEL itself.
const DOMAIN_LABEL_HE: Record<string, string> = {
  seo: "SEO", content: "תוכן", local: "מקומי", analytics: "אנליטיקס", automation: "אוטומציה", design: "עיצוב", outreach: "פנייה", technical: "טכני",
  geo: "GEO", whm: "WHM", competitor: "מתחרים", reporting: "דוחות", "client-ops": "תפעול לקוחות",
};
function domainLabel(d: string, lang: Lang): string {
  return lang === "he" ? (DOMAIN_LABEL_HE[d] ?? DOMAIN_LABEL[d]) : DOMAIN_LABEL[d];
}
// Display-only labels; the stored/filter values stay "all" / "high" / "backlog" etc.
const IMPACT_LABEL: Record<string, Bi> = {
  all: { en: "Any Impact", he: "כל רמת השפעה" },
  high: { en: "high", he: "גבוהה" },
  medium: { en: "medium", he: "בינונית" },
  low: { en: "low", he: "נמוכה" },
};
const STATUS_FILTER_LABEL: Record<string, Bi> = {
  all: { en: "all", he: "הכול" },
  new: { en: "new", he: "חדש" },
  scoped: { en: "scoped", he: "מוגדר" },
  backlog: { en: "backlog", he: "בצבר" },
  shipped: { en: "shipped", he: "נשלח" },
};
const BRIEF_MODE_LABEL: Record<string, Bi> = {
  auto: { en: "Auto (NEW→BUILD, Enhance→IMPROVE)", he: "אוטומטי (חדש ל-BUILD, הרחבה ל-IMPROVE)" },
  build: { en: "build", he: "BUILD" },
  improve: { en: "improve", he: "IMPROVE" },
};

function badgeEffort(e: Effort) {
  const m: Record<string, string> = { S: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20", M: "bg-blue-500/15 text-blue-200 border-blue-500/20", L: "bg-amber-500/15 text-amber-200 border-amber-500/20", XL: "bg-red-500/15 text-red-300 border-red-500/20" };
  return m[e] || "bg-white/10 text-white/75";
}
function badgePriority(p: Priority) {
  const m: Record<string, string> = { P0: "bg-red-500 text-white", P1: "bg-amber-500 text-black", P2: "bg-white/15 text-white", P3: "bg-white/5 text-white/75" };
  return m[p] || "bg-white/10";
}

export default function IdeasPage() {
  const { lang, tr } = useLang();
  const [domain, setDomain] = useState<FleetDomain | "all">("all");
  const [effort, setEffort] = useState<Effort | "all">("all" as unknown as Effort);
  const [impact, setImpact] = useState<Impact | "all">("all" as unknown as Impact);
  const [status, setStatus] = useState<IdeaStatus | "all">("all" as unknown as IdeaStatus);
  const [kind, setKind] = useState<"all" | "new" | "enhancement">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [scaffolding, setScaffolding] = useState<string | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [notifyPicker, setNotifyPicker] = useState<FleetIdea | null>(null);
  const [notifyBot, setNotifyBot] = useState<"spark" | "coding">("coding");
  const [notifyMode, setNotifyMode] = useState<"build" | "improve">("build");
  // Same store the Favorites page reads — see usePersistedSet.
  const { value: favs, toggle: toggleFav } = usePersistedSet("fleet_favorites");
  const [favOnly, setFavOnly] = useState(false);

  const [confirmIdea, setConfirmIdea] = useState<FleetIdea | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set(FLEET_IDEAS.map((x)=>x.id)));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- merging previously seen idea ids from localStorage — browser-only, runs once on mount
  useEffect(()=>{ try{ const raw=localStorage.getItem("fleet_seen_ideas"); if(raw){ const arr=JSON.parse(raw) as string[]; if(arr.length>0) setSeenIds((prev)=>{ const m=new Set(prev); arr.forEach((id:string)=>m.add(id)); return m;}); } }catch{} },[]);
  useEffect(()=>{ try{ localStorage.setItem("fleet_seen_ideas", JSON.stringify([...seenIds])); }catch{} },[seenIds]);
  const [reloading, setReloading] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pullStart = useRef<number | null>(null);
  const notifyInFlight = useRef(false);

  const ALL_POOL: FleetIdea[] = useMemo(()=> [...FLEET_IDEAS, ...FLEET_GENERATED_POOL].map((i) => localizeIdea(i, lang)), [lang]);
  const unseenLeft = useMemo(() => ALL_POOL.filter((it) => !seenIds.has(it.id)).length, [ALL_POOL, seenIds]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const filtered = useMemo(() => {
    const searching = q.trim().length > 0;
    // When searching, span the whole pool so unseen research ideas are still findable.
    // When not searching, respect seenIds so Reload novelty holds (never repeats).
    const sourcePool = searching ? ALL_POOL : ALL_POOL.filter((it) => seenIds.has(it.id));
    const base = sourcePool.filter((it) => {
      if (domain !== "all" && it.domain !== domain) return false;
      if (effort !== ("all" as unknown as Effort) && it.effort !== effort) return false;
      if (impact !== ("all" as unknown as Impact) && it.impact !== impact) return false;
      if (status !== ("all" as unknown as IdeaStatus) && it.status !== status) return false;
      if (kind !== "all" && (it as unknown as { kind: string }).kind !== kind) return false;
      if (favOnly && !favs.has(it.slug)) return false;
      if (q && !`${it.title} ${it.slug} ${it.description} ${it.whyNow} ${it.problem} ${it.solution} ${it.evidence}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    // Stable order — preserve allPool order, never reshuffle the displayed list on scroll.
    // Only candidates are shuffled when picking (doReload/loadMore), so scroll never jumps to top.
    return base;
  }, [ALL_POOL, domain, effort, impact, status, kind, q, favOnly, favs, seenIds]);

  // Auto-reveal search hits that were previously unseen so the result stays on this page.
  useEffect(() => {
    if (q.trim().length === 0) return;
    const unseenHits = (filtered as FleetIdea[]).filter((it: FleetIdea) => !seenIds.has(it.id));
    if (unseenHits.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks search hits as seen; deriving this instead needs the feed rewrite tracked for the refactor wave
    setSeenIds((prev) => {
      const next = new Set(prev);
      unseenHits.forEach((it: FleetIdea) => next.add(it.id));
      return next;
    });
  }, [filtered, q]);

  const [briefMode, setBriefMode] = useState<"auto" | "build" | "improve">("auto");
  function resolveMode(idea: FleetIdea): "build" | "improve" {
    if (briefMode === "build") return "build";
    if (briefMode === "improve") return "improve";
    return idea.kind === "enhancement" ? "improve" : "build";
  }
  async function copyPrompt(idea: FleetIdea) {
    const mode = resolveMode(idea);
    const full = mode === "improve" ? buildImprovePrompt(idea) : buildAgentPrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast((mode === "improve" ? "IMPROVE" : "BUILD") + tr(" brief copied (" + idea.slug + ") — also logged to History", " — הבריף הועתק (" + idea.slug + ") — נרשם גם בהיסטוריה"));
    setTimeout(() => setToast(null), 2600);
    try {
      await fetch("/api/fleet/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "copy", slug: idea.slug, ideaId: idea.id, title: idea.title, targetSlug: idea.targetSlug, gapScore: idea.gapScore, meta: { mode } }),
      });
    } catch {}
  }
  async function copyBuildPrompt(idea: FleetIdea) {
    const full = buildAgentPrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast("BUILD" + tr(" brief copied (" + idea.slug + ") — also logged to History", " — הבריף הועתק (" + idea.slug + ") — נרשם גם בהיסטוריה"));
    setTimeout(() => setToast(null), 2600);
    try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: idea.slug, ideaId: idea.id, title: idea.title, targetSlug: idea.targetSlug, gapScore: idea.gapScore, meta: { mode: "build" } }) }); } catch {}
  }
  async function copyImprovePromptOnly(idea: FleetIdea) {
    const full = buildImprovePrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast("IMPROVE" + tr(" brief copied (" + idea.slug + " → " + (idea.targetSlug || idea.slug) + ") — also logged to History", " — הבריף הועתק (" + idea.slug + " ← " + (idea.targetSlug || idea.slug) + ") — נרשם גם בהיסטוריה"));
    setTimeout(() => setToast(null), 2600);
    try { await fetch("/api/fleet/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "copy", slug: idea.slug, ideaId: idea.id, title: idea.title, targetSlug: idea.targetSlug, gapScore: idea.gapScore, meta: { mode: "improve" } }) }); } catch {}
  }

  async function openNotifyPicker(idea: FleetIdea) {
    setNotifyMode(resolveMode(idea));
    setNotifyBot("coding");
    setNotifyPicker(idea);
  }

  async function doNotify() {
    if (!notifyPicker) return;
    // A double tap used to fire two POSTs: setNotifying is async, so the guard
    // has to be the ref, not the state.
    if (notifyInFlight.current) return;
    notifyInFlight.current = true;
    const idea = notifyPicker;
    setNotifying(idea.id);
    setNotifyResult(null);
    setNotifyPicker(null);
    try {
      const res = await fetch("/api/fleet/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaSlug: idea.slug, ideaId: idea.id, mode: notifyMode, bot: notifyBot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("Failed", "נכשל"));
      const botName = data.botUsername || (notifyBot === "coding" ? "CodingAgent64Bot" : "HermesAgent64SparkBot");
      setNotifyResult(tr("✓ Sent \"" + idea.slug + "\" (" + notifyMode.toUpperCase() + ") to @" + botName + (data.message_id ? " · msg " + data.message_id : "") + (data.truncated ? " · truncated to 4096" : ""), "✓ \"" + idea.slug + "\" (" + notifyMode.toUpperCase() + ") נשלח אל @" + botName + (data.message_id ? " · הודעה " + data.message_id : "") + (data.truncated ? " · קוצר ל-4096" : "")));
      setToast(tr("📨 Sent to @" + botName + " — check Telegram", "📨 נשלח אל @" + botName + " — יש לבדוק בטלגרם"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tr("Failed", "נכשל");
      setNotifyResult("✕ " + msg);
      setToast(tr("✕ Send failed — ", "✕ השליחה נכשלה — ") + msg);
    } finally {
      notifyInFlight.current = false;
      setNotifying(null);
      setTimeout(() => { setNotifyResult(null); setToast(null); }, 6000);
    }
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
      if (!res.ok) throw new Error(data.error || tr("Failed", "נכשל"));
      const modeNote = data.mode === "vercel-tmp" ? tr(" (Vercel /tmp — ephemeral, clone to /root/projects/" + data.slug + " on dev server)", " (Vercel /tmp — זמני, יש לשכפל אל /root/projects/" + data.slug + " בשרת הפיתוח)") : "";
      const kindNote = data.kind === "enhancement" && data.targetSlug ? tr(" — feature branch for " + data.targetSlug + " (merge as tab)", " — ענף פיצ'ר עבור " + data.targetSlug + " (למזג כטאב)") : tr(" — new standalone dashboard", " — דשבורד עצמאי חדש");
      setScaffoldResult("\u2713 " + (data.kind === "enhancement" ? tr("Tab scaffolded", "טאב נוצר") : tr("Dashboard scaffolded", "דשבורד נוצר")) + " " + data.slug + tr(" at ", " ב-") + data.dir + modeNote + kindNote + (data.note ? " · " + data.note : ""));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tr("Failed", "נכשל");
      setScaffoldResult("\u2717 " + msg);
    } finally {
      setScaffolding(null);
      setTimeout(() => setScaffoldResult(null), 6000);
    }
  }

  const doReload = useCallback(() => {
    if (reloading) return;
    setReloading(true);
    // Unseen candidates matching current filters — never repeats an ID. Only candidates are shuffled.
    const candidates = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL].filter((it) => !seenIds.has(it.id)).filter((it) => {
      if (domain !== "all" && it.domain !== domain) return false;
      if (effort !== ("all" as unknown as Effort) && it.effort !== effort) return false;
      if (impact !== ("all" as unknown as Impact) && it.impact !== impact) return false;
      if (kind !== "all" && (it as unknown as { kind: string }).kind !== kind) return false;
      if (q && !`${it.title} ${it.slug} ${it.description} ${it.whyNow}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (candidates.length === 0) {
      setToast(tr("\u21bb No more new ideas for this filter \u2014 " + filtered.length + " shown \u00b7 try Clear or different domain", "\u21bb אין עוד רעיונות חדשים לסינון הזה \u2014 מוצגים " + filtered.length + " \u00b7 נסו לנקות או לבחור תחום אחר"));
    } else {
      const take = Math.min(3, candidates.length);
      const shuffled = [...candidates]; let seed = (Date.now()%233280)+9301; const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; }; for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=shuffled[i]; shuffled[i]=shuffled[j]; shuffled[j]=t; }
      const picked = shuffled.slice(0, take);
      setSeenIds((prev)=>{ const next=new Set(prev); picked.forEach((pp)=>next.add(pp.id)); return next; });
      setToast(tr("\u21bb New ideas: " + picked.map((pp)=>pp.slug).join(", ") + " \u00b7 now " + (filtered.length + take) + " shown", "\u21bb רעיונות חדשים: " + picked.map((pp)=>pp.slug).join(", ") + " \u00b7 מוצגים כעת " + (filtered.length + take)));
    }
    setTimeout(() => { setReloading(false); setToast(null); }, 2200);
  }, [filtered.length, seenIds, reloading, domain, effort, impact, kind, q, tr]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (document.activeElement === searchRef.current) return;
    if (window.scrollY === 0) pullStart.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0 && window.scrollY === 0) setPullY(Math.min(dy * 0.4, 72));
  }, []);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endOfFeed, setEndOfFeed] = useState(false);
  // Infinite scroll: sentinel appends next unseen batch — stable order, no global reshuffle (fixes jump-to-top on desktop)
  const loadMore = useCallback(() => {
    if (loadingMore || endOfFeed || reloading) return;
    if (q.trim().length > 0) return;
    if (favOnly) return;
    const candidates = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL].filter((it) => !seenIds.has(it.id)).filter((it) => {
      if (domain !== "all" && it.domain !== domain) return false;
      if (effort !== ("all" as unknown as Effort) && it.effort !== effort) return false;
      if (impact !== ("all" as unknown as Impact) && it.impact !== impact) return false;
      if (kind !== "all" && (it as unknown as { kind: string }).kind !== kind) return false;
      return true;
    });
    if (candidates.length === 0) { setEndOfFeed(true); return; }
    setLoadingMore(true);
    setTimeout(() => {
      const take = Math.min(3, candidates.length);
      let seed = (Date.now()%233280)+9301; const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
      const shuffled=[...candidates]; for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=shuffled[i]; shuffled[i]=shuffled[j]; shuffled[j]=t; }
      const picked=shuffled.slice(0,take);
      setSeenIds((prev)=>{ const next=new Set(prev); picked.forEach((pp)=>next.add(pp.id)); return next; });
      setLoadingMore(false);
      if (candidates.length <= take) setEndOfFeed(true);
    }, 450);
  }, [loadingMore, endOfFeed, reloading, seenIds, domain, effort, impact, kind, q, favOnly]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the end-of-feed flag when filters change; same feed rewrite
  useEffect(()=>{ setEndOfFeed(false); },[domain, effort, impact, kind, q, favOnly]);
  useEffect(()=>{
    const el=sentinelRef.current; if(!el) return;
    // Pause while searching/favorites — prevents jump and empty loads
    if (q.trim().length > 0 || favOnly) return;
    const obs=new IntersectionObserver((entries)=>{ if(entries[0].isIntersecting) loadMore(); },{ rootMargin: "280px", threshold: 0 });
    obs.observe(el); return ()=>obs.disconnect();
  },[loadMore, q, favOnly]);

  const onTouchEnd = useCallback(() => {
    if (pullY > 48) doReload();
    pullStart.current = null;
    setPullY(0);
  }, [pullY, doReload]);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <SiteHeader subtitle={tr("11+ ideas · professional briefs + scaffold · Reload brings New IDs", "11+ רעיונות · בריפים מקצועיים + שלד · רענון מביא מזהים חדשים")} />
      {pullY > 0 ? (
        <div className="flex justify-center py-2" style={{ height: 36, opacity: pullY / 72 }}>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${pullY > 48 ? "border-violet-500/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-white/50"}`}>
            <span className={pullY > 48 || reloading ? "animate-spin inline-block" : ""}>{pullY > 48 ? "\u21bb" : "\u2193"}</span>
            {pullY > 48 ? tr("Release to reload", "שחררו לרענון") : tr("Pull to reload", "משכו לרענון")}
          </span>
        </div>
      ) : null}
      {reloading ? <div className="h-0.5 w-full overflow-hidden bg-white/10"><div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-violet-500" /></div> : null}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>{tr("Ideas", "רעיונות")}</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>{tr(FLEET_IDEAS.length + " professional briefs — deduplicated against " + FLEET_COUNT + " live dashboards. ", FLEET_IDEAS.length + " בריפים מקצועיים — ללא כפילויות מול " + FLEET_COUNT + " דשבורדים חיים. ")}<span className="font-semibold text-emerald-200">{tr("5 New dashboards", "5 דשבורדים חדשים")}</span>{tr(" (white-space) + ", " (שטח לבן) + ")}<span className="font-semibold text-amber-200">{tr("6 Enhancements", "6 הרחבות")}</span>{tr(" (add as tab inside existing dashboard) — 1 duplicate removed (Content Decay already live). Tap to expand full brief with evidence.", " (הוספה כטאב בתוך דשבורד קיים) — כפילות אחת הוסרה (Content Decay כבר חי). הקישו להרחבת הבריף המלא עם הראיות.")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1" role="tablist" aria-label={tr("Ideas view", "תצוגת רעיונות")}>
              {(["list", "board"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-[32px] rounded-full px-4 text-[12px] font-semibold capitalize transition ${view === v ? "bg-violet-600 text-white" : "text-white/75 hover:text-white"}`}>{v === "list" ? tr("List", "רשימה") : tr("Board", "לוח")}</button>
              ))}
            </div>
            <div className="flex gap-2"><button onClick={doReload} disabled={reloading} className="inline-flex min-h-[44px] items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50">{reloading ? tr("\u21bb Reloading\u2026", "\u21bb טוען מחדש\u2026") : tr("Find more ideas \u21bb", "חיפוש רעיונות נוספים \u21bb")}</button><Link href="/create" className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">{tr("Create \u2192", "יצירה \u2190")}</Link></div>
          </div>
        </div>

        {/* Filters */}
        {view === "list" ? (
        <>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 p-1 w-fit">
            <span className="px-2 text-[11px] font-bold text-violet-200">{tr("Brief mode:", "מצב בריף:")}</span>
            {(["auto", "build", "improve"] as const).map((m) => (
              <button key={m} onClick={() => setBriefMode(m)} className={`min-h-[28px] rounded-full px-3 text-[11px] font-bold capitalize ${briefMode === m ? "bg-violet-600 text-white" : "text-violet-200/60 hover:text-white"}`}>{pick(BRIEF_MODE_LABEL[m], lang)}</button>
            ))}
            <span className="px-2 text-[10px] text-violet-200/70">{tr("BUILD: new dashboard · IMPROVE: optimize existing", "BUILD: דשבורד חדש · IMPROVE: שיפור דשבורד קיים")}</span>
          </div>
        <div className="sticky top-[56px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mt-5 space-y-3 backdrop-blur-xl bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] border-y border-white/5">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFavOnly((v) => !v)} className={`min-h-[32px] rounded-full px-3 text-[12px] font-bold transition border ${favOnly ? "bg-amber-500 text-black border-amber-500" : "bg-white/[0.04] text-white/75 border-white/10 hover:text-white"}`}>{"\u2605"} {favs.size}{favOnly ? " \u00b7 " + tr("Favorites", "מועדפים") : ""}</button>
            <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"] as const).map((d) => (
                <button key={d} onClick={() => setDomain(d as FleetDomain | "all")} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold transition ${domain === d ? "bg-violet-600 text-white" : "text-white/75 hover:text-white"}`}>{d === "all" ? tr("All Domains", "כל התחומים") : domainLabel(d, lang)}</button>
              ))}
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "new", "enhancement"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${kind === k ? "bg-violet-600 text-white" : "text-white/75 hover:text-white"}`}>{k === "all" ? tr("All kinds", "כל הסוגים") : k === "new" ? tr("New", "חדש") : tr("Enhancement", "הרחבה")}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "S", "M", "L", "XL"] as const).map((e) => (
                <button key={e} onClick={() => setEffort(e as unknown as Effort)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold ${effort === e ? "bg-white text-[#0f0b1a]" : "text-white/75 hover:text-white"}`}>{e === "all" ? tr("Any Effort", "כל רמת מאמץ") : e}</button>
              ))}
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "high", "medium", "low"] as const).map((v) => (
                <button key={v} onClick={() => setImpact(v as unknown as Impact)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${impact === v ? "bg-white text-[#0f0b1a]" : "text-white/75 hover:text-white"}`}>{pick(IMPACT_LABEL[v], lang)}</button>
              ))}
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["all", "new", "scoped", "backlog", "shipped"] as const).map((v) => (
                <button key={v} onClick={() => setStatus(v as unknown as IdeaStatus)} className={`min-h-[32px] rounded-full px-3 text-xs font-semibold capitalize ${status === v ? "bg-white text-[#0f0b1a]" : "text-white/75 hover:text-white"}`}>{pick(STATUS_FILTER_LABEL[v], lang)}</button>
              ))}
            </div>
            <div className="ms-auto flex items-center gap-2 w-full sm:w-auto">
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search ideas, problem, solution…", "חיפוש רעיונות, בעיה, פתרון…")} className="w-full sm:w-64 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:border-violet-500 focus:outline-none" />
              <span className="hidden sm:inline text-xs text-white/65">{tr(filtered.length + " shown · " + (ALL_POOL.length - unseenLeft) + " seen · " + unseenLeft + " unseen left", "מוצגים " + filtered.length + " · נצפו " + (ALL_POOL.length - unseenLeft) + " · נותרו " + unseenLeft + " שלא נצפו")}</span>
            </div>
          </div>
        </div>
        </>
        ) : null}

        {scaffoldResult ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-3">
            <span className="flex-1 text-sm text-violet-100">{scaffoldResult}</span>
            <a href="/history" className="inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-white px-4 text-xs font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("View in History →", "צפייה בהיסטוריה ←")}</a>
          </div>
        ) : null}
        {notifyResult ? (
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${notifyResult.startsWith("✓") ? "border-sky-500/30 bg-sky-500/15 text-sky-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>
            <span className="flex-1 text-sm">{notifyResult}</span>
            {notifyResult.startsWith("✓") ? <a href={notifyBot === "coding" ? "https://t.me/CodingAgent64Bot" : "https://t.me/HermesAgent64SparkBot"} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-white px-4 text-xs font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("Open in Telegram →", "פתיחה בטלגרם ←")}</a> : null}
          </div>
        ) : null}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-4 text-white/65">
          {tr("On ", "ב-")}<span className="font-mono text-white/75">fleet-ideas-lab.vercel.app</span>{tr(" scaffolds land in ", " שלדים נוצרים ב-")}<span className="font-mono text-violet-200">/tmp/&lt;slug&gt;</span>{tr(" (ephemeral — Vercel sandbox). On Hostinger ", " (זמני — סביבת Vercel). ב-Hostinger ")}<span className="font-mono text-white/75">srv1813877</span>{tr(" they persist at ", " הם נשמרים ב-")}<span className="font-mono text-violet-200">/root/projects/&lt;slug&gt;</span>{tr(". History keeps a trace either way — see ", ". ההיסטוריה שומרת עקבות בכל מקרה — ראו ")}<a href="/history" className="text-violet-200 underline">{tr("History", "היסטוריה")}</a>.
        </div>

        {view === "board" ? <IdeaBoard /> : null}

        {view === "list" ? (
        <>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((idea) => (
            <div key={idea.id} className="flex flex-col rounded-2xl border p-4 sm:p-4 xl:p-3 hover:shadow-lg hover:shadow-violet-500/10 transition" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: DOMAIN_COLOR[idea.domain] }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[idea.domain] }}>{domainLabel(idea.domain, lang)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeEffort(idea.effort)}`}>{idea.effort}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgePriority(idea.priority)}`}>{idea.priority}</span>
                <button onClick={() => toggleFav(idea.slug)} className={`ms-1 rounded-full px-2 py-0.5 text-[12px] font-bold border ${favs.has(idea.slug) ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 text-white/65 border-white/10 hover:text-white"}`}>{favs.has(idea.slug) ? "\u2665" : "\u2661"}</button>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${idea.kind === "new" ? "bg-emerald-500 text-white" : "bg-amber-500 text-black"}`}>{idea.kind === "new" ? tr("NEW", "חדש") : tr("ENHANCE", "הרחבה")}</span>
                {idea.id.startsWith("idea-research") ? <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-100">{tr("Fresh from web \u00b7 2026-08-16", "חדש מהרשת \u00b7 2026-08-16")}</span> : null}
                <span className={`ms-auto rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${idea.impact === "high" ? "bg-emerald-500/15 text-emerald-200" : idea.impact === "medium" ? "bg-amber-500/15 text-amber-200" : "bg-white/10 text-white/75"}`}>{IMPACT_LABEL[idea.impact] ? pick(IMPACT_LABEL[idea.impact], lang) : idea.impact}</span>
              </div>
              {/* i18n: idea.title / whyNow / description / evidence / problem / solution etc. are data (fleet.ts / API) — the Hebrew overlay for them plugs in here. */}
              {/* h2, not h3: the page h1 is "Ideas" and these cards are its direct children. Skipping a level breaks the heading outline a screen reader navigates by. */}
              <h2 className="mt-2 text-[15px] font-bold leading-tight text-white">{idea.title}</h2>
              <p className="mt-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] leading-5 text-amber-100/90">
                <span className="font-bold">{tr("Why now:", "למה עכשיו:")}</span> {idea.whyNow}
              </p>
              <p className="mt-2 text-[13px] leading-5 line-clamp-2" style={{ color: VIOLET.textSecondary }}>{idea.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {idea.widgets.slice(0, 4).map((w) => (
                  <span key={w} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75">{w}</span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-bold ${idea.gapScore < 30 ? "bg-white text-[#0f0b1a]" : idea.gapScore < 50 ? "bg-red-500 text-white" : idea.gapScore < 70 ? "bg-amber-500 text-black" : "bg-emerald-500 text-white"}`}>{tr("Gap ", "פער ")}{idea.gapScore}%</span>
                {idea.targetSlug ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/75">{tr("→", "←")} {idea.targetSlug}</span> : null}
                <span className="text-white/60">{idea.kind === "new" ? tr("New dashboard", "דשבורד חדש") : tr("Add as tab inside existing", "הוספה כטאב בדשבורד קיים")}</span>
              </div>
              <div className="mt-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px] leading-4 text-amber-50/90">
                <span className="font-bold text-amber-100">{tr("Evidence (inline):", "ראיות (בקצרה):")}</span> {idea.evidence}
              </div>

              {/* Professional brief toggle */}
              <button onClick={() => setExpanded(expanded === idea.id ? null : idea.id)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-start hover:bg-white/[0.06]">
                <span className="text-[12px] font-semibold text-white">{expanded === idea.id ? tr("Hide professional brief \u25b2", "הסתרת בריף מקצועי \u25b2") : tr("Professional brief \u25bc", "בריף מקצועי \u25bc")}</span>
                <span className="text-[11px] text-white/65">{tr("Problem \u00b7 Solution \u00b7 Benefit \u00b7 Data \u00b7 Feasibility", "בעיה \u00b7 פתרון \u00b7 תועלת \u00b7 נתונים \u00b7 היתכנות")}</span>
              </button>

              {expanded === idea.id ? (
                <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-[12px] leading-5">
                  <div><span className="font-bold text-red-300">{tr("Problem:", "בעיה:")}</span> <span className="text-white/70">{idea.problem}</span></div>
                  <div><span className="font-bold text-violet-200">{tr("Solution:", "פתרון:")}</span> <span className="text-white/70">{idea.solution}</span></div>
                  <div><span className="font-bold text-emerald-200">{tr("Benefit:", "תועלת:")}</span> <span className="text-white/70">{idea.benefit}</span></div>
                  <div><span className="font-bold text-amber-200">{tr("Data needed:", "נתונים נדרשים:")}</span> <span className="text-white/75">{idea.dataNeeded}</span></div>
                  <div><span className="font-bold text-white/75">{tr("Feasibility:", "היתכנות:")}</span> <span className="text-white/75">{idea.feasibility}</span></div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3"><span className="font-bold text-amber-100">{tr("Evidence (vs " + FLEET_COUNT + " live):", "ראיות (מול " + FLEET_COUNT + " חיים):")}</span> <span className="text-amber-100/80">{idea.evidence}</span></div>
                  <div className="rounded-lg bg-white/5 p-3"><span className="font-bold text-white">{tr("Next step:", "השלב הבא:")}</span> <span className="text-violet-200">{idea.nextStep}</span> {idea.targetSlug ? <span className="text-white/65">{tr("· target: ", "· יעד: ")}{idea.targetSlug}</span> : null}</div>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                {idea.dashboardUrl ? (
                  <a href={idea.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#0f0b1a] hover:bg-white/90 text-center leading-tight px-2">{tr("Open \u2197", "פתיחה \u2197")}</a>
                ) : (
                  <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white/65">{tr("No URL", "אין URL")}</span>
                )}
                <button onClick={() => setConfirmIdea(idea)} disabled={scaffolding === idea.id} title={idea.kind === "enhancement" ? tr("Scaffold as feature tab inside " + (idea.targetSlug || "") + " at /root/projects/" + idea.slug + " (or /tmp on Vercel)", "יצירת שלד כטאב פיצ'ר בתוך " + (idea.targetSlug || "") + " ב-/root/projects/" + idea.slug + " (או /tmp ב-Vercel)") : tr("Create new dashboard at /root/projects/" + idea.slug + " (or /tmp on Vercel)", "יצירת דשבורד חדש ב-/root/projects/" + idea.slug + " (או /tmp ב-Vercel)")} className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-2 text-[12px] font-semibold disabled:opacity-50 ${idea.kind === "enhancement" ? "border border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/20" : "bg-violet-600 text-white hover:bg-violet-500"}`}> 
                  {scaffolding === idea.id ? "\u2026" : idea.kind === "enhancement" ? tr("Scaffold tab \u2192 ", "יצירת שלד טאב \u2190 ") + (idea.targetSlug || "") : tr("Create dashboard", "יצירת דשבורד")}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => openNotifyPicker(idea)} disabled={notifying === idea.id} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 text-[11px] font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50">{notifying === idea.id ? tr("… Sending", "… שולח") : tr("📨 Send to Bot", "📨 שליחה לבוט")}</button>
                <button disabled className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/5 bg-white/[0.02] px-2 text-[10px] font-medium text-white/25">{idea.slug.slice(0, 18)}</button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={() => copyPrompt(idea)} title={resolveMode(idea) === "improve" ? tr("Copy IMPROVE brief (Markdown) — optimize existing " + (idea.targetSlug || idea.slug), "העתקת בריף IMPROVE (Markdown) — שיפור " + (idea.targetSlug || idea.slug) + " הקיים") : tr("Copy BUILD brief (Markdown) — new dashboard " + idea.slug, "העתקת בריף BUILD (Markdown) — דשבורד חדש " + idea.slug)} className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-2 text-[11px] font-bold ${resolveMode(idea)==="improve" ? "border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/20" : "border-violet-500/30 bg-violet-600 text-white hover:bg-violet-500"}`}>{resolveMode(idea)==="improve" ? tr("Copy IMPROVE", "העתקת IMPROVE") : tr("Copy BUILD", "העתקת BUILD")} · {tr("Auto", "אוטומטי")}</button>
                <button onClick={() => copyBuildPrompt(idea)} title={tr("Copy BUILD brief — brand-new dashboard/APK spec", "העתקת בריף BUILD — מפרט לדשבורד/APK חדש לגמרי")} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">{tr("Copy BUILD", "העתקת BUILD")}</button>
                <button onClick={() => copyImprovePromptOnly(idea)} title={tr(`Copy IMPROVE brief — optimize/extend existing ${idea.targetSlug || idea.slug}`, `העתקת בריף IMPROVE — שיפור/הרחבה של ${idea.targetSlug || idea.slug} הקיים`)} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/15">{tr("Copy IMPROVE", "העתקת IMPROVE")}</button>
              </div>
              <div className="mt-2 text-center text-[11px] text-white/60">{idea.slug}</div>
            </div>
          ))}
        </div>
        <div ref={sentinelRef} className="flex flex-col items-center gap-3 py-6">
          {loadingMore ? <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200"><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" /> {tr("Loading more ideas\u2026", "טוען רעיונות נוספים\u2026")}</span> : null}
          {!loadingMore && !endOfFeed && filtered.length>0 && unseenLeft>0 ? <button onClick={loadMore} className="inline-flex min-h-[40px] items-center rounded-full border border-violet-500/30 bg-white px-5 text-sm font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("Load more — 3 more · " + unseenLeft + " unseen left", "טעינת עוד — 3 נוספים · נותרו " + unseenLeft + " שלא נצפו")}</button> : null}
          {endOfFeed && filtered.length>0 ? <span className="text-xs text-white/60">{tr("You\u2019ve seen all " + filtered.length + " for this filter — ", "ראיתם את כל " + filtered.length + " הרעיונות בסינון הזה — ")}<button onClick={() => { setDomain("all"); setEffort("all" as unknown as Effort); setImpact("all" as unknown as Impact); setStatus("all" as unknown as IdeaStatus); setKind("all"); setFavOnly(false); setQ(""); }} className="underline text-violet-200">{tr("Clear filters", "ניקוי סינון")}</button>{tr(" or change domain", " או החליפו תחום")}</span> : null}
          {!loadingMore && !endOfFeed && filtered.length>0 && unseenLeft===0 ? <span className="text-xs text-white/60">{tr("All " + ALL_POOL.length + " ideas are already shown — pull to reshuffle or Clear filters", "כל " + ALL_POOL.length + " הרעיונות כבר מוצגים — משכו לערבוב מחדש או נקו את הסינון")}</span> : null}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/75">{favOnly && favs.size === 0 ? tr("\u2606 No favorites yet \u2014 tap \u2661 on any idea", "\u2606 אין מועדפים עדיין \u2014 הקישו \u2661 על רעיון כלשהו") : favOnly ? tr("No favorites match your filters", "אין מועדפים שתואמים לסינון") : tr("No ideas match your filters.", "אין רעיונות שתואמים לסינון.")}</p>
            <button onClick={() => { setDomain("all"); setEffort("all" as unknown as Effort); setImpact("all" as unknown as Impact); setStatus("all" as unknown as IdeaStatus); setKind("all"); setFavOnly(false); setQ(""); }} className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10">{tr("Clear filters", "ניקוי סינון")}</button>
          </div>
        ) : null}
        </>
        ) : null}

        {toast ? (
          <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">
            {toast}
          </div>
        ) : null}
        {/* Send to Bot picker */}
        {notifyPicker ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setNotifyPicker(null)}>
            <div className="w-full max-w-lg rounded-2xl border border-sky-500/30 bg-[var(--bg)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="inline-flex rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-[11px] font-bold text-sky-100">{tr("📨 SEND TO BOT", "📨 שליחה לבוט")}</div>
              <h3 className="mt-3 text-lg font-bold text-white">{tr("Send \"" + notifyPicker.title + "\" to Telegram?", "לשלוח את \"" + notifyPicker.title + "\" לטלגרם?")}</h3>
              <p className="mt-2 text-sm leading-5 text-white/75">{tr("This sends the full " + notifyMode.toUpperCase() + " brief (up to 4096 chars) directly to the live bot via ", "הפעולה שולחת את בריף ה-" + notifyMode.toUpperCase() + " המלא (עד 4096 תווים) ישירות לבוט החי דרך ")}<span className="font-mono text-sky-100">POST /api/fleet/notify</span>{tr(". You'll see it instantly in the configured Telegram chat.", ". ההודעה תופיע מיד בצ'אט הטלגרם המוגדר.")}</p>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-4 text-white/50">
                <div>{tr("Slug: ", "מזהה (Slug): ")}<span className="font-mono text-white/70">{notifyPicker.slug}</span> · {tr("Gap ", "פער ")}{notifyPicker.gapScore}% · {notifyPicker.evidence.slice(0, 100)}…</div>
                <div className="mt-1">{tr("Widgets: ", "ווידג'טים: ")}{notifyPicker.widgets.join(" · ")}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[11px] font-bold text-white/75">{tr("Bot:", "בוט:")}</span>
                {(["coding", "spark"] as const).map((b) => (
                  <button key={b} onClick={() => setNotifyBot(b)} className={`rounded-full px-3 py-1.5 text-xs font-bold border ${notifyBot===b ? "bg-sky-500 text-white border-sky-500" : "bg-white/5 text-white/75 border-white/10 hover:text-white"}`}>{b==="coding" ? "@CodingAgent64Bot" : "@HermesAgent64SparkBot"}</button>
                ))}
                <span className="ms-2 text-[11px] font-bold text-white/75">{tr("Mode:", "מצב:")}</span>
                {(["build", "improve"] as const).map((m) => (
                  <button key={m} onClick={() => setNotifyMode(m)} className={`rounded-full px-3 py-1.5 text-xs font-bold border capitalize ${notifyMode===m ? "bg-violet-600 text-white border-violet-600" : "bg-white/5 text-white/75 border-white/10 hover:text-white"}`}>{pick(BRIEF_MODE_LABEL[m], lang)}</button>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setNotifyPicker(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">{tr("Cancel", "ביטול")}</button>
                <button onClick={doNotify} className="flex-1 rounded-full bg-sky-500 py-3 text-sm font-bold text-white hover:bg-sky-600">{tr("Send to @", "שליחה אל @")}{notifyBot==="coding" ? "CodingAgent64Bot" : "HermesAgent64SparkBot"}</button>
              </div>
            </div>
          </div>
        ) : null}
        {/* Scaffold confirmation — distinct for new vs enhancement */}
        {confirmIdea ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmIdea(null)}>
            <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[var(--bg)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${confirmIdea.kind === "new" ? "bg-emerald-500 text-white" : "bg-amber-500 text-black"}`}>{confirmIdea.kind === "new" ? tr("NEW DASHBOARD", "דשבורד חדש") : tr("ENHANCEMENT → ", "הרחבה ← ") + (confirmIdea.targetSlug || "")}</div>
              <h3 className="mt-3 text-lg font-bold text-white">{confirmIdea.kind === "new" ? tr("Create new dashboard: " + confirmIdea.slug + "?", "ליצור דשבורד חדש: " + confirmIdea.slug + "?") : tr("Add feature tab to " + (confirmIdea.targetSlug || "") + "?", "להוסיף טאב פיצ'ר אל " + (confirmIdea.targetSlug || "") + "?")}</h3>
              <p className="mt-2 text-sm leading-5 text-white/75">
                {confirmIdea.kind === "new"
                  ? tr("This will scaffold a new Next.js project at /root/projects/" + confirmIdea.slug + " (or /tmp/" + confirmIdea.slug + " on Vercel — ephemeral, clone to dev server). Includes package.json + README.md. No inventory entry is added until the Vercel alias is verified live. Source: this Fleet Ideas Lab brief.",
                      "הפעולה תיצור פרויקט Next.js חדש ב-/root/projects/" + confirmIdea.slug + " (או ב-/tmp/" + confirmIdea.slug + " ב-Vercel — זמני, יש לשכפל לשרת הפיתוח). כולל package.json ו-README.md. לא תתווסף רשומת מלאי עד שה-alias של Vercel יאומת כפעיל. מקור: הבריף הזה מ-Fleet Ideas Lab.")
                  : tr("This will scaffold at /root/projects/" + confirmIdea.slug + " as a feature branch for " + (confirmIdea.targetSlug || "") + " — intended to be merged as a tab inside " + (confirmIdea.targetSlug || "") + ", not a standalone project or Vercel site.",
                      "הפעולה תיצור שלד ב-/root/projects/" + confirmIdea.slug + " כענף פיצ'ר עבור " + (confirmIdea.targetSlug || "") + " — מיועד להתמזג כטאב בתוך " + (confirmIdea.targetSlug || "") + ", ולא כפרויקט עצמאי או אתר Vercel.")}
              </p>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-4 text-white/50">
                <div>{tr("Slug: ", "מזהה (Slug): ")}<span className="font-mono text-white/70">{confirmIdea.slug}</span> · {tr("Gap ", "פער ")}{confirmIdea.gapScore}% · {confirmIdea.evidence.slice(0, 120)}…</div>
                <div className="mt-1">{tr("Widgets: ", "ווידג'טים: ")}{confirmIdea.widgets.join(" · ")}</div>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setConfirmIdea(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">{tr("Cancel", "ביטול")}</button>
                <button onClick={() => doScaffold(confirmIdea)} className={`flex-1 rounded-full py-3 text-sm font-semibold ${confirmIdea.kind === "new" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-amber-500 text-black hover:bg-amber-600"}`}>{confirmIdea.kind === "new" ? tr("Create dashboard", "יצירת דשבורד") : tr("Scaffold tab", "יצירת שלד טאב")}</button>
              </div>
            </div>
          </div>
        ) : null}
        <TrustLine />
      </main>
    </div>
  );
}
