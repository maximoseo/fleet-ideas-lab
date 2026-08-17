import type { ProfileCopy, ProfileSection, SiteProfile } from "./types";
import { CONFIDENCE_FLOOR } from "./types";
import { sanitizeHtml } from "./extract/html";
import { extractCopy } from "./extract/copy";
import { detectSections } from "./extract/sections";
import { isNoise } from "./extract/html";
import { detectPlatform, extractColorsFromHtml, extractFontsFromHtml } from "./extract/design";

// The public surface is unchanged — every existing import of "@/lib/extract"
// still resolves, so the split is invisible to callers.
export { sanitizeHtml } from "./extract/html";
export { extractCopy } from "./extract/copy";
export { detectSections } from "./extract/sections";
export { detectPlatform, extractColorsFromHtml, extractFontsFromHtml } from "./extract/design";

/**
 * Site extraction.
 *
 * Primary path is Firecrawl's `branding` format, which returns a real design
 * system (palette, type stacks, spacing, logo) in one call. Its `confidence`
 * field is honest and frequently low — measured 0.925 on vercel.com but 0 on a
 * trivial page — so a low score falls back to DOM parsing and the operator is
 * told which path produced the profile. Confident-looking output from a
 * zero-confidence scrape is worse than no output.
 */

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";

interface FirecrawlBranding {
  colorScheme?: string;
  fonts?: { family: string; count: number }[];
  colors?: Record<string, string>;
  typography?: {
    fontFamilies?: { primary?: string; heading?: string };
    fontStacks?: { body?: string[]; heading?: string[]; paragraph?: string[] };
    fontSizes?: { h1?: string; h2?: string; body?: string };
  };
  spacing?: { baseUnit?: number; borderRadius?: string };
  components?: Record<string, unknown>;
  images?: { logo?: string | null; favicon?: string | null; ogImage?: string | null };
  confidence?: { overall?: number };
}

interface FirecrawlResult {
  success?: boolean;
  data?: {
    branding?: FirecrawlBranding;
    html?: string;
    markdown?: string;
    screenshot?: string;
    metadata?: { title?: string; description?: string; statusCode?: number };
  };
  error?: string;
}

/** Microlink screenshot helper (desktop+mobile fallback, via api.microlink.io). */
export async function microlinkScreenshot(url: string, viewport: "desktop" | "mobile"): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      url,
      screenshot: "true",
      viewport: viewport === "mobile" ? "375x812" : "1440x900",
      fullPage: "false",
      waitForTimeout: "3000",
      meta: "false",
      embed: "screenshot.url",
    });
    const res = await fetch(`https://api.microlink.io/?${params.toString()}`, {
      headers: { "User-Agent": "DesignLab/1.0" },
      signal: AbortSignal.timeout(25000),
    });
    const json = (await res.json()) as { status?: string; data?: { screenshot?: { url?: string } } };
    if (json.status === "success" && json.data?.screenshot?.url) return json.data.screenshot.url;
    return null;
  } catch {
    return null;
  }
}

function inferPersonality(profile: {
  colorScheme: string;
  palette: string[];
  sections: ProfileSection[];
  copy: ProfileCopy;
  platform: string;
}): string[] {
  const p: string[] = [];
  p.push(profile.colorScheme === "dark" ? "dark-first" : "light-first");
  if (profile.sections.some((s) => s.type === "pricing")) p.push("commercial");
  if (profile.sections.some((s) => s.type === "gallery")) p.push("visual");
  if (profile.sections.some((s) => s.type === "testimonials")) p.push("trust-led");
  if (profile.palette.length >= 5) p.push("colourful");
  else if (profile.palette.length <= 2) p.push("restrained");
  const words = `${profile.copy.metaDescription} ${profile.copy.headings.join(" ")}`.toLowerCase();
  if (/law|clinic|medical|dental|financ|insur|account/.test(words)) p.push("professional");
  if (/shop|store|buy|cart|sale|price/.test(words)) p.push("retail");
  if (/studio|design|creative|art|photograph/.test(words)) p.push("creative");
  if (/software|saas|platform|api|developer|app/.test(words)) p.push("technical");
  if (profile.platform === "WordPress") p.push("wordpress");
  return [...new Set(p)];
}

async function fetchRaw(url: string): Promise<{ html: string; headers: Headers } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DesignLab/1.0)" },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    return { html: await res.text(), headers: res.headers };
  } catch {
    return null;
  }
}

