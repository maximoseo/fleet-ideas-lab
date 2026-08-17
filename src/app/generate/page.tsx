"use client";

import { useState, useCallback } from "react";
import SiteHeader from "@/components/SiteHeader";
import { pushHistory } from "@/lib/history";
import {
  type DesignTokens,
  generateCSS,
  generateTailwind,
  generateDesignMd,
  generateShadcn,
  generateReadme,
} from "@/lib/design-system";

interface DesignSystemData {
  url: string;
  tokens: DesignTokens;
  darkVariant: DesignTokens["colors"];
  rawColors: string[];
  rawFonts: string[];
}

type ExportFormat = "css" | "tailwind" | "designmd" | "shadcn";

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-8 w-8 rounded-lg border border-white/20" style={{ background: color }} />
      <div>
        <div className="text-xs font-medium text-white/80">{label}</div>
        <div className="text-xs text-white/65" dir="ltr">{color}</div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<DesignSystemData | null>(null);
  const [format, setFormat] = useState<ExportFormat>("css");
  const [copied, setCopied] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [lovartBusy, setLovartBusy] = useState<string | null>(null);
  const [lovartResult, setLovartResult] = useState<Record<string, string>>({});

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError("Enter a URL first"); return; }
    setError("");
    setStep("loading");
    try {
      const res = await fetch("/api/design-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json() as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) || "Failed"); setStep("input"); return; }
      setData(d as unknown as DesignSystemData);
      try {
        const aRes = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
        const aData = await aRes.json() as Record<string, unknown>;
        if (aRes.ok) pushHistory({ url: aData.url as string, title: aData.title as string, platform: aData.platform as { platform: string }, colors: aData.colors as string[], fonts: aData.fonts as string[], screenshots: aData.screenshots as { desktop: string|null; mobile: string|null }, profile: aData.profile as unknown, html: aData.html as string });
      } catch {}
      setStep("result");
    } catch {
      setError("Network error");
      setStep("input");
    }
  }, [url]);

  const getExport = useCallback((): string => {
    if (!data) return "";
    switch (format) {
      case "css": return generateCSS(data.tokens, data.darkVariant);
      case "tailwind": return generateTailwind(data.tokens, data.darkVariant);
      case "designmd": return generateDesignMd(data.tokens, data.darkVariant, data.url);
      case "shadcn": return generateShadcn(data.tokens);
    }
  }, [data, format]);

  const copyExport = useCallback(() => {
    navigator.clipboard.writeText(getExport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getExport]);

  const downloadExport = useCallback(() => {
    const nameMap: Record<ExportFormat, string> = { css: "design-tokens.css", tailwind: "tailwind.config.ts", designmd: "design.md", shadcn: "shadcn-theme.json" };
    const blob = new Blob([getExport()], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nameMap[format];
    a.click();
  }, [getExport, format]);

  const downloadZip = useCallback(async () => {
    if (!data) return;
    setZipBusy(true);
    try {
      // Prefer server ZIP (uses same generators) — fallback to client-side JSZip if fetch fails
      try {
        const res = await fetch(`/api/design-system?url=${encodeURIComponent(data.url)}&format=zip`);
        if (res.ok) {
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "design-system.zip";
          a.click();
          return;
        }
      } catch {}
      // Client-side fallback
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file("design-tokens.css", generateCSS(data.tokens, data.darkVariant));
      zip.file("tailwind.config.ts", generateTailwind(data.tokens, data.darkVariant));
      zip.file("design.md", generateDesignMd(data.tokens, data.darkVariant, data.url));
      zip.file("shadcn-theme.json", generateShadcn(data.tokens));
      zip.file("tokens.json", JSON.stringify(data.tokens, null, 2));
      zip.file("README.md", generateReadme(data.tokens, data.url));
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "design-system.zip";
      a.click();
    } finally {
      setZipBusy(false);
    }
  }, [data]);

  const handleLovart = useCallback(async (style: string) => {
    if (!data) return;
    setLovartBusy(style);
    try {
      const res = await fetch("/api/lovart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, url: data.url, colors: data.tokens.colors, fonts: data.tokens.fonts }),
      });
      const j = await res.json() as { image?: string; placeholder?: boolean; error?: string };
      if (j.image) setLovartResult((prev) => ({ ...prev, [style]: j.image! }));
      else if (j.placeholder) setLovartResult((prev) => ({ ...prev, [style]: "placeholder" }));
      else if (j.error) setError(j.error);
    } catch {
      setLovartResult((prev) => ({ ...prev, [style]: "placeholder" }));
    } finally {
      setLovartBusy(null);
    }
  }, [data]);

  const lovartStyles = ["violet", "quiet", "editorial"] as const;

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="Design tokens & CSS export" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Extract a design system</h2>
            <p className="mb-6 text-sm text-white/50">
              Paste any URL. We&apos;ll extract colors, fonts, spacing, and radius — then generate a complete design system in 4 export formats, including an auto-generated dark mode variant (lightness -40 via HSL).
            </p>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="https://example.com" dir="ltr"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
              <button onClick={analyze} className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                Extract
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === "loading" && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
            <p className="text-lg font-semibold">Extracting design tokens from {url}…</p>
          </div>
        )}

        {step === "result" && data && (
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Left: visual preview */}
            <div className="space-y-6">
              <button onClick={() => { setStep("input"); setData(null); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/75 transition hover:bg-white/20">
                ← New site
              </button>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/65">Color Palette</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Object.entries(data.tokens.colors).map(([key, val]) => (
                    <Swatch key={key} color={val} label={key} />
                  ))}
                </div>
                <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-white/65">Dark Variant (HSL lightness -40)</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Object.entries(data.darkVariant).map(([key, val]) => (
                    <Swatch key={key} color={val} label={key} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/65">Typography</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-white/65">Display</span>
                    <p className="text-2xl font-bold" style={{ fontFamily: `${data.tokens.fonts.display}, sans-serif` }}>{data.tokens.fonts.display}</p>
                  </div>
                  <div>
                    <span className="text-xs text-white/65">Body</span>
                    <p className="text-lg" style={{ fontFamily: `${data.tokens.fonts.body}, sans-serif` }}>{data.tokens.fonts.body}</p>
                  </div>
                  <div>
                    <span className="text-xs text-white/65">Mono</span>
                    <p className="font-mono text-sm" style={{ fontFamily: `${data.tokens.fonts.mono}, monospace` }}>{data.tokens.fonts.mono}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/65">Spacing (baseUnit)</h3>
                  <div className="space-y-1.5">
                    {data.tokens.spacing.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-white/65">space-{i + 1}</span>
                        <div className="h-3 rounded-sm bg-violet-500/40" style={{ width: s }} />
                        <span className="text-xs text-white/60" dir="ltr">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/65">Radius</h3>
                  <div className="flex flex-wrap gap-3">
                    {data.tokens.radius.map((r, i) => (
                      <div key={i} className="text-center">
                        <div className="mx-auto h-12 w-12 border-2 border-violet-400/50 bg-violet-500/10" style={{ borderRadius: r }} />
                        <span className="mt-1 block text-xs text-white/60" dir="ltr">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shadows */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/65">Shadows</h3>
                <div className="flex flex-wrap gap-3">
                  {data.tokens.shadows.map((s, i) => (
                    <div key={i} className="flex h-16 w-28 items-center justify-center rounded-lg bg-white text-xs font-medium text-black" style={{ boxShadow: s }}>
                      {["sm", "md", "lg"][i] || i}
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw detected */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/65">Raw Detected — {data.rawColors.length} colors · {data.rawFonts.length} fonts</h3>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {data.rawColors.map((c) => (
                    <button key={c} onClick={() => navigator.clipboard.writeText(c)} title={`Click to copy ${c}`}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-white/20 px-2 text-xs transition hover:border-white/40">
                      <span className="inline-block h-4 w-4 rounded-full border border-white/20" style={{ background: c }} />
                      <span dir="ltr" className="text-white/70">{c}</span>
                    </button>
                  ))}
                  {data.rawColors.length === 0 && <span className="text-xs text-white/60">No colors detected</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.rawFonts.map((f) => (
                    <span key={f} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70" style={{ fontFamily: `${f}, sans-serif` }}>{f}</span>
                  ))}
                  {data.rawFonts.length === 0 && <span className="text-xs text-white/60">No fonts detected</span>}
                </div>
              </div>

              {/* Lovart hook */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/65">Lovart — Generate hero</h3>
                <p className="mb-3 text-xs text-white/50">Per style — calls Lovart API if key is set, otherwise shows a placeholder.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {lovartStyles.map((style) => (
                    <div key={style} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 text-xs font-semibold capitalize text-white/80">{style}</div>
                      {lovartResult[style] ? (
                        lovartResult[style] === "placeholder" ? (
                          <div className="flex h-24 items-center justify-center rounded bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 text-xs text-white/50">Placeholder hero — set LOVART_API_KEY</div>
                        ) : (
                          <img src={lovartResult[style]} alt={`${style} hero`} className="h-24 w-full rounded object-cover" />
                        )
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded bg-white/5 text-xs text-white/60">No hero yet</div>
                      )}
                      <button onClick={() => handleLovart(style)} disabled={lovartBusy === style}
                        className="mt-2 w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50">
                        {lovartBusy === style ? "Generating…" : `Generate ${style} hero`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: export panel */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-bold">📦 Export</h3>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {([["css", "CSS Variables"], ["tailwind", "Tailwind Config"], ["designmd", "design.md"], ["shadcn", "shadcn Theme"]] as const).map(([f, label]) => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${format === f ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <pre dir="ltr" className="max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-green-300/80">
                  {getExport()}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button onClick={copyExport}
                    className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                  <button onClick={downloadExport}
                    className="flex-1 rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/20">
                    Download
                  </button>
                </div>
                <button onClick={downloadZip} disabled={zipBusy}
                  className="mt-2 w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50">
                  {zipBusy ? "Building ZIP…" : "⬇ Download ZIP (5 files + README)"}
                </button>
                <p className="mt-2 text-center text-xs text-white/60">Bundles design-tokens.css, tailwind.config.ts, design.md, shadcn-theme.json, tokens.json + README</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
