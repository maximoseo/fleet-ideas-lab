"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { STYLE_LIST, STYLES, type StyleId, type StyleTokens } from "@/lib/styles";
import { detectSlopForStyle, type SlopScore, type SlopCategory, type SlopSeverity } from "@/lib/slop-detector";
import SiteHeader from "@/components/SiteHeader";

/* ── Tweaks state ── */
interface Tweaks {
  fontScale: number;
  accentOverride: string | null;
  radiusScale: number;
  motionLevel: number; // 0=none 1=subtle 2=normal 3=expressive
  spacingScale: number;
}

const DEFAULT_TWEAKS: Tweaks = {
  fontScale: 1,
  accentOverride: null,
  radiusScale: 1,
  motionLevel: 1,
  spacingScale: 1,
};

const ACCENT_OPTIONS = [
  "#7c3aed", "#a78bfa", "#0d9488", "#2563eb",
  "#dc2626", "#d97706", "#059669", "#e11d48",
];

const TWEAKS_KEY = "arena-tweaks";

function encodeTweaks(t: Tweaks): string {
  try { return btoa(encodeURIComponent(JSON.stringify(t))); } catch { return ""; }
}
function decodeTweaks(s: string): Tweaks | null {
  try { return JSON.parse(decodeURIComponent(atob(s))) as Tweaks; } catch { return null; }
}
function isDefaultTweaks(t: Tweaks): boolean {
  return t.fontScale === DEFAULT_TWEAKS.fontScale && t.accentOverride === DEFAULT_TWEAKS.accentOverride && t.radiusScale === DEFAULT_TWEAKS.radiusScale && t.motionLevel === DEFAULT_TWEAKS.motionLevel && t.spacingScale === DEFAULT_TWEAKS.spacingScale;
}
function buildBrief(style: StyleTokens, tweaks: Tweaks): string {
  const accent = tweaks.accentOverride ?? style.accent;
  return `Design brief — ${style.name} (${style.id})
` +
    `Mood: ${style.description}
` +
    `Palette: bg ${style.bg} / surface ${style.surface} / accent ${accent} (strong ${style.accentStrong})
` +
    `Type: display ${style.fontDisplay} / body ${style.fontBody}
` +
    `Radius: ${Math.round(parseInt(style.radius) * tweaks.radiusScale)}px (btn ${Math.round(parseInt(style.radiusBtn) * tweaks.radiusScale)}px)
` +
    `Tweaks: font ${tweaks.fontScale.toFixed(1)}x, spacing ${tweaks.spacingScale.toFixed(1)}x, motion ${["none","subtle","normal","expressive"][tweaks.motionLevel]}
` +
    `Use for v0/Lovart: "${style.name} dashboard, ${style.description.split(".")[0].toLowerCase()}, accent ${accent}"`;
}
function buildImagePrompt(style: StyleTokens): string {
  return `Hero image prompt — ${style.name}: ${style.description.split(".")[0]}, palette ${style.bg} + ${style.accent}, font pairing ${style.fontDisplay} + ${style.fontBody}, mood board, high detail, 16:9, no text`;
}

const CATEGORY_LABELS: Record<SlopCategory, string> = {
  typography: "Typography",
  color: "Color",
  spatial: "Spatial",
  responsive: "Responsive",
  interaction: "Interaction",
  motion: "Motion",
  "ux-writing": "UX Writing",
};

const SEVERITY_STYLE: Record<SlopSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const SEVERITY_LABEL: Record<SlopSeverity, string> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};

/* ── ScoreRing ── */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  const label = score >= 80 ? "Clean" : score >= 60 ? "Needs Work" : "Sloppy";
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-white/40">{label}</span>
      </div>
    </div>
  );
}

