"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { generateVariations, type DesignVariation, type SiteAnalysis } from "@/lib/variations";
import { PrototypeFrame, VIEWPORTS, type Viewport } from "@/components/PrototypeFrame";
import type { Prototype, SiteProfile } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import { pushHistory, getReopenEntry } from "@/lib/history";
import { detectBuilders, adaptCssForBuilders, type BuilderDetection } from "@/lib/wp-detect";

/**
 * Redesign flow.
 *
 * Steps: input → analyzing → generating → prototypes → wp-connect → wp-inject → done
 * P0.3 adds: preview iframe (clone HTML + generated CSS), Compare slider,
 * theme-level CSS (customize_save), batch (concurrency 3), revisions list + restore,
 * and builder-aware selector adaptation.
 */

type Step = "input" | "analyzing" | "generating" | "prototypes" | "wp-connect" | "wp-inject" | "done";

type Slot = { status: "pending" | "loading" | "done" | "error"; prototype?: Prototype; meta?: { macrostructure: string; direction: { name: string; fontPairing: string } }; error?: string };

const EMPTY_SLOTS: Slot[] = [{ status: "pending" }, { status: "pending" }, { status: "pending" }];

interface AnalyzeResponse extends SiteAnalysis {
  profile: SiteProfile;
  html: string;
}

/** Build a preview document: clone site HTML and inject the variation CSS (builder-adapted). */
function buildPreviewDoc(siteHtml: string, css: string, detection: BuilderDetection | null): string {
  const adapted = detection ? adaptCssForBuilders(css, detection) : css;
  if (!siteHtml) return `<!doctype html><html><head><meta charset="utf-8"><style>${adapted}</style></head><body><p style="padding:2rem;color:#888">No page HTML available for preview.</p></body></html>`;
  // Inject <style> before </head> or prepend
  if (siteHtml.includes("</head>")) {
    return siteHtml.replace("</head>", `<style data-preview>${adapted}</style></head>`);
  }
  if (siteHtml.includes("<head")) {
    return siteHtml.replace(/<head[^>]*>/i, (m) => `${m}<style data-preview>${adapted}</style>`);
  }
  return `<style data-preview>${adapted}</style>` + siteHtml;
}

function PreviewIframe({ html, viewport }: { html: string; viewport: Viewport }) {
  return <PrototypeFrame html={html} viewport={viewport} />;
}

