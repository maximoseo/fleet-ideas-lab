import type { SiteProfile } from "./types";

/**
 * Content-honesty checks.
 *
 * Shared between generation and the WordPress push. The push re-runs them
 * server-side rather than trusting a flag from the browser: a prototype that
 * fabricates testimonials must not become a page on a client's real site just
 * because the client-side state said it was fine.
 *
 * The first real run of this tool produced three invented Hebrew testimonials
 * with invented names and job titles, seven invented prices, and Unsplash stock
 * photos standing in for a client's actual products. Every rule below exists
 * because of something that actually happened, not something imagined.
 */

const PLACEHOLDER_PATTERNS: [RegExp, string][] = [
  [/lorem ipsum/i, "Lorem ipsum placeholder text"],
  [/\byour ?site\b/i, '"YourSite" placeholder brand'],
  [/\byour company\b/i, '"Your Company" placeholder brand'],
  [/\byour brand\b/i, '"Your Brand" placeholder brand'],
  [/a headline that actually stands out/i, "the old fake-preview headline"],
  [/\bexample\.com\b/i, "example.com placeholder link"],
  [/\bcompany name\b/i, '"Company Name" placeholder'],
];

/** Invented social proof is the most damaging failure — this page can be published. */
const INVENTED_PROOF_PATTERNS: [RegExp, string][] = [
  [/trusted by\s+[\d,.]+\s*\+?\s*(customers|teams|companies|businesses|users)/i, "invented customer count"],
  [/\b\d{1,3}(,\d{3})+\+?\s+(customers|users|clients|teams|downloads)\b/i, "invented user number"],
  [/\b\d{1,3}\s?x\s+(faster|better|more|higher)\b/i, "invented multiplier claim"],
  [/[+\-]\s?\d{1,3}\s?%\s+(increase|growth|conversion|improvement|revenue)/i, "invented percentage claim"],
  [/\b(rated|award[- ]winning)\b.{0,30}\b(#1|number one|best)\b/i, "invented award claim"],
];

/**
 * Stock and placeholder image hosts.
 *
 * On the first real run the model illustrated a client's product grid with
 * Unsplash photos — a bicycle above a thermos flask, a stranger's face above an
 * LED lamp. Presented as that client's catalogue, that is worse than no image.
 */
const STOCK_IMAGE_HOSTS = [
  "unsplash.com", "pexels.com", "pixabay.com", "placehold.co", "placeholder.com",
  "placekitten.com", "picsum.photos", "loremflickr.com", "dummyimage.com",
  "shutterstock.com", "gettyimages.", "freepik.com",
];

/**
 * Quote block followed by a short attribution — a testimonial, invented or not.
 *
 * The separator between the quote and the name must tolerate dashes, markup and
 * whitespace in any order. An earlier version required tags before the dash and
 * so missed `"…" — <b>Name</b>, Role`, which is the shape a model most often
 * emits. That gap let a fabricated testimonial through the gate in testing.
 */
const SEP = String.raw`(?:\s|<[^>]*>|&[a-zA-Z]+;|[-\u2013\u2014:\u00b7|])*`;
const ATTRIBUTED_QUOTE = new RegExp(
  String.raw`["\u201c\u201d\u00ab][^"\u201c\u201d\u00ab\u00bb]{20,400}["\u201c\u201d\u00bb]` +
    SEP +
    String.raw`([\p{L}][\p{L}'\u2019.-]*(?:\s+[\p{L}][\p{L}'\u2019.-]*){0,3})` +
    SEP +
    String.raw`[,\u060c]\s*([^<\n]{3,60})`,
  "gu",
);

export function normalise(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[“”«»"']/g, "").trim().toLowerCase();
}

/** Only flags copy the client did not supply. Claims present in the source are fine. */
export function checkHonesty(html: string, profile: SiteProfile): string[] {
  const warnings: string[] = [];
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  const sourceCopy = [
    profile.copy.h1,
    profile.copy.tagline,
    profile.copy.metaDescription,
    ...profile.copy.headings,
    ...profile.copy.paragraphs,
    ...profile.copy.ctaLabels,
  ]
    .join(" ")
    .toLowerCase();

  for (const [re, label] of PLACEHOLDER_PATTERNS) {
    if (re.test(text)) warnings.push(`Contains ${label}.`);
  }
  for (const [re, label] of INVENTED_PROOF_PATTERNS) {
    const m = text.match(re);
    if (m && !sourceCopy.includes(m[0].toLowerCase().trim())) {
      warnings.push(`Possible ${label}: "${m[0].trim().slice(0, 60)}" does not appear in the source site.`);
    }
  }

  // Stock imagery. Language-independent, so this catches every locale.
  for (const host of STOCK_IMAGE_HOSTS) {
    if (html.toLowerCase().includes(host)) {
      warnings.push(
        `Uses a stock image host (${host}). Only the client's own image URLs are allowed; use a CSS-only treatment instead.`,
      );
      break;
    }
  }

  // Fabricated testimonials. The English-only numeric patterns above missed
  // three invented Hebrew testimonials on the first real run, so this compares
  // quote text against what the source page actually contained.
  const allowedQuotes = (profile.copy.quotes || []).map(normalise);
  const seenAttributions = new Set<string>();
  for (const m of text.matchAll(ATTRIBUTED_QUOTE)) {
    const quote = normalise(m[0].split(/[-–—]/)[0] || "");
    const person = (m[1] || "").trim();
    const role = (m[2] || "").trim();
    const key = `${person}|${role}`;
    if (seenAttributions.has(key)) continue;
    seenAttributions.add(key);

    const quoteIsReal = allowedQuotes.some((q) => q.length > 20 && (quote.includes(q) || q.includes(quote)));
    const personIsReal = normalise(sourceCopy).includes(normalise(person));
    if (!quoteIsReal || !personIsReal) {
      warnings.push(
        `Fabricated testimonial: "${person}${role ? `, ${role}` : ""}" does not appear on the source site. Remove the quote and its attribution entirely.`,
      );
    }
  }

  // Fabricated prices.
  const allowedPrices = new Set((profile.copy.prices || []).map((p) => p.replace(/\s+/g, "")));
  const printed = new Set<string>();
  for (const m of text.matchAll(/(?:[₪$€£]\s?\d[\d,.]*|\d[\d,.]*\s?[₪$€£])/g)) {
    const p = m[0].replace(/\s+/g, "");
    if (!allowedPrices.has(p)) printed.add(p);
  }
  if (printed.size) {
    warnings.push(
      `Invented price(s): ${[...printed].slice(0, 6).join(", ")} do not appear on the source site. Remove every amount that is not in the supplied price list.`,
    );
  }

  return warnings;
}
