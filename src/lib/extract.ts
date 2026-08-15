import type {
  ProfileCopy,
  ProfileSection,
  SiteProfile,
} from "./types";
import { CONFIDENCE_FLOOR } from "./types";

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

/* ── HTML helpers (also the fallback path) ── */

/**
 * Remove everything that is not the page's own visible content.
 *
 * This is not cosmetic. Firecrawl's `html` output can inline an iframe's inner
 * document — measured on a real site, a reCAPTCHA widget contributed its own
 * <title>reCAPTCHA</title>, which then became the extracted site name. Anything
 * derived from an embedded third-party widget is noise that ends up printed on
 * a client's redesign.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    // Drop iframes and anything they inlined.
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<iframe[^>]*>/gi, " ")
    // Elements explicitly hidden from users.
    .replace(/<[^>]+(?:aria-hidden=["']true["']|hidden(?=[\s>])|style=["'][^"']*display\s*:\s*none)[^>]*>[\s\S]{0,2000}?<\/[a-zA-Z]+>/gi, " ");
}

/** Third-party widget chrome and unfilled page-builder placeholders. */
const NOISE = [
  /^recaptcha$/i,
  /^protected by/i,
  /privacy\s*[-–·|]\s*terms/i,
  /^skip to (main )?content$/i,
  /^(accept|allow) (all )?cookies?$/i,
  /^cookie (policy|settings|consent)$/i,
  /^loading\.{0,3}$/i,
  /^menu$/i,
  /^close$/i,
  /^search$/i,
  /^\s*$/,
  // Unfilled visual-builder placeholders, English and Hebrew.
  /^(enter|insert|add|type) (your )?(text|title|heading|content)$/i,
  /^(הכנס|הזן|הוסף)\s+(טקסט|כותרת|תוכן)$/,
  /^(lorem ipsum|placeholder|untitled|new page)$/i,
];

function isNoise(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return true;
  return NOISE.some((re) => re.test(t));
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", laquo: "«", raquo: "»", shy: "", middot: "·",
};

