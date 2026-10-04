"use client";

import { useState, useCallback, useEffect } from "react";
import { detectSlop, type SlopScore, type SlopCategory, type SlopSeverity } from "@/lib/slop-detector";
import SiteHeader from "@/components/SiteHeader";
import { pushHistory, getReopenEntry } from "@/lib/history";
import { useLang, pick, type Bi } from "@/components/i18n";

const CATEGORY_LABELS: Record<SlopCategory, Bi> = {
  typography: { en: "Typography", he: "טיפוגרפיה" },
  color: { en: "Color", he: "צבע" },
  spatial: { en: "Spatial", he: "מרחב" },
  responsive: { en: "Responsive", he: "רספונסיביות" },
  interaction: { en: "Interaction", he: "אינטראקציה" },
  motion: { en: "Motion", he: "תנועה" },
  "ux-writing": { en: "UX Writing", he: "כתיבת UX" },
};

const SEVERITY_LABELS: Record<SlopSeverity, Bi> = {
  critical: { en: "critical", he: "קריטי" },
  warning: { en: "warning", he: "אזהרה" },
  info: { en: "info", he: "מידע" },
};

const SEVERITY_STYLE: Record<SlopSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const SEVERITY_ICON: Record<SlopSeverity, string> = {
  critical: "🚨",
  warning: "⚠️",
  info: "💡",
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  const { tr } = useLang();
  const label = score >= 80 ? tr("Clean", "נקי") : score >= 60 ? tr("Needs Work", "דורש שיפור") : tr("Sloppy", "ירוד");
  return (
    <div className="relative mx-auto h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 327} 327`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-white/65">{label}</span>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { lang, tr } = useLang();
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [score, setScore] = useState<SlopScore | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [filter, setFilter] = useState<SlopCategory | "all">("all");

  // Reopen from /history
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reopenId = params.get("reopen");
      const entry = getReopenEntry();
      if (entry && (!reopenId || entry.id === reopenId) && entry.html) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating a reopened analysis from sessionStorage — browser-only, runs once on mount
        setUrl(entry.url);
        setSiteTitle(entry.title);
        try {
          const html = (entry.html as string) || "";
          if (html) setScore(detectSlop(html));
          setStep("result");
        } catch {}
      }
    } catch {}
  }, []);

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError(tr("Enter a URL first", "יש להזין URL תחילה")); return; }
    setError("");
    setStep("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json() as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) || tr("Failed", "הפעולה נכשלה")); setStep("input"); return; }

      // The server returns the page source. This used to be a cross-origin
      // fetch from the browser, which is blocked, so detectSlop() ran against
      // an empty string and every "missing X" pattern fired — healthy sites
      // scored terribly. Never score an empty document.
      const html: string = (d.html as string) || "";
      if (!html) {
        setError(tr("Could not read the page source, so no score can be produced.", "לא ניתן לקרוא את קוד המקור של הדף, ולכן לא ניתן להפיק ציון."));
        setStep("input");
        return;
      }

      setSiteTitle((d.title as string) || (d.url as string));
      const sc = detectSlop(html);
      setScore(sc);
      // History 20 — save every successful analyze (FIFO 20, Supabase fallback)
      try { pushHistory({ url: d.url as string, title: d.title as string, platform: d.platform as { platform: string }, colors: d.colors as string[], fonts: d.fonts as string[], screenshots: d.screenshots as { desktop: string|null; mobile: string|null }, profile: d.profile as unknown, html, score: sc.score }); } catch {}
      setStep("result");
    } catch {
      setError(tr("Network error", "שגיאת רשת"));
      setStep("input");
    }
  }, [url, tr]);

  const filtered = score?.results.filter(r =>
    filter === "all" ? true : r.pattern.category === filter
  ) || [];

  const detectedOnly = filtered.filter(r => r.detected);
  const passedOnly = filtered.filter(r => !r.detected);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      <SiteHeader subtitle={tr("Audit a client site", "ביקורת לאתר לקוח")} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{tr("Audit any site for AI slop", "ביקורת AI slop לכל אתר")}</h2>
            <p className="mb-6 text-sm text-white/50">
              {tr(
                "We check 46 design anti-patterns across typography, color, spacing, responsiveness, interaction, motion, and UX writing. Get a score, specific issues, and concrete CSS fixes.",
                "אנחנו בודקים 46 אנטי-פטרנים עיצוביים בטיפוגרפיה, צבע, ריווח, רספונסיביות, אינטראקציה, תנועה וכתיבת UX. תקבלו ציון, ממצאים ספציפיים ותיקוני CSS מעשיים.",
              )}
            </p>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="https://example.com" dir="ltr"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
              <button onClick={analyze} className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                {tr("Audit", "ביקורת")}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === "loading" && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
            <p className="text-lg font-semibold">{tr(`Scanning ${url} for slop…`, `סורק את ${url} לאיתור slop…`)}</p>
            <p className="mt-1 text-sm text-white/65">{tr("Checking 46 patterns across 7 categories", "בודק 46 תבניות ב-7 קטגוריות")}</p>
          </div>
        )}

        {step === "result" && score && (
          <div>
            <button onClick={() => { setStep("input"); setScore(null); }} className="mb-6 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/20">
              {tr("← New audit", "→ ביקורת חדשה")}
            </button>

            {/* Score card */}
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <h2 className="mb-1 text-lg font-bold">{siteTitle}</h2>
              <p className="mb-4 text-xs text-white/65" dir="ltr">{url}</p>
              <ScoreRing score={score.score} />
              <p className="mt-3 text-sm text-white/75">
                <span className="font-bold text-red-400">{score.detected}</span> {tr("of", "מתוך")} {score.total} {tr("slop patterns detected", "תבניות slop זוהו")}
              </p>
            </div>

            {/* Category breakdown */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {(Object.entries(score.byCategory) as [SlopCategory, { total: number; detected: number }][]).map(([cat, data]) => (
                <button key={cat} onClick={() => setFilter(filter === cat ? "all" : cat)}
                  className={`rounded-xl border p-3 text-center transition ${filter === cat ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                  <div className={`text-lg font-bold ${data.detected > 0 ? "text-red-400" : "text-green-400"}`}>
                    {data.detected}/{data.total}
                  </div>
                  <div className="text-[10px] text-white/65">{pick(CATEGORY_LABELS[cat], lang)}</div>
                </button>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === "all" ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                {tr(`All (${score.detected} issues)`, `הכול (${score.detected} ממצאים)`)}
              </button>
              {(Object.keys(CATEGORY_LABELS) as SlopCategory[]).map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === cat ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                  {pick(CATEGORY_LABELS[cat], lang)}
                </button>
              ))}
            </div>

            {/* Detected issues */}
            {detectedOnly.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">{tr(`❌ Issues Found (${detectedOnly.length})`, `❌ נמצאו ממצאים (${detectedOnly.length})`)}</h3>
                {detectedOnly.map(r => (
                  <div key={r.pattern.id} className={`rounded-xl border p-4 ${SEVERITY_STYLE[r.pattern.severity]}`}>
                    <div className="flex items-center gap-2">
                      <span>{SEVERITY_ICON[r.pattern.severity]}</span>
                      <span className="text-sm font-bold">{r.pattern.label}</span>
                      <span className="ms-auto rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase">{pick(SEVERITY_LABELS[r.pattern.severity], lang)}</span>
                    </div>
                    <div className="mt-2 rounded-lg bg-black/20 p-3">
                      <span className="text-xs font-medium text-green-400">{tr("Fix:", "תיקון:")}</span>
                      <p className="mt-0.5 text-xs text-white/70">{r.pattern.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Passed checks */}
            {passedOnly.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-green-400">{tr(`✅ Passed (${passedOnly.length})`, `✅ עברו (${passedOnly.length})`)}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passedOnly.map(r => (
                    <div key={r.pattern.id} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-xs text-white/75">{r.pattern.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