async function callFirecrawl(url: string): Promise<FirecrawlResult | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["branding", "html", "screenshot"],
        onlyMainContent: false,
        maxAge: 3600000, // reuse a scrape up to an hour old; saves credit on retries
      }),
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) return null;
    return (await res.json()) as FirecrawlResult;
  } catch {
    return null;
  }
}

export interface ExtractResult {
  profile: SiteProfile;
  /** Raw HTML, returned so the client never has to fetch cross-origin itself. */
  html: string;
}

export async function extractProfile(rawUrl: string): Promise<ExtractResult> {
  const target = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  const url = target.href;
  const warnings: string[] = [];

  const [fc, raw] = await Promise.all([callFirecrawl(url), fetchRaw(url)]);

  const branding = fc?.data?.branding;
  // Prefer the direct fetch for text extraction: Firecrawl's rendered HTML can
  // inline third-party iframe documents, which pollutes titles and headings.
  // Firecrawl's copy is the fallback for sites that block a plain fetch.
  const html = raw?.html || fc?.data?.html || "";
  if (!html) {
    throw new Error("Could not fetch the site. It may be blocking automated requests.");
  }

  const fcConfidence = branding?.confidence?.overall ?? 0;
  const hasColors = Boolean(branding?.colors && Object.keys(branding.colors).length > 0);
  const trustFirecrawl = Boolean(branding) && fcConfidence >= CONFIDENCE_FLOOR && hasColors;

  if (!process.env.FIRECRAWL_API_KEY) {
    warnings.push("FIRECRAWL_API_KEY is not set — extraction used the local DOM parser only.");
  } else if (!fc) {
    warnings.push("Firecrawl did not respond; extraction fell back to the local DOM parser.");
  } else if (!trustFirecrawl) {
    warnings.push(
      `Firecrawl reported low confidence (${fcConfidence.toFixed(2)}) for this page — colours and fonts below were read from the raw HTML and may be approximate.`,
    );
  }

  const htmlPalette = extractColorsFromHtml(html);
  const htmlFonts = extractFontsFromHtml(html);
  const copy = extractCopy(html, url);
  const sections = detectSections(html);
  const platform = detectPlatform(html, raw?.headers);

  const palette = trustFirecrawl
    ? [
        ...new Set(
          [
            ...Object.values(branding!.colors || {}).filter((c) => typeof c === "string" && c.startsWith("#")),
            ...htmlPalette,
          ].slice(0, 8),
        ),
      ]
    : htmlPalette;

  const colorScheme: "light" | "dark" = (branding?.colorScheme === "dark" ? "dark" : "light");

  const profile: SiteProfile = {
    url,
    title:
      [fc?.data?.metadata?.title, copy.siteName]
        .map((t) => (t || "").trim())
        .find((t) => t && !isNoise(t)) || new URL(url).hostname.replace(/^www\./, ""),
    platform,
    colorScheme,
    colors: {
      primary: trustFirecrawl ? branding?.colors?.primary : htmlPalette[0],
      accent: trustFirecrawl ? branding?.colors?.accent : htmlPalette[1],
      background: trustFirecrawl ? branding?.colors?.background : undefined,
      textPrimary: trustFirecrawl ? branding?.colors?.textPrimary : undefined,
      link: trustFirecrawl ? branding?.colors?.link : undefined,
      palette,
    },
    typography: {
      headingFont: trustFirecrawl ? branding?.typography?.fontFamilies?.heading : htmlFonts[0],
      bodyFont: trustFirecrawl ? branding?.typography?.fontFamilies?.primary : htmlFonts[1] || htmlFonts[0],
      headingStack: branding?.typography?.fontStacks?.heading || htmlFonts,
      bodyStack: branding?.typography?.fontStacks?.body || htmlFonts,
      sizes: branding?.typography?.fontSizes || {},
    },
    spacing: {
      baseUnit: branding?.spacing?.baseUnit,
      borderRadius: branding?.spacing?.borderRadius,
    },
    images: {
      logo: branding?.images?.logo || null,
      favicon: branding?.images?.favicon || null,
      ogImage: branding?.images?.ogImage || null,
    },
    sections,
    copy,
    screenshots: { desktop: fc?.data?.screenshot || null, mobile: null },
    personality: inferPersonality({
      colorScheme,
      palette,
      sections,
      copy,
      platform: platform.platform,
    }),
    source: trustFirecrawl ? "firecrawl" : "fallback",
    confidence: trustFirecrawl ? fcConfidence : Math.min(0.29, htmlPalette.length / 20),
    warnings,
  };

  return { profile, html };
}
