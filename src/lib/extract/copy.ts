import type { ProfileCopy } from "../types";
import { decode, isNoise, sanitizeHtml, stripTags, textOf } from "./html";

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
