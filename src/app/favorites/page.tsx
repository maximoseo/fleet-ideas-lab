"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, DOMAIN_LABEL, DOMAIN_COLOR, type FleetIdea } from "@/lib/fleet";
import { buildAgentPrompt, buildImprovePrompt } from "@/lib/agentPrompt";
import { usePersistedSet } from "@/lib/usePersistedSet";
import { useLang } from "@/components/i18n";
import { localizeIdea } from "@/lib/fleet.he";

const VIOLET = STYLES.violet;

function badgeEffort(e: string) {
  const m: Record<string, string> = { S: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20", M: "bg-blue-500/15 text-blue-200 border-blue-500/20", L: "bg-amber-500/15 text-amber-200 border-amber-500/20", XL: "bg-red-500/15 text-red-300 border-red-500/20" };
  return m[e] || "bg-white/10 text-white/75";
}

export default function FavoritesPage() {
  const { lang, tr } = useLang();
  // Shared store — the Ideas page writes the same key, and this page used to
  // hydrate from an effect, which made the list flash empty on every visit.
  const { value: favs, remove: removeFav, clear: clearAll } = usePersistedSet("fleet_favorites");
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scaffolding, setScaffolding] = useState<string | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [confirmIdea, setConfirmIdea] = useState<FleetIdea | null>(null);

  const list = useMemo(() => FLEET_IDEAS.filter((it) => favs.has(it.slug)).map((it) => localizeIdea(it, lang)), [favs, lang]);
  const newCount = list.filter((x) => x.kind === "new").length;
  const enhCount = list.filter((x) => x.kind === "enhancement").length;

  async function copyBuild(idea: FleetIdea) {
    const full = buildAgentPrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast(tr("BUILD brief copied (", "בריף BUILD הועתק (") + idea.slug + ")"); setTimeout(()=>setToast(null),2600);
    try { await fetch("/api/fleet/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"copy",slug:idea.slug,ideaId:idea.id,title:idea.title,targetSlug:idea.targetSlug,gapScore:idea.gapScore,meta:{mode:"build",source:"favorites"}})});} catch{}
  }
  async function copyImprove(idea: FleetIdea) {
    const full = buildImprovePrompt(idea);
    await navigator.clipboard.writeText(full);
    setToast(tr("IMPROVE brief copied (", "בריף IMPROVE הועתק (") + idea.slug + ")"); setTimeout(()=>setToast(null),2600);
    try { await fetch("/api/fleet/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"copy",slug:idea.slug,ideaId:idea.id,title:idea.title,targetSlug:idea.targetSlug,gapScore:idea.gapScore,meta:{mode:"improve",source:"favorites"}})});} catch{}
  }
  async function doScaffold(idea: FleetIdea) {
    setScaffolding(idea.id); setScaffoldResult(null); setConfirmIdea(null);
    try {
      const res = await fetch("/api/fleet/scaffold",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:idea.slug,ideaId:idea.id,kind:idea.kind,targetSlug:idea.targetSlug||undefined})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error||tr("Failed", "הפעולה נכשלה"));
      const modeNote = data.mode==="vercel-tmp" ? tr(" (Vercel /tmp \u2014 ephemeral)", " (Vercel /tmp \u2014 זמני)") : "";
      const kindNote = data.kind==="enhancement" && data.targetSlug ? tr(" \u2014 tab for ", " \u2014 טאב עבור ")+data.targetSlug : tr(" \u2014 new dashboard", " \u2014 דשבורד חדש");
      setScaffoldResult("\u2713 "+(data.kind==="enhancement"?tr("Tab scaffolded", "נוצר שלד לטאב"):tr("Dashboard scaffolded", "נוצר שלד לדשבורד"))+" "+data.slug+tr(" at ", " ב-")+data.dir+modeNote+kindNote);
    } catch(e: unknown){ const m=e instanceof Error?e.message:tr("Failed", "הפעולה נכשלה"); setScaffoldResult("\u2717 "+m);} finally{ setScaffolding(null); setTimeout(()=>setScaffoldResult(null),6000); }
  }

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle={tr("Favorites \u00b7 ", "מועדפים \u00b7 ") + list.length + tr(" saved", " שמורים")} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="rounded-2xl border border-white/10 p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${VIOLET.surface}, ${VIOLET.elevated})`, borderColor: VIOLET.border }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>{tr("\u2605 Favorites", "\u2605 מועדפים")}</h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>
                {tr("Your saved ideas — tap \u2665 on any idea in ", "הרעיונות ששמרתם. הקישו על \u2665 ליד כל רעיון בעמוד ")}<Link href="/ideas" className="text-violet-200 underline">{tr("Ideas", "רעיונות")}</Link>{tr(" to add it here. Persists in ", " כדי להוסיף אותו לכאן. נשמר ב-")}<span className="font-mono text-white/75">localStorage(fleet_favorites)</span> ({tr("Android: ", "באנדרואיד: ")}<span className="font-mono text-white/75">DataStore</span>). {list.length} {tr("saved", "שמורים")} \u00b7 {newCount} {tr("New", "חדשים")} \u00b7 {enhCount} {tr("Enhance", "שדרוגים")}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/ideas" className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500">{tr("Browse Ideas \u2192", "עיון ברעיונות \u2190")}</Link>
                {list.length>0 ? <button onClick={clearAll} className="inline-flex min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-[13px] font-semibold text-white hover:bg-white/10">{tr("Clear all \u2605", "ניקוי הכול \u2605")}</button> : null}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {[{k:"Saved",l:tr("Saved", "שמורים"),v:String(list.length)},{k:"New",l:tr("New", "חדשים"),v:String(newCount)},{k:"Enhance",l:tr("Enhance", "שדרוגים"),v:String(enhCount)}].map((s)=>(
                <div key={s.k} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center min-w-[84px]">
                  <div className="text-lg font-black text-white">{s.v}</div>
                  <div className="text-[11px] uppercase tracking-widest text-white/65">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {scaffoldResult ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-3">
            <span className="flex-1 text-sm text-violet-100">{scaffoldResult}</span>
            <a href="/history" className="inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-white px-4 text-xs font-semibold text-[#0f0b1a] hover:bg-white/90">{tr("View in History \u2192", "צפייה בהיסטוריה \u2190")}</a>
          </div>
        ) : null}

        {list.length===0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="text-3xl">\u2606</div>
            <h2 className="mt-2 text-lg font-bold text-white">{tr("No favorites yet", "אין מועדפים עדיין")}</h2>
            <p className="mt-1 text-sm text-white/50">{tr("Go to ", "עברו אל ")}<Link href="/ideas" className="text-violet-200 underline">{tr("Ideas", "רעיונות")}</Link>{tr(" and tap \u2661 on any card — it turns \u2665 and appears here. Survives reload and restart.", " והקישו על \u2661 בכל כרטיס. הוא יהפוך ל-\u2665 ויופיע כאן. נשמר גם אחרי רענון והפעלה מחדש.")}</p>
            <Link href="/ideas" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-6 text-sm font-semibold text-white hover:bg-violet-500">{tr("Browse 11 ideas \u2192", "עיון ב-11 רעיונות \u2190")}</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((idea)=>(
              <div key={idea.id} className="flex flex-col rounded-2xl border p-4 sm:p-5 hover:shadow-lg hover:shadow-violet-500/10 transition" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: DOMAIN_COLOR[idea.domain] }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[idea.domain] }}>{DOMAIN_LABEL[idea.domain]}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeEffort(idea.effort)}`}>{idea.effort}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${idea.kind==="new"?"bg-emerald-500 text-white":"bg-amber-500 text-black"}`}>{idea.kind==="new"?tr("NEW", "חדש"):tr("ENHANCE", "שדרוג")}</span>
                  <span className="ms-auto text-[11px] text-white/60">{tr("\u2605 saved", "\u2605 שמור")}</span>
                </div>
                <h3 className="mt-2 text-[15px] font-bold leading-tight text-white">{idea.title}</h3>
                <p className="mt-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] leading-5 text-amber-100/90"><span className="font-bold">{tr("Why now:", "למה עכשיו:")}</span> {idea.whyNow}</p>
                <p className="mt-2 text-[13px] leading-5 line-clamp-2" style={{ color: VIOLET.textSecondary }}>{idea.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{idea.widgets.slice(0,4).map((w)=>(<span key={w} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75">{w}</span>))}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px]"><span className="rounded-full bg-white px-2 py-0.5 font-bold text-[#0f0b1a]">Gap {idea.gapScore}%</span>{idea.targetSlug?<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/75"><span className="inline-block rtl:rotate-180">\u2192</span> {idea.targetSlug}</span>:null}</div>
                <button onClick={()=>setExpanded(expanded===idea.id?null:idea.id)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-start hover:bg-white/[0.06]">
                  <span className="text-[12px] font-semibold text-white">{expanded===idea.id ? tr("Hide professional brief \u25b2", "הסתרת הבריף המקצועי \u25b2") : tr("Professional brief \u25bc", "בריף מקצועי \u25bc")}</span>
                  <span className="text-[11px] text-white/65">{tr("Problem \u00b7 Solution \u00b7 Benefit", "בעיה \u00b7 פתרון \u00b7 תועלת")}</span>
                </button>
                {expanded===idea.id ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 text-[12px] leading-5">
                    <div><span className="font-bold text-red-300">{tr("Problem:", "בעיה:")}</span> <span className="text-white/70">{idea.problem}</span></div>
                    <div><span className="font-bold text-violet-200">{tr("Solution:", "פתרון:")}</span> <span className="text-white/70">{idea.solution}</span></div>
                    <div><span className="font-bold text-emerald-200">{tr("Benefit:", "תועלת:")}</span> <span className="text-white/70">{idea.benefit}</span></div>
                    <div><span className="font-bold text-amber-200">{tr("Data needed:", "נתונים נדרשים:")}</span> <span className="text-white/75">{idea.dataNeeded}</span></div>
                    <div className="rounded-lg bg-white/5 p-3"><span className="font-bold text-white">{tr("Next:", "הצעד הבא:")}</span> <span className="text-violet-200">{idea.nextStep}</span></div>
                  </div>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={()=>removeFav(idea.slug)} className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-[12px] font-semibold text-white/70 hover:bg-white/10">{tr("Remove \u2605", "הסרה \u2605")}</button>
                  <button onClick={()=>setConfirmIdea(idea)} disabled={scaffolding===idea.id} className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-2 text-[12px] font-semibold disabled:opacity-50 ${idea.kind==="enhancement"?"border border-amber-500/30 bg-amber-500/15 text-amber-100 hover:bg-amber-500/20":"bg-violet-600 text-white hover:bg-violet-500"}`}>{scaffolding===idea.id?"\u2026":idea.kind==="enhancement"?tr("Scaffold tab \u2192 ", "יצירת טאב \u2190 ")+(idea.targetSlug||""):tr("Create dashboard", "יצירת דשבורד")}</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={()=>copyBuild(idea)} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 text-[11px] font-semibold text-white/70 hover:bg-white/10">{tr("Copy BUILD", "העתקת BUILD")}</button>
                  <button onClick={()=>copyImprove(idea)} className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/15">{tr("Copy IMPROVE", "העתקת IMPROVE")}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {toast ? <div className="fixed bottom-20 lg:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl">{toast}</div> : null}
        {confirmIdea ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={()=>setConfirmIdea(null)}>
            <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[var(--bg)] p-6 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${confirmIdea.kind==="new"?"bg-emerald-500 text-white":"bg-amber-500 text-black"}`}>{confirmIdea.kind==="new"?tr("NEW DASHBOARD", "דשבורד חדש"):tr("ENHANCEMENT \u2192 ", "שדרוג \u2190 ")+(confirmIdea.targetSlug||"")}</div>
              <h3 className="mt-3 text-lg font-bold text-white">{confirmIdea.kind==="new"?tr("Create new dashboard: ", "ליצור דשבורד חדש: ")+confirmIdea.slug+"?":tr("Add feature tab to ", "להוסיף טאב פיצ'ר אל ")+(confirmIdea.targetSlug||"")+"?"}</h3>
              <p className="mt-2 text-sm leading-5 text-white/75">{confirmIdea.kind==="new"?tr("This will scaffold a new Next.js project at /root/projects/", "ייווצר שלד של פרויקט Next.js חדש בנתיב /root/projects/")+confirmIdea.slug+tr(" (or /tmp/", " (או /tmp/")+confirmIdea.slug+tr(" on Vercel \u2014 ephemeral).", " ב-Vercel \u2014 זמני)."):tr("This will scaffold at /root/projects/", "ייווצר שלד בנתיב /root/projects/")+confirmIdea.slug+tr(" as a feature branch for ", " כענף פיצ'ר עבור ")+(confirmIdea.targetSlug||"")+tr(" \u2014 merge as tab inside ", " \u2014 יש למזג כטאב בתוך ")+(confirmIdea.targetSlug||"")+"."}</p>
              <div className="mt-5 flex gap-3"><button onClick={()=>setConfirmIdea(null)} className="flex-1 rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10">{tr("Cancel", "ביטול")}</button><button onClick={()=>doScaffold(confirmIdea)} className={`flex-1 rounded-full py-3 text-sm font-semibold ${confirmIdea.kind==="new"?"bg-emerald-500 text-white hover:bg-emerald-600":"bg-amber-500 text-black hover:bg-amber-600"}`}>{confirmIdea.kind==="new"?tr("Create dashboard", "יצירת דשבורד"):tr("Scaffold tab", "יצירת טאב")}</button></div>
            </div>
          </div>
        ) : null}
        <TrustLine />
      </main>
    </div>
  );
}