/* ── SlopScorecard ── */
function SlopScorecard({ score }: { score: SlopScore }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copyFix = useCallback((id: string, fix: string) => {
    navigator.clipboard.writeText(fix);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const detected = score.results.filter((r) => r.detected);
  const passed = score.results.filter((r) => !r.detected);

  return (
    <div className="space-y-4">
      {/* Header ring + summary */}
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <ScoreRing score={score.score} size={80} />
        <div className="flex-1">
          <p className="text-sm font-bold">
            {score.score} <span className="font-normal text-white/40">/ 100</span>
          </p>
          <p className="text-xs text-white/50">
            <span className="font-bold text-red-400">{score.detected}</span> of {score.total} patterns detected
          </p>
          <p className="mt-1 text-[10px] text-white/30">46 patterns · 7 categories · weighted by severity</p>
        </div>
      </div>

      {/* Category bars */}
      <div className="grid grid-cols-1 gap-1.5">
        {(Object.entries(score.byCategory) as [SlopCategory, { total: number; detected: number }][]).map(([cat, data]) => {
          const pct = data.total ? (data.detected / data.total) * 100 : 0;
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[11px] text-white/50">{CATEGORY_LABELS[cat]}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: data.detected === 0 ? "#34d399" : pct > 40 ? "#f87171" : "#fbbf24",
                  }}
                />
              </div>
              <span className={`w-10 text-right text-[11px] font-bold ${data.detected > 0 ? "text-red-400" : "text-green-400"}`}>
                {data.detected}/{data.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detected issues with fix + copy */}
      {detected.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-400">Issues ({detected.length})</h4>
          {detected.map((r) => (
            <div key={r.pattern.id} className={`rounded-xl border p-3 ${SEVERITY_STYLE[r.pattern.severity]}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{r.pattern.label}</span>
                <span className="ml-auto rounded-full bg-black/20 px-2 py-0.5 text-[9px] uppercase tracking-wide">{SEVERITY_LABEL[r.pattern.severity]}</span>
              </div>
              <p className="mt-1 text-[10px] text-white/35">{r.pattern.category} · {r.pattern.id}</p>
              <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-black/25 p-2.5">
                <p className="flex-1 text-xs leading-relaxed text-white/70">{r.pattern.fix}</p>
                <button
                  onClick={() => copyFix(r.pattern.id, r.pattern.fix)}
                  className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/20 transition"
                >
                  {copied === r.pattern.id ? "Copied!" : "Copy fix"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-green-500/10 p-4 text-center border border-green-500/20">
          <span className="text-xl">✅</span>
          <p className="mt-1 text-sm font-semibold text-green-400">No slop detected</p>
          <p className="text-xs text-white/40">This style is clean across all 46 checks</p>
        </div>
      )}

      {/* Passed collapsible */}
      {passed.length > 0 && (
        <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <summary className="cursor-pointer text-xs font-semibold text-green-400">✅ Passed ({passed.length})</summary>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {passed.map((r) => (
              <div key={r.pattern.id} className="flex items-center gap-1.5 rounded-lg border border-green-500/15 bg-green-500/5 px-2.5 py-1.5">
                <span className="text-green-400 text-[10px]">✓</span>
                <span className="text-[11px] text-white/55">{r.pattern.label}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── SlopOverlay — marker dots on preview when issues exist ── */
function SlopOverlay({ score }: { score: SlopScore }) {
  const detected = score.results.filter((r) => r.detected);
  if (detected.length === 0) return null;
  // Show up to 3 floating markers at corners to indicate slop without obscuring preview
  const markers = detected.slice(0, 3);
  return (
    <div className="pointer-events-none absolute inset-0">
      {markers.map((r, i) => (
        <span
          key={r.pattern.id}
          className="absolute flex h-5 w-5 items-center justify-center rounded-full border bg-red-500/90 text-[10px] font-bold text-white shadow-lg"
          style={{
            top: i === 0 ? 8 : i === 1 ? 56 : undefined,
            bottom: i === 2 ? 52 : undefined,
            right: 8,
            borderColor: r.pattern.severity === "critical" ? "#ef4444" : r.pattern.severity === "warning" ? "#eab308" : "#60a5fa",
          }}
          title={`${r.pattern.label}: ${r.pattern.fix}`}
        >
          !
        </span>
      ))}
    </div>
  );
}

/* ── Dashboard Preview Component ── */
function DashboardPreview({ style, tweaks, slopScore }: { style: StyleTokens; tweaks: Tweaks; slopScore?: SlopScore }) {
  const accent = tweaks.accentOverride ?? style.accent;
  const r = Math.round(parseInt(style.radius) * tweaks.radiusScale);
  const rb = Math.round(parseInt(style.radiusBtn) * tweaks.radiusScale);
  const fs = tweaks.fontScale;
  const sp = tweaks.spacingScale;
  const motion = tweaks.motionLevel;
  const transition = motion === 0 ? "none" : motion === 1 ? "150ms ease" : motion === 2 ? "200ms ease" : "300ms cubic-bezier(0.34,1.56,0.64,1)";

  return (
    <div
      dir="ltr"
      className="relative overflow-hidden border shadow-lg"
      style={{
        background: style.bg,
        borderColor: style.border,
        borderRadius: r + 4,
        fontFamily: `${style.fontBody}, sans-serif`,
        fontSize: `${14 * fs}px`,
        transition,
      }}
    >
      {slopScore && <SlopOverlay score={slopScore} />}
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: style.surface, borderBottom: `1px solid ${style.border}` }}
      >
        <span style={{ fontFamily: `${style.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: `${16 * fs}px`, color: style.textPrimary }}>
          Client Board
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: style.success }} />
          <span style={{ color: style.textMuted, fontSize: `${12 * fs}px` }}>Connected</span>
        </div>
      </div>

      {/* Nav chips */}
      <div className="flex gap-1.5 px-4 py-2" style={{ background: style.surface }}>
        {["Today", "Clients", "Tasks", "Automations"].map((label, i) => (
          <span
            key={label}
            className="px-2.5 py-1 text-xs font-medium"
            style={{
              borderRadius: 9999,
              background: i === 0 ? accent : "transparent",
              color: i === 0 ? "#fff" : style.textSecondary,
              border: i === 0 ? "none" : `1px solid ${style.border}`,
              transition,
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 p-4" style={{ gap: `${8 * sp}px` }}>
        {[
          { label: "Active clients", value: "35", color: accent },
          { label: "Open tasks", value: "128", color: style.warning },
          { label: "Automations", value: "94%", color: style.success },
          { label: "Alerts", value: "3", color: style.error },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3"
            style={{
              background: style.elevated,
              borderRadius: r,
              border: `1px solid ${style.border}`,
              transition,
            }}
          >
            <div style={{ fontFamily: `${style.fontDisplay}, sans-serif`, fontWeight: 800, fontSize: `${24 * fs}px`, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ color: style.textMuted, fontSize: `${11 * fs}px`, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table preview */}
      <div className="px-4 pb-4">
        <div className="p-3" style={{ background: style.surface, borderRadius: r, border: `1px solid ${style.border}` }}>
          <div className="mb-2 flex items-center justify-between">
            <span style={{ fontWeight: 600, color: style.textPrimary, fontSize: `${13 * fs}px` }}>Recent tasks</span>
            <span className="px-2 py-0.5 text-xs" style={{ background: style.accentGlow, color: accent, borderRadius: rb }}>
              View all
            </span>
          </div>
          {["Content update — Client A", "SEO scan — Client B", "Monthly report — Client C"].map((task, i) => (
            <div
              key={task}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: i < 2 ? `1px solid ${style.border}` : "none" }}
            >
              <span style={{ color: style.textSecondary, fontSize: `${12 * fs}px` }}>{task}</span>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: i === 0 ? style.success : i === 1 ? style.warning : style.error }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-2.5 text-sm font-semibold text-white"
          style={{ background: style.accentStrong, borderRadius: rb, transition }}
        >
          + New client
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function Home() {
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("violet");
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [showTweaks, setShowTweaks] = useState(false);
  const [showSlop, setShowSlop] = useState(false);
  const [compare, setCompare] = useState<"styled" | "original">("styled");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const style = STYLES[selectedStyle];
  const slopScore = useMemo(() => detectSlopForStyle(style, tweaks), [style, tweaks]);

  // Precompute scores for all style cards (without tweaks, for badge)
  const allScores = useMemo(() => {
    const m = new Map<StyleId, SlopScore>();
    for (const s of STYLE_LIST) m.set(s.id, detectSlopForStyle(s));
    return m;
  }, []);

  const updateTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  const doCopy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  // URL + localStorage sync for style/compare/tweaks
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("style") as StyleId | null;
      if (s && STYLES[s]) setSelectedStyle(s);
      const c = params.get("compare");
      if (c === "original" || c === "styled") setCompare(c);
      const t = params.get("tweaks");
      if (t) {
        const decoded = decodeTweaks(t);
        if (decoded) setTweaks(decoded);
      } else {
        const raw = localStorage.getItem(TWEAKS_KEY);
        if (raw) { try { setTweaks(JSON.parse(raw)); } catch {} }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)); } catch {}
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("style", selectedStyle);
      params.set("compare", compare);
      if (isDefaultTweaks(tweaks)) params.delete("tweaks");
      else params.set("tweaks", encodeTweaks(tweaks));
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    } catch {}
  }, [selectedStyle, compare, tweaks]);

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="Style Arena · Tweaks · Slop Detector" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Page title + panel toggles */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white/95">Style Arena</h1>
            <p className="text-[12.5px] text-white/50">5 styles · tap a card to inspect · slop scored from 46 patterns</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => { setShowTweaks(!showTweaks); setShowSlop(false); }}
              aria-pressed={showTweaks}
              className={`inline-flex h-10 items-center rounded-lg border px-3 text-[12.5px] font-medium transition ${
                showTweaks ? "border-violet-500 bg-violet-600/20 text-violet-200" : "border-white/12 text-white/55 hover:text-white"
              }`}
            >
              Tweaks
            </button>
            <button
              onClick={() => { setShowSlop(!showSlop); setShowTweaks(false); }}
              aria-pressed={showSlop}
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition ${
                showSlop ? "border-violet-500 bg-violet-600/20 text-violet-200" : "border-white/12 text-white/55 hover:text-white"
              }`}
            >
              Slop check
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${slopScore.score >= 80 ? "bg-green-500/20 text-green-400" : slopScore.score >= 60 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                {slopScore.score}
              </span>
            </button>
          </div>
        </div>

        {/* Style selector */}
        <div className="mb-5 scroll-row -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {STYLE_LIST.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`shrink-0 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
                selectedStyle === s.id
                  ? "border-violet-400/70 bg-violet-600/20 text-violet-100"
                  : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Compare toggle */}
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-white/55">תצוגה: <span className="font-bold text-white/80">{compare === "styled" ? "מעוצב" : "מקור ↔ מעוצב"}</span></p>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            <button onClick={() => setCompare("styled")} className={`px-3 py-1.5 text-xs font-semibold transition ${compare === "styled" ? "bg-violet-600 text-white" : "bg-white/5 text-white/55 hover:text-white"}`}>מעוצב</button>
            <button onClick={() => setCompare("original")} className={`px-3 py-1.5 text-xs font-semibold transition ${compare === "original" ? "bg-violet-600 text-white" : "bg-white/5 text-white/55 hover:text-white"}`}>Original ↔ מעוצב</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Style Arena — all 5 previews */}
          <div>
            {compare === "original" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 px-1 text-xs font-bold text-white/50">מקור (placeholder)</p>
                  <div className="rounded-xl border border-white/10 bg-white p-4 text-zinc-700">
                    <div className="mb-3 h-3 w-24 rounded bg-zinc-200" />
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded border border-zinc-200 bg-zinc-50" />
                      <div className="h-16 rounded border border-zinc-200 bg-zinc-50" />
                      <div className="h-16 rounded border border-zinc-200 bg-zinc-50" />
                      <div className="h-16 rounded border border-zinc-200 bg-zinc-50" />
                    </div>
                    <p className="text-xs text-zinc-400">השוואה צד-לצד — המקור כ-placeholder עד חיבור screenshot אמיתי (Microlink/Firecrawl).</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 px-1 text-xs font-bold text-white/50">מעוצב — {style.name}</p>
                  <DashboardPreview style={style} tweaks={tweaks} slopScore={showSlop ? slopScore : undefined} />
                </div>
              </div>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {STYLE_LIST.map((s) => {
                const sc = allScores.get(s.id)!;
                const isSelected = selectedStyle === s.id;
                const tweakedScore = isSelected ? slopScore : sc;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0c0a14]" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ borderRadius: 16 }}
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                      <p className="text-[13px] font-bold text-white/90">{s.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tweakedScore.score >= 80 ? "bg-green-500/15 text-green-400" : tweakedScore.score >= 60 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                        {tweakedScore.score} · {tweakedScore.score >= 80 ? "Clean" : tweakedScore.score >= 60 ? "Needs Work" : "Sloppy"}
                      </span>
                    </div>
                    <p className="mb-2 px-1 text-[11px] text-white/40 line-clamp-1">{s.description.split(".")[0]}</p>
                    <DashboardPreview style={s} tweaks={s.id === selectedStyle ? tweaks : DEFAULT_TWEAKS} slopScore={showSlop ? tweakedScore : undefined} />
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => doCopy(`brief-${s.id}`, buildBrief(s, s.id === selectedStyle ? tweaks : DEFAULT_TWEAKS))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:text-white">{copiedKey === `brief-${s.id}` ? "Copied!" : "Copy Brief"}</button>
                    <button onClick={() => doCopy(`img-${s.id}`, buildImagePrompt(s))} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:text-white">{copiedKey === `img-${s.id}` ? "Copied!" : "Image Prompt"}</button>
                  </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Selected style info */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="mb-1 text-sm font-bold">{style.name}</h3>
                  <p className="mb-3 text-xs text-white/50">{style.description}</p>
                </div>
                <ScoreRing score={slopScore.score} size={56} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[style.bg, style.surface, style.accent, style.accentStrong, style.success, style.warning, style.error].map((c) => (
                  <span key={c} className="inline-block h-6 w-6 rounded border border-white/20" style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="mt-2 flex gap-2 text-xs text-white/40">
                <span>Display: {style.fontDisplay}</span>
                <span>·</span>
                <span>Body: {style.fontBody}</span>
              </div>
              <p className="mt-2 text-[11px] text-white/30">Slop: {slopScore.detected}/{slopScore.total} · Score {slopScore.score} · {slopScore.score >= 80 ? "Clean" : slopScore.score >= 60 ? "Needs Work" : "Sloppy"}</p>
            </div>

            {/* Tweaks Bar */}
            {showTweaks && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                <h3 className="text-sm font-bold">⚙️ Tweaks Bar</h3>

                <div>
                  <label className="text-xs text-white/50">Font size: {tweaks.fontScale.toFixed(1)}×</label>
                  <input type="range" min={0.8} max={1.4} step={0.1} value={tweaks.fontScale}
                    onChange={(e) => updateTweak("fontScale", +e.target.value)}
                    className="w-full accent-violet-500" />
                </div>

                <div>
                  <label className="text-xs text-white/50">Radius: {tweaks.radiusScale.toFixed(1)}×</label>
                  <input type="range" min={0.5} max={2} step={0.1} value={tweaks.radiusScale}
                    onChange={(e) => updateTweak("radiusScale", +e.target.value)}
                    className="w-full accent-violet-500" />
                </div>

                <div>
                  <label className="text-xs text-white/50">Spacing: {tweaks.spacingScale.toFixed(1)}×</label>
                  <input type="range" min={0.7} max={1.5} step={0.1} value={tweaks.spacingScale}
                    onChange={(e) => updateTweak("spacingScale", +e.target.value)}
                    className="w-full accent-violet-500" />
                </div>

                <div>
                  <label className="text-xs text-white/50">Motion: {["None", "Subtle", "Normal", "Expressive"][tweaks.motionLevel]}</label>
                  <input type="range" min={0} max={3} step={1} value={tweaks.motionLevel}
                    onChange={(e) => updateTweak("motionLevel", +e.target.value)}
                    className="w-full accent-violet-500" />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Accent color:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCENT_OPTIONS.map((c) => (
                      <button key={c}
                        onClick={() => updateTweak("accentOverride", tweaks.accentOverride === c ? null : c)}
                        className={`h-7 w-7 rounded-full border-2 transition ${tweaks.accentOverride === c ? "border-white scale-110" : "border-transparent"}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => doCopy("brief-selected", buildBrief(style, tweaks))} className="rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500">{copiedKey === "brief-selected" ? "Copied!" : "Copy Brief"}</button>
                  <button onClick={() => doCopy("img-selected", buildImagePrompt(style))} className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/60 hover:text-white">{copiedKey === "img-selected" ? "Copied!" : "Image Prompt"}</button>
                </div>
                <button
                  onClick={() => setTweaks(DEFAULT_TWEAKS)}
                  className="w-full rounded-lg bg-white/10 py-2 text-xs text-white/60 hover:bg-white/20 transition"
                >
                  Reset tweaks
                </button>
              </div>
            )}

            {/* Slop Detector — wired to 46 patterns */}
            {showSlop && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-bold">🔍 Slop Detector — 46 patterns</h3>
                <SlopScorecard score={slopScore} />
                <p className="mt-3 text-[11px] text-white/30">
                  Wired to <code className="text-white/50">lib/slop-detector.ts</code> (7 categories). Overlay markers shown on previews.
                </p>
              </div>
            )}

            {/* Export */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-bold">📦 Export</h3>
              <p className="mb-3 text-xs text-white/40">
                Export design tokens as CSS variables to paste directly into a dashboard
              </p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button onClick={() => doCopy("brief-export", buildBrief(style, tweaks))} className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/60 hover:text-white">{copiedKey === "brief-export" ? "Copied!" : "Copy Brief"}</button>
                <button onClick={() => doCopy("img-export", buildImagePrompt(style))} className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-white/60 hover:text-white">{copiedKey === "img-export" ? "Copied!" : "Image Prompt"}</button>
              </div>
              <button
                onClick={() => {
                  const css = `:root {\n  --bg-base: ${style.bg};\n  --bg-surface: ${style.surface};\n  --bg-elevated: ${style.elevated};\n  --border: ${style.border};\n  --text-primary: ${style.textPrimary};\n  --text-secondary: ${style.textSecondary};\n  --text-muted: ${style.textMuted};\n  --accent: ${tweaks.accentOverride ?? style.accent};\n  --accent-strong: ${style.accentStrong};\n  --accent-glow: ${style.accentGlow};\n  --success: ${style.success};\n  --warning: ${style.warning};\n  --error: ${style.error};\n  --radius: ${Math.round(parseInt(style.radius) * tweaks.radiusScale)}px;\n  --radius-btn: ${Math.round(parseInt(style.radiusBtn) * tweaks.radiusScale)}px;\n  --font-display: "${style.fontDisplay}";\n  --font-body: "${style.fontBody}";\n}`;
                  navigator.clipboard.writeText(css);
                  alert("CSS variables copied!");
                }}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition"
              >
                Copy CSS Variables
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
