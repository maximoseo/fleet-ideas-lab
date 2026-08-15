"use client";

import { useState, useCallback, useRef } from "react";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { pushHistory } from "@/lib/history";

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

const EFFORT_LABEL: Record<string, string> = {
  easy: "⚡ Easy",
  medium: "🔧 Medium",
  hard: "🏗 Hard",
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
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [siteTitle, setSiteTitle] = useState("");
  const [pullY, setPullY] = useState(0);
  const pullStart = useRef<number | null>(null);

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError("Enter a URL first"); return; }
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
      if (!res.ok) { setError((analysis.error as string) || "Failed"); setStep("input"); return; }

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
      setError("Network error");
      setStep("input");
    }
  }, [url]);

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
    <div className="min-h-screen bg-[#0c0a14] text-white" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <SiteHeader subtitle="AI design ideas" />
      {pullY > 0 ? (<div className="flex justify-center py-2" style={{ opacity: pullY / 72 }}><span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${pullY > 48 ? "border-violet-500/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-white/50"}`}><span className={pullY > 48 ? "animate-spin inline-block" : ""}>{pullY > 48 ? "\u21bb" : "\u2193"}</span>{pullY > 48 ? "Release to reload" : "Pull to reload"}</span></div>) : null}

      <main className="mx-auto max-w-4xl px-6 py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-8">
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Get design suggestions</h2>
            <p className="mb-6 text-sm text-white/50">
              We analyze the site's typography, colors, layout, CTAs, mobile UX, and accessibility — then give you a prioritized list of concrete improvements ranked by impact.
            </p>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="https://example.com" dir="ltr"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
              <button onClick={analyze} className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                Analyze
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === "loading" && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
            <p className="text-lg font-semibold">Analyzing {url}…</p>
            <p className="mt-1 text-sm text-white/40">Generating prioritized suggestions</p>
          </div>
        )}

        {step === "result" && (
          <div>
            <button onClick={() => { setStep("input"); setSuggestions([]); }} className="mb-6 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/20">
              ← New analysis
            </button>

            <h2 className="mb-1 text-lg font-bold">{siteTitle}</h2>
            <p className="mb-6 text-sm text-white/50">{suggestions.length} suggestions · {highImpact.length} high impact · {quickWins.length} quick wins</p>

            {/* Quick wins banner */}
            {quickWins.length > 0 && (
              <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <h3 className="mb-2 text-sm font-bold text-green-400">⚡ Quick Wins ({quickWins.length})</h3>
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
                        <span className="text-xs text-white/30">#{i + 1}</span>
                        <h4 className="text-sm font-bold">{s.title}</h4>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${IMPACT_STYLE[s.impact]}`}>
                          {s.impact} impact
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
                          {EFFORT_LABEL[s.effort]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/50">
                        <span className="font-medium text-red-400/80">Issue: </span>{s.issue}
                      </p>
                      <div className="mt-2 rounded-lg bg-violet-500/10 p-3">
                        <p className="text-xs text-white/70">
                          <span className="font-medium text-violet-300">Fix: </span>{s.recommendation}
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
                <p className="mt-3 text-sm text-white/50">No major issues detected — this site looks solid!</p>
              </div>
            )}
          </div>
        )}
        <TrustLine />
      </main>
    </div>
  );
}