/** Handles named and numeric entities. Truncated copy showed raw "&#x2" before. */
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    // Strip any entity left dangling by an upstream truncation.
    .replace(/&#?[a-zA-Z0-9]{0,6}$/, "");

function textOf(html: string, tag: string, limit: number): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]{1,400}?)</${tag}>`, "gi");
  for (const m of html.matchAll(re)) {
    const t = decode(stripTags(m[1]));
    if (t && t.length > 1 && t.length < 200 && !isNoise(t) && !out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/** Pull the client's real words. A redesign that invents copy is a mockup, not a redesign. */
export function extractCopy(rawHtml: string, url: string): ProfileCopy {
  const html = sanitizeHtml(rawHtml);

  // A page can carry several <title> elements once widget documents are inlined.
  // Take the first one that is not third-party chrome.
  const title =
    [...rawHtml.matchAll(/<title[^>]*>([^<]*)<\/title>/gi)]
      .map((m) => decode(m[1].trim()))
      .find((t) => t && !isNoise(t)) || "";

  const metaDescription = decode(
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || "",
  );
  const ogSiteRaw = decode(
    html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || "",
  );
  const ogSite = isNoise(ogSiteRaw) ? "" : ogSiteRaw;

  const h1s = textOf(html, "h1", 3);
  const h2s = textOf(html, "h2", 8);
  const h3s = textOf(html, "h3", 8);

  // Nav labels: anchors inside <nav>, or the first cluster of short links.
  const navBlock = html.match(/<nav[\s\S]{0,4000}?<\/nav>/i)?.[0] || "";
  const navLabels: string[] = [];
  for (const m of (navBlock || html).matchAll(/<a[^>]*>([\s\S]{1,60}?)<\/a>/gi)) {
    const t = decode(stripTags(m[1]));
    if (t && t.length >= 2 && t.length <= 30 && !isNoise(t) && !navLabels.includes(t)) navLabels.push(t);
    if (navLabels.length >= 8) break;
  }

  const ctaLabels: string[] = [];
  for (const m of html.matchAll(
    /<(?:button|a)[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]{1,60}?)<\/(?:button|a)>/gi,
  )) {
    const t = decode(stripTags(m[1]));
    if (t && t.length >= 2 && t.length <= 40 && !isNoise(t) && !ctaLabels.includes(t)) ctaLabels.push(t);
    if (ctaLabels.length >= 6) break;
  }
  for (const m of html.matchAll(/<button[^>]*>([\s\S]{1,60}?)<\/button>/gi)) {
    if (ctaLabels.length >= 6) break;
    const t = decode(stripTags(m[1]));
    if (t && t.length >= 2 && t.length <= 40 && !isNoise(t) && !ctaLabels.includes(t)) ctaLabels.push(t);
  }

  // Body copy. Testimonial markup often uses div/blockquote rather than <p>,
  // and if the model is not handed the real quotes it will write its own —
  // measured: three fabricated Hebrew testimonials with invented names and job
  // titles on the first real run. Cast the net wider so real text is available.
  const paragraphs = [
    ...textOf(html, "p", 14),
    ...textOf(html, "blockquote", 6),
    ...textOf(html, "li", 10),
  ]
    .filter((p) => p.length > 40)
    .filter((p, i, a) => a.indexOf(p) === i);

  // Real quotes, so none have to be invented.
  const quotes: string[] = [];
  for (const m of html.matchAll(
    /<(?:blockquote|div|p|span)[^>]*class=["'][^"']*(?:testimonial|review|quote|recommend)[^"']*["'][^>]*>([\s\S]{20,400}?)<\/(?:blockquote|div|p|span)>/gi,
  )) {
    const t = decode(stripTags(m[1]));
    if (t.length > 25 && !isNoise(t) && !quotes.includes(t)) quotes.push(t);
    if (quotes.length >= 6) break;
  }
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]{20,400}?)<\/blockquote>/gi)) {
    if (quotes.length >= 6) break;
    const t = decode(stripTags(m[1]));
    if (t.length > 25 && !isNoise(t) && !quotes.includes(t)) quotes.push(t);
  }

  // Real prices, so none have to be invented.
  const prices: string[] = [];
  for (const m of html.matchAll(/(?:[₪$€£]\s?\d[\d,.]*|\d[\d,.]*\s?[₪$€£])/g)) {
    const t = m[0].replace(/\s+/g, "");
    if (!prices.includes(t)) prices.push(t);
    if (prices.length >= 20) break;
  }

  let siteName = ogSite || title.split(/[|\-–—·]/)[0]?.trim() || "";
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      siteName = "";
    }
  }

  return {
    siteName,
    tagline: title.includes("|") || title.includes("-") ? title.split(/[|\-–—·]/).slice(1).join(" ").trim() : metaDescription,
    h1: h1s[0] || "",
    headings: [...h1s, ...h2s, ...h3s].slice(0, 14),
    navLabels,
    ctaLabels,
    paragraphs: paragraphs.slice(0, 8),
    quotes: quotes.slice(0, 6),
    prices: prices.slice(0, 20),
    metaDescription,
  };
}

// ── Rich section extraction helpers (P0.2) ──

function extractImages(block: string, limit = 8): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  for (const m of block.matchAll(/<img[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1] || "";
    if (!src || src.startsWith("data:") || out.some((x) => x.src === src)) continue;
    const alt = decode(tag.match(/alt=["']([^"']*)["']/i)?.[1] || "").trim();
    if (src.length > 4) out.push({ src, alt });
    if (out.length >= limit) break;
  }
  return out;
}

function extractButtons(block: string, limit = 10): { label: string; href?: string }[] {
  const out: { label: string; href?: string }[] = [];
  const pushBtn = (label: string, href?: string) => {
    const t = decode(stripTags(label)).trim();
    if (t && t.length >= 2 && t.length <= 50 && !isNoise(t) && !out.some((x) => x.label === t)) {
      out.push({ label: t, href });
    }
  };
  for (const m of block.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]{1,80}?)<\/a>/gi)) {
    const cls = m[0].match(/class=["'][^"']*["']/i)?.[0] || "";
    if (/btn|button|cta|primary/i.test(cls)) pushBtn(m[2], m[1]);
    if (out.length >= limit) break;
  }
  for (const m of block.matchAll(/<button[^>]*>([\s\S]{1,80}?)<\/button>/gi)) {
    pushBtn(m[1]);
    if (out.length >= limit) break;
  }
  if (out.length === 0) {
    for (const m of block.matchAll(/<a[^>]*>([\s\S]{1,40}?)<\/a>/gi)) {
      const t = decode(stripTags(m[1])).trim();
      if (t.length >= 2 && t.length <= 30 && !isNoise(t) && !out.some((x) => x.label === t)) out.push({ label: t });
      if (out.length >= 3) break;
    }
  }
  return out.slice(0, limit);
}

function extractFormFields(block: string): string[] {
  const fields: string[] = [];
  for (const m of block.matchAll(/<(input|select|textarea)[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/(?:name|id|placeholder|aria-label)=["']([^"']+)["']/i)?.[1] || m[1];
    const decoded = decode(name).trim();
    if (decoded && !fields.includes(decoded)) fields.push(decoded);
    if (fields.length >= 10) break;
  }
  for (const m of block.matchAll(/<label[^>]*>([\s\S]{1,60}?)<\/label>/gi)) {
    const t = decode(stripTags(m[1])).trim();
    if (t && t.length >= 2 && t.length <= 40 && !fields.includes(t)) fields.push(t);
    if (fields.length >= 10) break;
  }
  return fields;
}

function sectionHeadingCandidates(block: string): string[] {
  return [...textOf(block, "h1", 2), ...textOf(block, "h2", 4), ...textOf(block, "h3", 4)].slice(0, 6);
}

type SectionKind = ProfileSection["type"];

function classifyBlock(tag: string, classAttr: string, inner: string): SectionKind | null {
  const cls = classAttr.toLowerCase();
  const innerLower = inner.slice(0, 2000).toLowerCase();
  if (tag === "nav") return "nav";
  if (tag === "footer") return "footer";
  if (tag === "header" || /hero|banner|masthead|jumbotron/.test(cls)) return "hero";
  if (/testimonial|review|quote|feedback/.test(cls) || /testimonial|review/.test(innerLower)) return "testimonials";
  if (/pricing|price|plan|package|tier/.test(cls)) return "pricing";
  if (/gallery|portfolio|showcase/.test(cls) && /<img/i.test(inner)) return "gallery";
  if (/feature|service|benefit|offering/.test(cls)) return "features";
  if (/<form/i.test(inner) || /cta|call-to-action|newsletter|subscribe|contact/.test(cls)) return "cta";
  return null;
}

/**
 * Real section extraction (P0.2).
 * Detects hero/nav/features/testimonials/pricing/cta/footer/gallery/content by
 * semantic tags + class heuristics + heading content, in document order.
 * Returns DetectedSection with real headings/images/buttons/forms + raw HTML snippet.
 */
export function detectSections(rawHtml: string): ProfileSection[] {
  const html = rawHtml;
  const sanitized = sanitizeHtml(rawHtml);

  type Candidate = { index: number; tag: string; cls: string; inner: string; full: string };
  const candidates: Candidate[] = [];

  const blockRe = /<(nav|header|footer|section|aside|form)([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(blockRe)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || "";
    const cls = attrs.match(/class=["']([^"']*)["']/i)?.[1] || "";
    const inner = m[3] || "";
    if (inner.length < 30) continue;
    candidates.push({ index: m.index ?? 0, tag, cls, inner, full: m[0] });
  }
  for (const m of html.matchAll(/<div[^>]*class=["']([^"']*)["'][^>]*>([\s\S]{0,6000}?)<\/div>/gi)) {
    const cls = m[1];
    if (!/(hero|banner|masthead|feature|service|benefit|testimonial|review|pricing|price|plan|gallery|portfolio|cta|call-to-action|content|about|team)/i.test(cls)) continue;
    const inner = m[2];
    if (inner.length < 40) continue;
    candidates.push({ index: m.index ?? 0, tag: "div", cls, inner, full: m[0] });
  }

  candidates.sort((a, b) => a.index - b.index);

  const deduped: Candidate[] = [];
  for (const c of candidates) {
    if (deduped.length && Math.abs(c.index - deduped[deduped.length - 1].index) < 200) continue;
    deduped.push(c);
  }

  const sections: ProfileSection[] = [];
  const seenTypes = new Set<string>();

  for (const c of deduped) {
    let kind = classifyBlock(c.tag, c.cls, c.inner);
    if (!kind && c.tag === "section") {
      const h = sectionHeadingCandidates(c.inner);
      if (h.length) kind = "content";
      else if (/<form/i.test(c.inner)) kind = "cta";
      else kind = "content";
    }
    if (!kind) continue;
    if ((kind === "nav" || kind === "footer" || kind === "hero") && seenTypes.has(kind)) continue;
    seenTypes.add(kind);

    const headings = sectionHeadingCandidates(c.inner);
    const paragraphs = textOf(c.inner, "p", 4).filter((p) => p.length > 20);
    const images = extractImages(c.inner, 6);
    const buttons = extractButtons(c.inner, 6);
    const formFields = /<form/i.test(c.inner) ? extractFormFields(c.inner) : [];
    const hasForm = formFields.length > 0 || /<form/i.test(c.inner);
    const rawSnippet = c.full.slice(0, 3000);

    const labelMap: Record<string, string> = {
      nav: "Navigation", hero: "Hero", features: "Features / Services", testimonials: "Testimonials",
      pricing: "Pricing", cta: "Call to Action", gallery: "Gallery", content: "Content", footer: "Footer",
    };

    sections.push({
      type: kind,
      label: labelMap[kind] || kind,
      order: sections.length,
      headings,
      paragraphs,
      images,
      buttons,
      formFields,
      hasImage: images.length > 0,
      hasButton: buttons.length > 0,
      hasForm,
      rawHtml: rawSnippet,
    });
  }

  if (sections.length < 2) {
    const h1 = decode(stripTags(html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)?.[1] || ""));
    const sanitizedHeadings = textOf(sanitized, "h2", 4);
    const imgs = extractImages(sanitized, 4);
    const btns = extractButtons(sanitized, 4);
    const paras = textOf(sanitized, "p", 4).filter((p) => p.length > 20);
    if (!seenTypes.has("hero") && /<h1/i.test(html)) {
      sections.unshift({
        type: "hero", label: "Hero", order: 0,
        headings: h1 ? [h1] : sanitizedHeadings.slice(0, 1),
        paragraphs: paras.slice(0, 1),
        images: imgs.slice(0, 1),
        buttons: btns.slice(0, 2),
        formFields: [],
        hasImage: imgs.length > 0, hasButton: btns.length > 0, hasForm: false,
        rawHtml: html.slice(0, 3000),
      });
    }
    if (sections.length < 2) {
      sections.push({
        type: "content", label: "Main content", order: sections.length,
        headings: sanitizedHeadings, paragraphs: paras,
        images: imgs, buttons: [], formFields: [],
        hasImage: imgs.length > 0, hasButton: false, hasForm: false,
        rawHtml: sanitized.slice(0, 3000),
      });
    }
    sections.forEach((s, i) => (s.order = i));
  } else {
    sections.forEach((s, i) => (s.order = i));
  }

  if (!seenTypes.has("footer") && /<footer/i.test(html)) {
    const footInner = html.match(/<footer[^>]*>([\s\S]{0,4000}?)<\/footer>/i)?.[1] || "";
    sections.push({
      type: "footer", label: "Footer", order: sections.length,
      headings: sectionHeadingCandidates(footInner),
      paragraphs: [],
      images: extractImages(footInner, 2),
      buttons: extractButtons(footInner, 3),
      formFields: [],
      hasImage: false, hasButton: false, hasForm: false,
      rawHtml: footInner.slice(0, 2000),
    });
  }

  return sections;
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

export function extractColorsFromHtml(html: string): string[] {
  const colors = new Map<string, number>();
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    let c = m[1].toLowerCase();
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    colors.set("#" + c, (colors.get("#" + c) || 0) + 1);
  }
  for (const m of html.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const hex = "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
    colors.set(hex, (colors.get(hex) || 0) + 1);
  }
  return [...colors.entries()]
    .filter(([c, count]) => {
      if (count < 2) return false;
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      const lum = (r + g + b) / 3;
      return lum > 20 && lum < 240;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);
}

export function extractFontsFromHtml(html: string): string[] {
  const fonts = new Set<string>();
  for (const m of html.matchAll(/font-family\s*:\s*([^;}"']+)/g)) {
    const family = m[1].split(",")[0].trim().replace(/['"]/g, "");
    if (family && !family.startsWith("var(") && family.length < 40) fonts.add(family);
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/g)) {
    for (const f of decodeURIComponent(m[1]).split("|")) {
      const name = f.split(":")[0].replace(/\+/g, " ");
      if (name) fonts.add(name);
    }
  }
  return [...fonts].slice(0, 5);
}

export function detectPlatform(html: string, headers?: Headers): { platform: string; version?: string } {
  const generator = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
  const powered = headers?.get("x-powered-by") || "";
  if (generator?.[1]?.toLowerCase().includes("wordpress")) {
    return { platform: "WordPress", version: generator[1].match(/([\d.]+)/)?.[1] };
  }
  if (powered.toLowerCase().includes("wordpress")) return { platform: "WordPress" };
  if (html.includes("wp-content") || html.includes("wp-includes")) return { platform: "WordPress" };
  if (html.includes("shopify")) return { platform: "Shopify" };
  if (html.includes("wix.com") || html.includes("wixstatic")) return { platform: "Wix" };
  if (html.includes("__next") || powered.includes("Next.js")) return { platform: "Next.js" };
  return { platform: "Unknown" };
}

/** Loose descriptors used to pick design directions. Deliberately coarse. */
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
