"use client";

import { useState, useCallback } from "react";
import { STYLES, type StyleId, type StyleTokens } from "@/lib/styles";
import SiteHeader from "@/components/SiteHeader";
import { pushHistory } from "@/lib/history";

interface SectionImage { src: string; alt: string }
interface SectionButton { label: string; href?: string }

interface DetectedSection {
  type: string;
  label: string;
  order: number;
  headings: string[];
  hasImage: boolean;
  hasButton: boolean;
  hasForm: boolean;
  paragraphs?: string[];
  images?: SectionImage[];
  buttons?: SectionButton[];
  formFields?: string[];
  rawHtml?: string;
}

interface MockupData {
  url: string;
  title: string;
  sections: DetectedSection[];
  screenshots: { desktop: string | null; mobile: string | null };
  sectionCount: number;
  copy?: {
    siteName: string;
    tagline: string;
    h1: string;
    headings: string[];
    navLabels: string[];
    ctaLabels: string[];
    paragraphs: string[];
    quotes: string[];
    prices: string[];
  };
  colors?: { palette: string[]; primary?: string; accent?: string };
  typography?: { headingFont?: string; bodyFont?: string };
}

type Viewport = "desktop" | "mobile";

/* ── Content-real Section renderer using StyleTokens ── */
function SectionMockup({ section, style, copy }: { section: DetectedSection; style: StyleTokens; copy?: MockupData["copy"] }) {
  const p = {
    bg: style.bg,
    surface: style.surface,
    text: style.textPrimary,
    muted: style.textMuted,
    accent: style.accent,
    accentStrong: style.accentStrong,
    radius: style.radius,
    radiusBtn: style.radiusBtn,
    fontDisplay: style.fontDisplay,
    fontBody: style.fontBody,
  };

  const headings = section.headings.length ? section.headings : copy?.headings.slice(0, 2) ?? [];
  const paragraphs = section.paragraphs?.length ? section.paragraphs : copy?.paragraphs.slice(0, 1) ?? [];
  const images = section.images ?? [];
  const buttons = section.buttons?.length ? section.buttons : (section.type === "hero" || section.type === "cta" ? (copy?.ctaLabels.slice(0, 2).map((l) => ({ label: l })) ?? []) : []);
  const quotes = copy?.quotes ?? [];
  const prices = copy?.prices ?? [];

  const wrap: React.CSSProperties = {
    fontFamily: `${p.fontBody}, sans-serif`,
    borderRadius: p.radius,
    overflow: "hidden",
    border: `1px solid ${style.border}`,
  };

  // Nav
  if (section.type === "nav") {
    const navLabels = headings.length ? headings : copy?.navLabels.slice(0, 5) ?? ["Home", "About", "Services", "Contact"];
    return (
      <div style={{ ...wrap, background: p.surface, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.text, fontSize: 14 }}>{copy?.siteName || "Logo"}</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {navLabels.slice(0, 6).map((l) => (
            <span key={l} style={{ color: p.muted, fontSize: 12 }}>{l}</span>
          ))}
        </div>
        {buttons[0] && (
          <span style={{ background: p.accentStrong, color: "#fff", padding: "6px 14px", borderRadius: p.radiusBtn, fontSize: 12, fontWeight: 600 }}>{buttons[0].label}</span>
        )}
      </div>
    );
  }

  // Hero
  if (section.type === "hero") {
    return (
      <div style={{ ...wrap, background: `linear-gradient(135deg, ${p.bg}, ${p.surface})`, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 800, fontSize: 28, color: p.text, marginBottom: 12, lineHeight: 1.15 }}>{headings[0] || copy?.h1 || "Untitled hero"}</div>
        {headings[1] && <div style={{ color: p.muted, fontSize: 14, marginBottom: 10 }}>{headings[1]}</div>}
        {paragraphs[0] && <div style={{ color: p.muted, fontSize: 14, maxWidth: 560, margin: "0 auto 20px", lineHeight: 1.6 }}>{paragraphs[0].slice(0, 180)}</div>}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {buttons.slice(0, 2).map((b) => (
            <span key={b.label} style={{ display: "inline-block", background: p.accentStrong, color: "#fff", padding: "10px 24px", borderRadius: p.radiusBtn, fontSize: 14, fontWeight: 600 }}>{b.label}</span>
          ))}
          {buttons.length === 0 && <span style={{ display: "inline-block", background: p.accentStrong, color: "#fff", padding: "10px 24px", borderRadius: p.radiusBtn, fontSize: 14, fontWeight: 600 }}>{copy?.ctaLabels[0] || "Get Started"}</span>}
        </div>
        {images[0] && (
          <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
            <img src={images[0].src} alt={images[0].alt || ""} style={{ maxWidth: 420, maxHeight: 220, objectFit: "cover", borderRadius: p.radius, border: `1px solid ${style.border}` }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          </div>
        )}
      </div>
    );
  }

  // Features
  if (section.type === "features") {
    const cards = headings.length ? headings : copy?.headings.slice(0, 3) ?? ["Feature One", "Feature Two", "Feature Three"];
    return (
      <div style={{ ...wrap, background: p.bg, padding: "40px 32px" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: 20, color: p.text, marginBottom: 20, textAlign: "center" }}>{headings[0] || "Features"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {cards.slice(0, 3).map((h, i) => (
            <div key={h + i} style={{ background: p.surface, borderRadius: p.radius, padding: 20, border: `1px solid ${style.border}` }}>
              {images[i] ? (
                <img src={images[i].src} alt={images[i].alt || ""} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: p.radius, marginBottom: 12 }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${p.accent}22`, marginBottom: 12 }} />
              )}
              <div style={{ fontWeight: 600, color: p.text, fontSize: 13, marginBottom: 6, fontFamily: `${p.fontDisplay}, sans-serif` }}>{h}</div>
              <div style={{ color: p.muted, fontSize: 12, lineHeight: 1.5 }}>{paragraphs[i]?.slice(0, 90) || "Real site copy — no lorem."}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Testimonials
  if (section.type === "testimonials") {
    const qs = quotes.length ? quotes.slice(0, 2) : paragraphs.slice(0, 2);
    return (
      <div style={{ ...wrap, background: p.surface, padding: "40px 32px" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: 20, color: p.text, marginBottom: 20, textAlign: "center" }}>{headings[0] || "What people say"}</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {qs.slice(0, 2).map((q, i) => (
            <div key={i} style={{ background: p.bg, borderRadius: p.radius, padding: 20, maxWidth: 320, border: `1px solid ${style.border}` }}>
              <div style={{ color: p.text, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>&ldquo;{q.slice(0, 160)}&rdquo;</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {images[i] ? <img src={images[i].src} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${p.accent}33` }} />}
                <span style={{ fontSize: 11, color: p.muted }}>{headings[i + 1] || "Customer"}</span>
              </div>
            </div>
          ))}
          {qs.length === 0 && <div style={{ color: p.muted, fontSize: 12 }}>No testimonials found on source — none invented.</div>}
        </div>
      </div>
    );
  }

  // Pricing
  if (section.type === "pricing") {
    const pr = prices.length ? prices.slice(0, 3) : ["—", "—", "—"];
    return (
      <div style={{ ...wrap, background: p.bg, padding: "40px 32px" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: 20, color: p.text, marginBottom: 20, textAlign: "center" }}>{headings[0] || "Pricing"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 16, maxWidth: 640, margin: "0 auto" }}>
          {pr.map((price, i) => (
            <div key={i} style={{ background: p.surface, borderRadius: p.radius, padding: 20, textAlign: "center", border: i === 1 ? `2px solid ${p.accent}` : `1px solid ${style.border}` }}>
              <div style={{ fontSize: 12, color: p.muted, marginBottom: 8 }}>{headings[i + 1] || ["Basic", "Pro", "Enterprise"][i]}</div>
              <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 800, fontSize: 22, color: p.text, marginBottom: 12 }}>{price}</div>
              <span style={{ display: "inline-block", background: i === 1 ? p.accentStrong : "transparent", color: i === 1 ? "#fff" : p.accent, padding: "6px 16px", borderRadius: p.radiusBtn, fontSize: 12, border: i === 1 ? "none" : `1px solid ${p.accent}` }}>{buttons[i]?.label || "Choose"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CTA
  if (section.type === "cta") {
    return (
      <div style={{ ...wrap, background: p.accentStrong, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 8 }}>{headings[0] || "Ready to get started?"}</div>
        {paragraphs[0] && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 16 }}>{paragraphs[0].slice(0, 120)}</div>}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {buttons.slice(0, 2).map((b) => (
            <span key={b.label} style={{ display: "inline-block", background: "#fff", color: p.accentStrong, padding: "10px 22px", borderRadius: p.radiusBtn, fontSize: 13, fontWeight: 600 }}>{b.label}</span>
          ))}
          {buttons.length === 0 && <span style={{ display: "inline-block", background: "#fff", color: p.accentStrong, padding: "10px 22px", borderRadius: p.radiusBtn, fontSize: 13, fontWeight: 600 }}>{copy?.ctaLabels[0] || "Sign Up Free"}</span>}
        </div>
        {section.formFields && section.formFields.length > 0 && (
          <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {section.formFields.slice(0, 3).map((f) => (
              <span key={f} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "8px 14px", borderRadius: p.radiusBtn, fontSize: 12 }}>{f}</span>
            ))}
            <span style={{ background: "#fff", color: p.accentStrong, padding: "8px 16px", borderRadius: p.radiusBtn, fontSize: 12, fontWeight: 600 }}>Submit</span>
          </div>
        )}
      </div>
    );
  }

  // Gallery
  if (section.type === "gallery") {
    return (
      <div style={{ ...wrap, background: p.bg, padding: "40px 32px" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: 20, color: p.text, marginBottom: 20, textAlign: "center" }}>{headings[0] || "Gallery"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 8 }}>
          {images.length ? images.slice(0, 8).map((img, i) => (
            <img key={img.src + i} src={img.src} alt={img.alt || ""} style={{ aspectRatio: "1", objectFit: "cover", borderRadius: p.radius, border: `1px solid ${style.border}` }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          )) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: "1", borderRadius: p.radius, background: `${p.accent}${(14 + i * 4).toString(16).padStart(2, "0")}` }} />
          ))}
        </div>
      </div>
    );
  }

  // Content
  if (section.type === "content") {
    return (
      <div style={{ ...wrap, background: p.bg, padding: "40px 32px" }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, fontSize: 20, color: p.text, marginBottom: 12 }}>{headings[0] || copy?.headings[0] || "About"}</div>
        {headings[1] && <div style={{ color: p.muted, fontSize: 13, marginBottom: 12 }}>{headings[1]}</div>}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {paragraphs.slice(0, 2).map((para, i) => (
              <div key={i} style={{ color: p.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{para.slice(0, 220)}</div>
            ))}
            {buttons[0] && <span style={{ display: "inline-block", marginTop: 8, background: p.accentStrong, color: "#fff", padding: "8px 18px", borderRadius: p.radiusBtn, fontSize: 12, fontWeight: 600 }}>{buttons[0].label}</span>}
          </div>
          {images[0] && <img src={images[0].src} alt={images[0].alt || ""} style={{ width: 160, height: 110, objectFit: "cover", borderRadius: p.radius, border: `1px solid ${style.border}` }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
        </div>
      </div>
    );
  }

  // Footer
  if (section.type === "footer") {
    return (
      <div style={{ ...wrap, background: p.surface, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.text, fontSize: 13 }}>{copy?.siteName || headings[0] || "Logo"}</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(headings.length ? headings.slice(0, 4) : ["Privacy", "Terms", "Contact"]).map((l) => (
            <span key={l} style={{ color: p.muted, fontSize: 11 }}>{l}</span>
          ))}
        </div>
        {buttons[0] && <span style={{ color: p.accent, fontSize: 11, border: `1px solid ${p.accent}`, padding: "4px 10px", borderRadius: p.radiusBtn }}>{buttons[0].label}</span>}
      </div>
    );
  }

  // Fallback
  return (
    <div style={{ ...wrap, background: p.bg, padding: "32px" }}>
      <div style={{ fontWeight: 600, color: p.text, marginBottom: 8 }}>{section.label}</div>
      {headings[0] && <div style={{ color: p.muted, fontSize: 13 }}>{headings[0]}</div>}
    </div>
  );
}

/* ── Component previews (buttons/cards/forms/nav with site copy) ── */
function ComponentPreviews({ style, copy, sections }: { style: StyleTokens; copy?: MockupData["copy"]; sections: DetectedSection[] }) {
  const p = style;
  const buttons = sections.flatMap((s) => s.buttons ?? []).slice(0, 6);
  const fallbackButtons = copy?.ctaLabels.slice(0, 4).map((l) => ({ label: l })) ?? [];
  const btns = buttons.length ? buttons : fallbackButtons;
  const images = sections.flatMap((s) => s.images ?? []).slice(0, 4);
  const headings = copy?.headings.slice(0, 3) ?? [];

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {/* Buttons */}
      <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius, padding: 20 }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.textPrimary, fontSize: 13, marginBottom: 12 }}>Buttons — {copy?.siteName || "site"} copy</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {btns.slice(0, 4).map((b, i) => (
            <span key={b.label + i} style={{ padding: i === 0 ? "10px 20px" : "8px 16px", borderRadius: p.radiusBtn, fontSize: 13, fontWeight: 600, background: i === 0 ? p.accentStrong : "transparent", color: i === 0 ? "#fff" : p.accent, border: i === 0 ? "none" : `1.5px solid ${p.accent}`, fontFamily: `${p.fontBody}, sans-serif` }}>{b.label}</span>
          ))}
          {btns.length === 0 && <span style={{ color: p.textMuted, fontSize: 12 }}>No buttons found — none invented.</span>}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <span style={{ padding: "6px 12px", borderRadius: p.radiusBtn, fontSize: 11, background: `${p.accent}18`, color: p.textMuted, border: `1px solid ${p.border}` }}>Hover: {p.accent}</span>
          <span style={{ padding: "6px 12px", borderRadius: p.radiusBtn, fontSize: 11, background: p.bg, color: p.textMuted, border: `1px solid ${p.border}` }}>Focus ring</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius, padding: 20 }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.textPrimary, fontSize: 13, marginBottom: 12 }}>Cards</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: p.radius, padding: 14 }}>
              {images[i] ? <img src={images[i].src} alt="" style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: p.radius, marginBottom: 8 }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <div style={{ height: 48, borderRadius: p.radius, background: `${p.accent}14`, marginBottom: 8 }} />}
              <div style={{ fontWeight: 600, color: p.textPrimary, fontSize: 12, fontFamily: `${p.fontDisplay}, sans-serif`, marginBottom: 4 }}>{headings[i] || `Card ${i + 1}`}</div>
              <div style={{ color: p.textMuted, fontSize: 11, lineHeight: 1.5 }}>{copy?.paragraphs[i]?.slice(0, 70) || "Real paragraph from the site."}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius, padding: 20 }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.textPrimary, fontSize: 13, marginBottom: 12 }}>Form</div>
        {(() => {
          const fields = sections.find((s) => s.formFields && s.formFields.length)?.formFields ?? ["name", "email", "message"];
          return (
            <div style={{ display: "grid", gap: 10 }}>
              {fields.slice(0, 3).map((f) => (
                <div key={f} style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 11, color: p.textMuted, textTransform: "capitalize" }}>{f}</span>
                  <div style={{ height: 36, borderRadius: p.radiusBtn, border: `1px solid ${p.border}`, background: p.bg, display: "flex", alignItems: "center", padding: "0 12px", color: p.textMuted, fontSize: 12 }}>{f}</div>
                </div>
              ))}
              <span style={{ marginTop: 4, display: "inline-block", textAlign: "center", background: p.accentStrong, color: "#fff", padding: "10px", borderRadius: p.radiusBtn, fontSize: 13, fontWeight: 600 }}>{btns[0]?.label || "Submit"}</span>
            </div>
          );
        })()}
      </div>

      {/* Nav */}
      <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: p.radius, padding: 20 }}>
        <div style={{ fontFamily: `${p.fontDisplay}, sans-serif`, fontWeight: 700, color: p.textPrimary, fontSize: 13, marginBottom: 12 }}>Navigation</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${p.border}`, borderRadius: p.radius, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: p.bg, borderBottom: `1px solid ${p.border}` }}>
            <span style={{ fontWeight: 700, color: p.textPrimary, fontFamily: `${p.fontDisplay}, sans-serif`, fontSize: 12 }}>{copy?.siteName || "Site"}</span>
            <span style={{ color: p.textMuted, fontSize: 11 }}>☰</span>
          </div>
          {(copy?.navLabels.slice(0, 5) ?? ["Home", "About", "Services"]).map((l) => (
            <div key={l} style={{ padding: "10px 14px", color: p.textPrimary, fontSize: 12, borderBottom: `1px solid ${p.border}`, background: p.surface }}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function MockupPage() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<MockupData | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("violet");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [showOriginal, setShowOriginal] = useState(false);

  const analyze = useCallback(async () => {
    if (!url.trim()) { setError("Enter a URL first"); return; }
    setError("");
    setStep("loading");
    try {
      const res = await fetch("/api/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json() as Record<string, unknown>;
      if (!res.ok) { setError((d.error as string) || "Failed"); setStep("input"); return; }
      setData(d as unknown as MockupData);
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

  const style = STYLES[selectedStyle];

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="Full-page mockups — content-real" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {step === "input" && (
          <div className="mx-auto max-w-xl">
            <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Generate full-page mockups</h2>
            <p className="mb-6 text-sm text-white/50">Paste a URL — sections are extracted with real headings, images, buttons and forms, then re-skinned in your chosen style. No lorem.</p>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} placeholder="https://example.com" dir="ltr" className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500" />
              <button onClick={analyze} className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500">Generate</button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        )}

        {step === "loading" && (
          <div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
            <p className="text-lg font-semibold">Analyzing {url}…</p>
            <p className="mt-1 text-sm text-white/40">Firecrawl branding + DOM fallback · Microlink screenshots · section extraction</p>
          </div>
        )}

        {step === "result" && data && (
          <div>
            {/* Controls */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button onClick={() => { setStep("input"); setData(null); }} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/20">New site</button>
              <div className="flex gap-1.5">
                {(["desktop", "mobile"] as const).map((vp) => (
                  <button key={vp} onClick={() => setViewport(vp)} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${viewport === vp ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>{vp === "desktop" ? "🖥 Desktop" : "📱 Mobile"}</button>
                ))}
              </div>
              <button onClick={() => setShowOriginal(!showOriginal)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${showOriginal ? "bg-green-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>{showOriginal ? "✓ Original" : "Original"}</button>
              <div className="ml-auto flex gap-1.5 flex-wrap">
                {Object.values(STYLES).map((s) => (
                  <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${selectedStyle === s.id ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>{s.name.split(" ")[0]}</button>
                ))}
              </div>
            </div>

            {/* PrototypeFrame-style viewport label */}
            <div className="mb-3 flex items-center gap-2 text-xs text-white/30">
              <span className="rounded bg-white/10 px-2 py-0.5">{viewport === "desktop" ? "Desktop 1280" : "Mobile 390"}</span>
              <span>{data.title}</span>
              <span className="text-white/20">·</span>
              <span>{data.sectionCount} sections</span>
            </div>

            {/* Original screenshots */}
            {showOriginal && (
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                {data.screenshots.desktop && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Original — Desktop</h3>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
                      <img src={data.screenshots.desktop} alt="Original desktop" className="w-full object-contain object-top" style={{ maxHeight: 520 }} />
                    </div>
                  </div>
                )}
                {data.screenshots.mobile && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Original — Mobile</h3>
                    <div className="mx-auto overflow-hidden rounded-xl border border-white/10 bg-white" style={{ maxWidth: 390 }}>
                      <img src={data.screenshots.mobile} alt="Original mobile" className="w-full object-contain object-top" style={{ maxHeight: 520 }} />
                    </div>
                  </div>
                )}
                {!data.screenshots.desktop && !data.screenshots.mobile && <p className="text-sm text-white/40">No screenshots available for this URL.</p>}
              </div>
            )}

            {/* Scrollable mockup — sections with PrototypeFrame scaling */}
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/40">{data.sectionCount} sections — &ldquo;{style.name}&rdquo; · {viewport === "mobile" ? "390px" : "1280px"}</h3>
            <div className={viewport === "mobile" ? "mx-auto max-w-[390px] space-y-4" : "space-y-4"}>
              {data.sections.map((section, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">{section.label}</span>
                    <span className="text-xs text-white/30">#{i + 1} · {section.type}</span>
                    {section.headings[0] && <span className="truncate text-xs text-white/20">&ldquo;{section.headings[0].slice(0, 50)}&rdquo;</span>}
                  </div>
                  <SectionMockup section={section} style={style} copy={data.copy} />
                </div>
              ))}
            </div>

            {/* Component previews */}
            <h3 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-white/40">Component previews — real copy · {style.name}</h3>
            <ComponentPreviews style={style} copy={data.copy} sections={data.sections} />

            {/* Style comparison */}
            <h3 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-white/40">All 5 styles — hero</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.values(STYLES).map((s) => {
                const hero = data.sections.find((sec) => sec.type === "hero") || data.sections[0];
                return (
                  <div key={s.id} onClick={() => setSelectedStyle(s.id)} className={`cursor-pointer rounded-2xl border p-3 transition-all hover:-translate-y-1 ${selectedStyle === s.id ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                    <SectionMockup section={hero} style={s} copy={data.copy} />
                    <div className="mt-2 px-1"><span className="text-xs font-semibold text-white/80">{s.name}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