export default function RedesignPage() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [site, setSite] = useState<AnalyzeResponse | null>(null);
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [chosen, setChosen] = useState<Prototype | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [compare, setCompare] = useState(true);

  const [variations, setVariations] = useState<DesignVariation[]>([]);
  const [variation, setVariation] = useState<DesignVariation | null>(null);
  const [showQuick, setShowQuick] = useState(false);

  // WordPress
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpStatus, setWpStatus] = useState<{ ok: boolean; siteName?: string; wpVersion?: string; authenticated?: boolean; canEdit?: boolean; pages?: { id: number; title: string; link?: string }[]; error?: string } | null>(null);
  const [wpConnecting, setWpConnecting] = useState(false);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [injectMode, setInjectMode] = useState<"draft" | "inject">("draft");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState<{ ok?: boolean; mode?: string; message?: string; draftEditUrl?: string; pageUrl?: string; backup?: unknown; error?: string; problems?: string[]; code?: string } | null>(null);

  // P0.3 — preview + batch + theme + revisions + builder detection
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [batchResult, setBatchResult] = useState<{ ok: boolean; message?: string; results?: { pageId: number; ok: boolean; error?: string; draftEditUrl?: string }[]; okCount?: number; failCount?: number } | null>(null);
  const [batching, setBatching] = useState(false);
  const [themeMode, setThemeMode] = useState(false);
  const [themeResult, setThemeResult] = useState<{ ok?: boolean; message?: string; error?: string; via?: string } | null>(null);
  const [themeInjecting, setThemeInjecting] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [showPreview, setShowPreview] = useState(true);
  const [revisions, setRevisions] = useState<{ id: number; date: string; title: string; excerpt?: string }[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const builderDetection: BuilderDetection | null = useMemo(() => {
    const html = site?.html || "";
    if (!html) return null;
    return detectBuilders(html);
  }, [site?.html]);

  const effectiveCss = useMemo(() => {
    if (chosen) return null; // prototype uses its own html
    if (!variation?.css) return "";
    if (builderDetection) return adaptCssForBuilders(variation.css, builderDetection);
    return variation.css;
  }, [variation, chosen, builderDetection]);

  const previewDoc = useMemo(() => {
    if (chosen) return chosen.html;
    if (!variation) return "";
    const html = site?.html || "";
    return buildPreviewDoc(html, variation.css, builderDetection);
  }, [chosen, variation, site?.html, builderDetection]);

  const originalDoc = useMemo(() => {
    // For compare slider when preview is CSS-based, original is the raw site HTML without injection
    return site?.html || "<!doctype html><html><body><p>No original HTML</p></body></html>";
  }, [site?.html]);

  const generateAll = useCallback(async (profile: SiteProfile) => {
    setSlots([{ status: "loading" }, { status: "loading" }, { status: "loading" }]);
    setStep("prototypes");

    const call = (payload: Record<string, unknown>) =>
      fetch("/api/generate-prototype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => ({ res, data: await res.json() }));

    const POLL_MS = 8000;
    const DEADLINE_MS = 8 * 60 * 1000;

    await Promise.all([0, 1, 2].map(async (index) => {
      const fail = (msg: string) =>
        setSlots((prev) => { const n = [...prev]; n[index] = { status: "error", error: msg }; return n; });
      try {
        const first = await call({ profile, index, count: 3 });
        if (!first.res.ok) return fail(first.data.error || `Failed (${first.res.status})`);

        let chatId: string = first.data.chatId;
        let attempt: number = first.data.attempt || 1;
        const meta = { macrostructure: first.data.macrostructure, direction: first.data.direction };
        setSlots((prev) => { const n = [...prev]; n[index] = { status: "loading", meta }; return n; });

        const started = Date.now();
        while (Date.now() - started < DEADLINE_MS) {
          await new Promise((r) => setTimeout(r, POLL_MS));
          const { res, data } = await call({ profile, index, count: 3, chatId, attempt });
          if (!res.ok) return fail(data.error || `Failed (${res.status})`);

          if (data.prototype) {
            setSlots((prev) => { const n = [...prev]; n[index] = { status: "done", prototype: data.prototype, meta }; return n; });
            return;
          }
          if (data.chatId && data.chatId !== chatId) {
            chatId = data.chatId;
            attempt = data.attempt || attempt + 1;
          }
        }
        fail("Timed out waiting for the generation.");
      } catch {
        fail("Network error");
      }
    }));
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reopenId = params.get("reopen");
      const entry = getReopenEntry();
      if (entry && (!reopenId || entry.id === reopenId) && entry.profile) {
        const payload = entry as unknown as AnalyzeResponse;
        if (payload.profile) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating a reopened profile from sessionStorage — browser-only, runs once on mount
          setUrl(entry.url);
          const fake = {
            url: entry.url,
            title: entry.title,
            platform: (entry.profile as { platform?: unknown })?.platform ?? { platform: entry.platform ?? "Unknown" },
            colors: entry.colors ?? [],
            fonts: entry.fonts ?? [],
            structure: { headings: { h1: 0, h2: 0, h3: 0 }, images: 0, links: 0, buttons: 0, forms: 0, sections: 0, hasNav: false, hasFooter: false, title: entry.title, metaDescription: "" },
            screenshots: entry.screenshots ?? { desktop: entry.screenshot, mobile: null },
            htmlSize: (entry.html ?? "").length,
            profile: entry.profile as SiteProfile,
            html: entry.html ?? "",
          } as unknown as AnalyzeResponse;
          if ((fake.profile as SiteProfile)?.url) {
            setSite(fake);
            setVariations(generateVariations(fake as unknown as SiteAnalysis));
            setStep("generating");
            void generateAll(fake.profile as SiteProfile);
          }
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError("Enter a URL first"); return; }
    setError("");
    setStep("analyzing");
    setSlots(EMPTY_SLOTS);
    setChosen(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: AnalyzeResponse & { error?: string } = await res.json();
      if (!res.ok) { setError(data.error || "Analysis failed"); setStep("input"); return; }
      setSite(data);
      setVariations(generateVariations(data));
      try { pushHistory({ url: data.url, title: data.title, platform: data.platform, colors: data.colors, fonts: data.fonts, screenshots: data.screenshots, profile: data.profile, html: data.html }); } catch {}
      setStep("generating");
      void generateAll(data.profile);
    } catch {
      setError("Network error — try again");
      setStep("input");
    }
  }, [url, generateAll]);

  const connectWp = useCallback(async () => {
    setWpConnecting(true); setWpStatus(null);
    try {
      const res = await fetch("/api/wp/connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wpUrl || url, username: wpUser, appPassword: wpPass }),
      });
      const data = await res.json();
      setWpStatus(data);
      if (data.pages?.length) {
        setSelectedPage(data.pages[0].id);
        setSelectedPages([data.pages[0].id]);
      }
    } catch {
      setWpStatus({ ok: false, error: "Connection failed" });
    }
    setWpConnecting(false);
  }, [wpUrl, url, wpUser, wpPass]);

  const push = useCallback(async () => {
    if (!selectedPage || (!chosen && !variation)) return;
    setInjecting(true); setInjectResult(null);
    try {
      const res = await fetch("/api/wp/inject", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wpUrl || url,
          username: wpUser,
          appPassword: wpPass,
          pageId: selectedPage,
          mode: injectMode,
          ...(chosen
            ? { html: chosen.html, profile: site?.profile, styleName: chosen.directionName }
            : { css: effectiveCss || variation?.css, styleName: variation?.name }),
          ...(injectMode === "inject" ? { confirmSlug } : {}),
        }),
      });
      const data = await res.json();
      setInjectResult(data);
      if (res.ok) setStep("done");
    } catch {
      setInjectResult({ ok: false, error: "Push failed" });
    }
    setInjecting(false);
  }, [chosen, variation, effectiveCss, selectedPage, wpUrl, url, wpUser, wpPass, injectMode, confirmSlug, site]);

  const pushBatch = useCallback(async () => {
    const ids = batchMode ? selectedPages : [selectedPage];
    if (!ids.length || (!chosen && !variation)) return;
    setBatching(true); setBatchResult(null);
    try {
      const res = await fetch("/api/wp/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wpUrl || url,
          username: wpUser,
          appPassword: wpPass,
          pageIds: ids,
          mode: injectMode,
          ...(chosen ? { html: chosen.html, profile: site?.profile, styleName: chosen.directionName } : { css: effectiveCss || variation?.css, styleName: variation?.name }),
          ...(injectMode === "inject" ? { confirmSlug: "__batch__" } : {}),
        }),
      });
      const data = await res.json();
      setBatchResult(data);
      if (res.ok && data.failCount === 0) setStep("done");
    } catch {
      setBatchResult({ ok: false, message: "Batch failed" });
    }
    setBatching(false);
  }, [chosen, variation, effectiveCss, selectedPage, selectedPages, batchMode, wpUrl, url, wpUser, wpPass, injectMode, site]);

  const pushTheme = useCallback(async () => {
    const cssToInject = chosen ? "" : (effectiveCss || variation?.css || "");
    // For prototype html, extract CSS to inject at theme level as fallback draft is per-page; theme CSS is css-only
    if (!cssToInject) {
      setThemeResult({ ok: false, error: "Theme injection needs a CSS variation. Use a Quick CSS tweak or create a per-page draft for prototypes." });
      return;
    }
    setThemeInjecting(true); setThemeResult(null);
    try {
      const res = await fetch("/api/wp/theme-css", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wpUrl || url, username: wpUser, appPassword: wpPass, css: cssToInject, mode: "theme" }),
      });
      const data = await res.json();
      setThemeResult(data);
      if (res.ok) setInjectResult({ ok: true, mode: "theme", message: data.message, backup: data.backup });
    } catch {
      setThemeResult({ ok: false, error: "Theme push failed" });
    }
    setThemeInjecting(false);
  }, [chosen, variation, effectiveCss, wpUrl, url, wpUser, wpPass]);

  const fetchRevisions = useCallback(async () => {
    if (!selectedPage) return;
    setRevisionsLoading(true);
    try {
      const qs = new URLSearchParams({ url: wpUrl || url, username: wpUser, appPassword: wpPass, pageId: String(selectedPage) });
      const res = await fetch(`/api/wp/revisions?${qs.toString()}`);
      const data = await res.json();
      if (res.ok) setRevisions(data.revisions || []);
      else setRevisions([]);
    } catch { setRevisions([]); }
    setRevisionsLoading(false);
  }, [selectedPage, wpUrl, url, wpUser, wpPass]);

  const restoreRevision = useCallback(async (revisionId: number) => {
    setRestoring(revisionId);
    try {
      const res = await fetch("/api/wp/revisions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wpUrl || url, username: wpUser, appPassword: wpPass, pageId: selectedPage, revisionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setInjectResult({ ok: true, mode: "restore", message: data.message });
        await fetchRevisions();
      } else {
        setInjectResult({ ok: false, error: data.error || "Restore failed" });
      }
    } catch {
      setInjectResult({ ok: false, error: "Restore failed" });
    }
    setRestoring(null);
  }, [selectedPage, wpUrl, url, wpUser, wpPass, fetchRevisions]);

  const profile = site?.profile;
  const doneCount = slots.filter((s) => s.status === "done").length;
  const allFailed = slots.length > 0 && slots.every((s) => s.status === "error");

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="Analyse a site → redesign prototypes → WordPress draft" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* ── input ── */}
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Redesign an existing site</h2>
            <p className="mb-6 text-sm leading-relaxed text-white/55">
              Enter a URL. We read the site&rsquo;s real colours, fonts, copy and prices — then generate three genuinely different redesign prototypes from it.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
              <label htmlFor="dl-url" className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.1em] text-white/45">Website URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="dl-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                  type="url" inputMode="url" placeholder="https://client-site.com" dir="ltr"
                  className="min-h-[48px] flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500" />
                <button onClick={analyze} className="min-h-[48px] rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">Analyse</button>
              </div>
              <p className="mt-3 flex items-center gap-2 text-[12px] text-white/40">
                <span aria-hidden>⏱</span> Takes 1–3 min · No login needed
              </p>
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </div>
          </div>
        )}

        {(step === "analyzing" || step === "generating") && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-sm text-white/60">
              {step === "analyzing" ? "Reading the site…" : "Generating three prototypes…"}
            </p>
            <p className="mt-1 text-xs text-white/35">Full-page generation takes 1–3 minutes.</p>
          </div>
        )}

        {/* ── prototypes ── */}
        {step === "prototypes" && profile && (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{profile.title}</h2>
                <p className="mt-1 text-sm text-white/50" dir="ltr">{profile.url}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {profile.colors.palette.slice(0, 6).map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1" dir="ltr">
                      <span className="h-3 w-3 rounded-sm border border-white/20" style={{ background: c }} />{c}
                    </span>
                  ))}
                  <span className="rounded bg-white/5 px-2 py-1 text-white/50">{profile.platform.platform}</span>
                  <span className={`rounded px-2 py-1 ${profile.source === "firecrawl" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {profile.source === "firecrawl" ? `extraction confidence ${profile.confidence.toFixed(2)}` : `low confidence (${profile.confidence.toFixed(2)}) — read from raw HTML`}
                  </span>
                  {builderDetection && (
                    <span className="rounded bg-violet-500/15 px-2 py-1 text-violet-300 border border-violet-500/20">{builderDetection.label}</span>
                  )}
                </div>
                {profile.warnings.map((w) => (
                  <p key={w} className="mt-2 max-w-2xl text-xs text-amber-300/90">{w}</p>
                ))}
                {builderDetection?.hints.map((h) => (
                  <p key={h} className="mt-1 max-w-2xl text-xs text-violet-300/70">· {h}</p>
                ))}
                <p className="mt-2 text-xs text-white/40">
                  Real content found: {profile.copy.headings.length} headings · {profile.copy.quotes.length} quotes · {profile.copy.prices.length} prices
                  {profile.copy.quotes.length === 0 && " — no testimonials will be shown, none will be invented"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                  {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => (
                    <button key={v} onClick={() => setViewport(v)}
                      className={`rounded px-3 py-1.5 text-xs transition ${viewport === v ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"}`}>
                      {VIEWPORTS[v].label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-white/50">
                  <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-violet-500" />
                  Show the current site beside it
                </label>
                <button onClick={() => setStep("input")} className="text-xs text-white/40 transition hover:text-white/70">← Analyse another site</button>
              </div>
            </div>

            <div className={`grid gap-6 ${compare ? "lg:grid-cols-2" : ""}`}>
              {compare && (
                <section className="lg:sticky lg:top-6 lg:self-start">
                  <h3 className="mb-2 text-sm font-semibold text-white/70">Current site</h3>
                  {profile.screenshots.desktop ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.screenshots.desktop} alt={`Current design of ${profile.title}`}
                      className="w-full rounded-lg border border-white/10" />
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40">
                      No screenshot available for the current site.
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-8">
                {slots.map((slot, i) => (
                  <article key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    {slot.status === "loading" && (
                      <div className="flex items-center gap-3 py-10 text-sm text-white/50">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                        Generating direction {i + 1} of 3…
                      </div>
                    )}
                    {slot.status === "error" && (
                      <p className="py-6 text-sm text-red-400">Direction {i + 1} failed: {slot.error}</p>
                    )}
                    {slot.status === "done" && slot.prototype && (
                      <>
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold">{slot.prototype.directionName}</h3>
                            <p className="mt-0.5 text-xs text-white/45">{slot.prototype.rationale}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            <span className="rounded bg-white/5 px-2 py-0.5 text-white/50">slop {slot.prototype.slopScore}/100</span>
                            <span className="rounded bg-white/5 px-2 py-0.5 text-white/50">{slot.prototype.metrics.nodes} nodes</span>
                            {slot.prototype.honestyFailed && (
                              <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-300 border border-red-500/30">content check failed</span>
                            )}
                          </div>
                        </div>

                        <PrototypeFrame html={slot.prototype.html} viewport={viewport} />

                        {slot.prototype.warnings.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-amber-300/80">{slot.prototype.warnings.length} note(s) from the automatic checks</summary>
                            <ul className="mt-2 space-y-1 text-xs text-white/50">
                              {slot.prototype.warnings.map((w) => <li key={w}>· {w}</li>)}
                            </ul>
                          </details>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => { setChosen(slot.prototype!); setVariation(null); setStep("wp-connect"); }}
                            disabled={slot.prototype.honestyFailed}
                            title={slot.prototype.honestyFailed ? "This prototype failed the content-honesty check and cannot be sent to WordPress." : undefined}
                            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                            Use this → WordPress
                          </button>
                          <a href={`data:text/html;charset=utf-8,${encodeURIComponent(slot.prototype.html)}`}
                            download={`${slot.prototype.directionId}.html`}
                            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/20">
                            Download HTML
                          </a>
                        </div>
                      </>
                    )}
                  </article>
                ))}

                {(doneCount > 0 || allFailed) && variations.length > 0 && (
                  <div className={`rounded-xl border p-4 ${allFailed ? "border-amber-500/40 bg-amber-500/5" : "border-white/10"}`}>
                    {allFailed && (
                      <p className="mb-3 text-sm text-amber-300">
                        No prototype could be generated. The options below need no AI — they restyle the
                        existing page instead of redesigning it.
                      </p>
                    )}
                    <button onClick={() => setShowQuick((s) => !s)} className="text-sm text-white/50 transition hover:text-white/80">
                      {showQuick || allFailed ? "▾" : "▸"} Quick CSS tweak (no AI) — recolours the existing page instead of redesigning it
                    </button>
                    {(showQuick || allFailed) && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {variations.map((v) => (
                          <button key={v.id} onClick={() => { setVariation(v); setChosen(null); setStep("wp-connect"); }}
                            className="rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-violet-500/50">
                            <div className="text-sm font-semibold">{v.name}</div>
                            <p className="mt-0.5 text-xs text-white/45">{v.tagline}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* ── WordPress connect ── */}
        {step === "wp-connect" && (
          <div className="mx-auto max-w-xl">
            <button onClick={() => setStep("prototypes")} className="mb-4 text-sm text-white/40 transition hover:text-white/70">← Back to prototypes</button>
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Connect WordPress</h2>
            <p className="mb-6 text-sm text-white/50">
              Create an <span className="text-violet-300">Application Password</span> in WP admin → Users → Profile. Credentials are used for this request only and are never stored.
            </p>
            <div className="space-y-3">
              <input value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} placeholder="Site URL (defaults to the analysed URL)" dir="ltr"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={wpUser} onChange={(e) => setWpUser(e.target.value)} placeholder="WordPress username" dir="ltr" autoComplete="off"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500" />
                <input value={wpPass} onChange={(e) => setWpPass(e.target.value)} placeholder="Application password" type="password" dir="ltr" autoComplete="off"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500" />
              </div>
              <button onClick={connectWp} disabled={wpConnecting}
                className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50">
                {wpConnecting ? "Connecting…" : "Connect"}
              </button>
            </div>

            {wpStatus && (
              <div className={`mt-4 rounded-xl border p-4 text-sm ${wpStatus.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                {wpStatus.ok ? (
                  <>
                    <p className="font-semibold text-green-400">Connected to {wpStatus.siteName || "WordPress"}</p>
                    <p className="mt-1 text-white/50">
                      WordPress {wpStatus.wpVersion || ""} · {wpStatus.authenticated ? (wpStatus.canEdit ? "authenticated with edit rights" : "authenticated, limited rights") : "not authenticated"}
                    </p>
                    {builderDetection && <p className="mt-1 text-xs text-violet-300">Builder: {builderDetection.label}</p>}
                    <p className="mt-1 text-xs text-white/40">{wpStatus.pages?.length ?? 0} pages found (up to 100)</p>
                    {wpStatus.authenticated && (wpStatus.pages?.length ?? 0) > 0 && (
                      <button onClick={() => setStep("wp-inject")} className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
                        Choose the page →
                      </button>
                    )}
                    {wpStatus.authenticated && (wpStatus.pages?.length ?? 0) === 0 && (
                      <p className="mt-2 text-yellow-400">No published pages found on this site.</p>
                    )}
                  </>
                ) : (
                  <p className="text-red-400">{wpStatus.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── push (preview + batch + theme + revisions) ── */}
        {step === "wp-inject" && (chosen || variation) && (
          <div className="mx-auto max-w-3xl">
            <button onClick={() => setStep("wp-connect")} className="mb-4 text-sm text-white/40 transition hover:text-white/70">← Back</button>
            <h2 className="mb-1 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>
              Send “{chosen?.directionName || variation?.name}” to WordPress
            </h2>
            {builderDetection && (
              <p className="mb-4 text-xs text-violet-300">Builder: {builderDetection.label} — selectors adapted for this stack.</p>
            )}

            {/* ── Preview iframe before inject ── */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/80">Preview before you inject</h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-white/50">
                    <input type="checkbox" checked={showPreview} onChange={(e) => setShowPreview(e.target.checked)} className="accent-violet-500" />
                    Show preview
                  </label>
                  <div className="flex gap-1 rounded bg-white/5 p-1">
                    {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => (
                      <button key={v} onClick={() => setViewport(v)} className={`rounded px-2 py-1 text-[11px] ${viewport === v ? "bg-violet-600 text-white" : "text-white/40"}`}>{VIEWPORTS[v].label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {showPreview && previewDoc ? (
                <>
                  {!chosen && site?.html ? (
                    <>
                      {/* Compare slider: original vs preview */}
                      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white" style={{ height: 520 }}>
                        {/* Original at base */}
                        <iframe
                          srcDoc={originalDoc}
                          title="Original page"
                          sandbox="allow-same-origin"
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                        />
                        {/* Preview clipped */}
                        <div
                          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-violet-500"
                          style={{ width: `${comparePos}%` }}
                        >
                          <iframe
                            srcDoc={previewDoc}
                            title="Preview with new CSS"
                            sandbox="allow-same-origin"
                            style={{ width: "100%", height: "100%", border: 0 }}
                          />
                          <span className="absolute left-2 top-2 rounded bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">Preview</span>
                        </div>
                        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">Original</span>
                        {/* Handle */}
                        <div className="absolute top-1/2 -translate-y-1/2 rounded-full bg-violet-600 p-1 shadow-lg" style={{ left: `calc(${comparePos}% - 12px)` }}>
                          <span className="block h-5 w-5 flex items-center justify-center text-[10px] text-white">↔</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs text-white/40">Original</span>
                        <input type="range" min={0} max={100} value={comparePos} onChange={(e) => setComparePos(Number(e.target.value))} className="flex-1 accent-violet-500" />
                        <span className="text-xs text-white/40">Preview</span>
                      </div>
                      <p className="mt-2 text-xs text-white/40">This clones the live page HTML and applies the selected CSS inside the iframe — nothing is written to WordPress until you click inject.</p>
                    </>
                  ) : (
                    <>
                      <PreviewIframe html={previewDoc} viewport={viewport} />
                      <p className="mt-2 text-xs text-white/40">Prototype preview — this is the full generated document.</p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/40">Preview hidden. Toggle to see the styled page before injection.</p>
              )}
            </div>

            {/* ── Target pages ── */}
            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm font-medium text-white/60">Target page{batchMode ? "s (batch)" : ""}</label>
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked={batchMode} onChange={(e) => { setBatchMode(e.target.checked); setBatchResult(null); }} className="accent-violet-500" />
                Batch — select multiple pages
              </label>
            </div>

            {!batchMode ? (
              <select value={selectedPage} onChange={(e) => { setSelectedPage(+e.target.value); setConfirmSlug(""); }}
                dir="ltr" className="mb-5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500">
                {(wpStatus?.pages || []).map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#161322]">{p.title}</option>
                ))}
              </select>
            ) : (
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-2 flex gap-2">
                  <button onClick={() => setSelectedPages((wpStatus?.pages || []).map((p) => p.id))} className="text-xs text-violet-300 hover:text-violet-200">Select all</button>
                  <span className="text-xs text-white/20">·</span>
                  <button onClick={() => setSelectedPages([])} className="text-xs text-white/40 hover:text-white/60">Clear</button>
                  <span className="ml-auto text-xs text-white/40">{selectedPages.length} selected</span>
                </div>
                <div className="max-h-56 overflow-auto space-y-1">
                  {(wpStatus?.pages || []).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/5">
                      <input type="checkbox" checked={selectedPages.includes(p.id)} onChange={(e) => setSelectedPages((prev) => e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id))} className="accent-violet-500" />
                      <span className="text-white/80">{p.title}</span>
                      <span className="ml-auto text-xs text-white/30">#{p.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <button onClick={() => { setInjectMode("draft"); setThemeMode(false); }}
                className={`rounded-xl border p-4 text-left transition ${injectMode === "draft" && !themeMode ? "border-green-500 bg-green-500/10" : "border-white/15 bg-white/5 hover:border-white/30"}`}>
                <div className="text-sm font-bold text-green-400">Draft — recommended</div>
                <p className="mt-1 text-xs text-white/50">Creates a new draft page{batchMode ? "s" : ""}. The live page is not touched. {batchMode && "Concurrency 3."}</p>
              </button>
              <button onClick={() => { setInjectMode("inject"); setThemeMode(false); }}
                className={`rounded-xl border p-4 text-left transition ${injectMode === "inject" && !themeMode ? "border-yellow-500 bg-yellow-500/10" : "border-white/15 bg-white/5 hover:border-white/30"}`}>
                <div className="text-sm font-bold text-yellow-400">Overwrite the live page</div>
                <p className="mt-1 text-xs text-white/50">Replaces the published content now. A revision is recorded first. {batchMode && "Use with care."}</p>
              </button>
            </div>

            {/* Theme-level injection */}
            <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                <input type="checkbox" checked={themeMode} onChange={(e) => setThemeMode(e.target.checked)} className="accent-violet-500" />
                Inject as theme Additional CSS (Customizer)
              </label>
              <p className="mt-1 text-xs text-white/40">Uses WordPress Customizer <code className="text-violet-300">customize_save</code> → <code className="text-violet-300">additional CSS</code>. Applies to every page. Per-page draft is kept as fallback.</p>
              {themeMode && (
                <button onClick={pushTheme} disabled={themeInjecting || (!variation && !chosen)}
                  className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40">
                  {themeInjecting ? "Injecting to theme…" : "Inject to theme Additional CSS"}
                </button>
              )}
              {themeResult && (
                <div className={`mt-3 rounded-lg border p-3 text-xs ${themeResult.ok ? "border-green-500/30 bg-green-500/5 text-green-300" : "border-red-500/30 bg-red-500/5 text-red-300"}`}>
                  {themeResult.ok ? themeResult.message : themeResult.error}
                  {themeResult.via && <span className="ml-2 text-white/40">via {themeResult.via}</span>}
                </div>
              )}
            </div>

            {injectMode === "inject" && !batchMode && !themeMode && (
              <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-sm text-yellow-300">This changes what visitors see immediately.</p>
                <label htmlFor="slug" className="mb-2 mt-3 block text-xs text-white/60">
                  Type the target page&apos;s slug exactly to confirm. The server checks it against the page ID you selected.
                </label>
                <input id="slug" value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} placeholder="page-slug" dir="ltr"
                  className="w-full rounded-lg border border-yellow-500/30 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-yellow-500" />
              </div>
            )}

            {/* Action buttons */}
            {!themeMode && (
              <div className="space-y-3">
                <button onClick={batchMode ? pushBatch : push} disabled={batching || injecting || (batchMode ? selectedPages.length === 0 : !selectedPage) || (injectMode === "inject" && !batchMode && !confirmSlug.trim())}
                  className={`w-full rounded-xl py-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${injectMode === "draft" ? "bg-green-600 hover:bg-green-500" : "bg-yellow-600 hover:bg-yellow-500"}`}>
                  {batching || injecting ? "Sending…" : batchMode ? `${injectMode === "draft" ? "Create drafts" : "Overwrite"} ${selectedPages.length} page(s) (concurrency 3)` : injectMode === "draft" ? "Create the draft" : "Overwrite the live page"}
                </button>
                {batchResult && (
                  <div className={`rounded-xl border p-4 text-sm ${batchResult.ok ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                    <p className={batchResult.ok ? "text-green-300" : "text-amber-300"}>{batchResult.message || (batchResult.ok ? "Batch done" : "Batch had failures")}</p>
                    {batchResult.results && (
                      <ul className="mt-2 space-y-1 text-xs text-white/60">
                        {batchResult.results.map((r) => (
                          <li key={r.pageId} className={r.ok ? "text-white/60" : "text-red-400"}>#{r.pageId} {r.ok ? "✓" : `✗ ${r.error}`} {r.draftEditUrl && <a href={r.draftEditUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-violet-300 underline">Edit</a>}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {injectResult && injectResult.error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
                <p className="text-red-400">{injectResult.error}</p>
                {injectResult.problems?.map((p) => <p key={p} className="mt-1 text-xs text-white/60">· {p}</p>)}
              </div>
            )}

            {/* Revisions */}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/70">Revisions</h3>
                <button onClick={fetchRevisions} disabled={revisionsLoading} className="rounded bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/15 disabled:opacity-40">
                  {revisionsLoading ? "Loading…" : "Load revisions"}
                </button>
              </div>
              {revisions.length === 0 ? (
                <p className="text-xs text-white/40">No revisions loaded. Click “Load revisions” to list WordPress revisions for the selected page. One-click restore below.</p>
              ) : (
                <ul className="space-y-2">
                  {revisions.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-white/70">#{r.id} · {new Date(r.date).toLocaleString()}</div>
                        {r.excerpt && <div className="truncate text-xs text-white/30">{r.excerpt}</div>}
                      </div>
                      <button onClick={() => restoreRevision(r.id)} disabled={restoring === r.id} className="shrink-0 rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
                        {restoring === r.id ? "Restoring…" : "Restore"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── done ── */}
        {step === "done" && injectResult?.ok && (
          <div className="mx-auto max-w-xl text-center">
            <h2 className="mt-3 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>
              {injectResult.mode === "draft" ? "Draft created" : injectResult.mode === "theme" ? "Theme CSS updated" : injectResult.mode === "restore" ? "Revision restored" : "Live page updated"}
            </h2>
            <p className="mt-2 text-sm text-white/60">{injectResult.message}</p>
            <div className="mt-6 space-y-3">
              {injectResult.draftEditUrl && (
                <a href={injectResult.draftEditUrl} target="_blank" rel="noopener noreferrer" dir="ltr"
                  className="block rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">Open the draft in WP admin ↗</a>
              )}
              {injectResult.pageUrl && (
                <a href={injectResult.pageUrl} target="_blank" rel="noopener noreferrer" dir="ltr"
                  className="block rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">View the live page ↗</a>
              )}
              <button onClick={() => { setStep("prototypes"); setInjectResult(null); setBatchResult(null); setThemeResult(null); }}
                className="w-full rounded-xl bg-white/10 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/20">Back to the prototypes</button>
            </div>
            {batchResult?.results && (
              <div className="mt-6 text-left rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="text-sm font-semibold text-white/70">Batch results</h4>
                <ul className="mt-2 space-y-1 text-xs text-white/60">
                  {batchResult.results.map((r) => (
                    <li key={r.pageId} className={r.ok ? "text-white/60" : "text-red-400"}>#{r.pageId} {r.ok ? "✓" : `✗ ${r.error}`}</li>
                  ))}
                </ul>
              </div>
            )}
            {Boolean(injectResult.backup) && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">Original content backup (JSON)</summary>
                <pre dir="ltr" className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-white/50">{JSON.stringify(injectResult.backup as object, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
