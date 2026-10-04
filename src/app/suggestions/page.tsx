"use client";

import { useState, useCallback, useRef } from "react";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { pushHistory } from "@/lib/history";
import { useLang, pick, type Bi } from "@/components/i18n";

interface Suggestion {
  id: string;
  category: string;
  title: string;
  issue: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
}

const IMPACT_STYLE: Record<string, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const EFFORT_LABEL: Record<string, Bi> = {
  easy: { en: "⚡ Easy", he: "⚡ קל" },
  medium: { en: "🔧 Medium", he: "🔧 בינוני" },
  hard: { en: "🏗 Hard", he: "🏗 מורכב" },
};

const IMPACT_LABEL: Record<string, Bi> = {
  high: { en: "high impact", he: "השפעה גבוהה" },
  medium: { en: "medium impact", he: "השפעה בינונית" },
  low: { en: "low impact", he: "השפעה נמוכה" },
};

const CATEGORY_ICON: Record<string, string> = {
  layout: "📐",
  typography: "🔤",
  color: "🎨",
  spacing: "↔️",
  cta: "👆",
  mobile: "📱",
  accessibility: "♿",
};

export default function SuggestionsPage() {
  const { lang, tr } = useLang();
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [siteTitle, setSiteTitle] = useState("");
  const [pullY, setPullY] = useState(0);
  const pullStart = useRef<number | null>(null);

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError(tr("Enter a URL first", "יש להזין כתובת URL")); return; }
    setError("");
    setStep("loading");
    try {
      // 1. Analyze the site
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const analysis = await res.json() as Record<string, unknown>;
      if (!res.ok) { setError((analysis.error as string) || tr("Failed", "הפעולה נכשלה")); setStep("input"); return; }

      setSiteTitle((analysis.title as string) || (analysis.url as string));
      // History 20 — save every successful analyze
      try { pushHistory({ url: analysis.url as string, title: analysis.title as string, platform: analysis.platform as { platform: string }, colors: analysis.colors as string[], fonts: analysis.fonts as string[], screenshots: analysis.screenshots as { desktop: string|null; mobile: string|null }, profile: analysis.profile as unknown, html: analysis.html as string }); } catch {}

      // 2. Generate suggestions
      const sugRes = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const sugData = await sugRes.json() as Record<string, unknown>;
      setSuggestions((sugData.suggestions as Suggestion[]) || []);
      setStep("result");
    } catch {
      setError(tr("Network error", "שגיאת רשת"));
      setStep("input");
    }
  }, [url, tr]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) pullStart.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0 && window.scrollY === 0) setPullY(Math.min(dy * 0.4, 72));
  }, []);
  const onTouchEnd = useCallback(() => {
    if (pullY > 48 && step === "result") analyze();
    pullStart.current = null;
    setPullY(0);
  }, [pullY, step, analyze]);

  const highImpact = suggestions.filter(s => s.impact === "high");
  const quickWins = suggestions.filter(s => s.effort === "easy");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <SiteHeader subtitle={tr("AI design ideas", "רעיונות עיצוב מבוססי AI")} />
      {pullY > 0 ? (<div className="flex justify-center py-2" style={{ opacity: pullY / 72 }}><span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${pullY > 48 ? "border-violet-500/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-white/50"}`}><span className={pullY > 48 ? "animate-spin inline-block" : ""}>{pullY > 48 ? "\u21bb" : "\u2193"}</span>{pullY > 48 ? tr("Release to reload", "שחררו לטעינה מחדש") : tr("Pull to reload", "משכו לטעינה מחדש")}</span></div>) : null}

      <main className="mx-auto max-w-4xl px-6 py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{tr("Get design suggestions", "קבלת הצעות עיצוב")}</h2>
            <p className="mb-6 text-sm text-white/50">
              {tr("We analyze the site's typography, colors, layout, CTAs, mobile UX, and accessibility — then give you a prioritized list of concrete improvements ranked by impact.", "אנחנו מנתחים את הטיפוגרפיה, הצבעים, הפריסה, כפתורי ה-CTA, חוויית המובייל והנגישות של האתר, ומחזירים רשימה מתועדפת של שיפורים קונקרטיים לפי השפעה.")}
            </p>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="https://example.com" dir="ltr"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
              <button onClick={analyze} className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                {tr("Analyze", "ניתוח")}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === "loading" && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
            <p className="text-lg font-semibold">{tr("Analyzing", "מנתח")} {url}…</p>
            <p className="mt-1 text-sm text-white/65">{tr("Generating prioritized suggestions", "מכין הצעות מתועדפות")}</p>
          </div>
        )}

        {step === "result" && (
          <div>
            <button onClick={() => { setStep("input"); setSuggestions([]); }} className="mb-6 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/20">
              {tr("← New analysis", "→ ניתוח חדש")}
            </button>

            <h2 className="mb-1 text-lg font-bold">{siteTitle}</h2>
            <p className="mb-6 text-sm text-white/50">{suggestions.length} {tr("suggestions", "הצעות")} · {highImpact.length} {tr("high impact", "השפעה גבוהה")} · {quickWins.length} {tr("quick wins", "שיפורים מהירים")}</p>

            {/* Quick wins banner */}
            {quickWins.length > 0 && (
              <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-green-400">{tr("⚡ Quick Wins", "⚡ שיפורים מהירים")} ({quickWins.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {quickWins.map(s => (
                    <span key={s.id} className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-300">{s.title}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions list */}
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{CATEGORY_ICON[s.category] || "💡"}</span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-white/60">#{i + 1}</span>
                        <h4 className="text-sm font-bold">{s.title}</h4>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${IMPACT_STYLE[s.impact]}`}>
                          {pick(IMPACT_LABEL[s.impact] || { en: `${s.impact} impact`, he: `${s.impact} impact` }, lang)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
                          {EFFORT_LABEL[s.effort] ? pick(EFFORT_LABEL[s.effort], lang) : s.effort}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/50">
                        <span className="font-medium text-red-400/80">{tr("Issue: ", "בעיה: ")}</span>{s.issue}
                      </p>
                      <div className="mt-2 rounded-lg bg-violet-500/10 p-3">
                        <p className="text-xs text-white/70">
                          <span className="font-medium text-violet-200">{tr("Fix: ", "תיקון: ")}</span>{s.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {suggestions.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-4xl">🎉</p>
                <p className="mt-3 text-sm text-white/50">{tr("No major issues detected — this site looks solid!", "לא זוהו בעיות משמעותיות, האתר נראה מצוין!")}</p>
              </div>
            )}
          </div>
        )}
        <TrustLine />
      </main>
    </div>
  );
}
