/**
 * HTML text utilities shared by every extraction path.
 *
 * Split out of the 683-line extract.ts on 2026-08-17. The code is unchanged;
 * the file had simply grown past the point where any of it could be reasoned
 * about or tested in isolation.
 */

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

export function isNoise(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return true;
  return NOISE.some((re) => re.test(t));
}

export const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", laquo: "«", raquo: "»", shy: "", middot: "·",
};

/** Handles named and numeric entities. Truncated copy showed raw "&#x2" before. */
export const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    // Strip any entity left dangling by an upstream truncation.
    .replace(/&#?[a-zA-Z0-9]{0,6}$/, "");

export function textOf(html: string, tag: string, limit: number): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]{1,400}?)</${tag}>`, "gi");
  for (const m of html.matchAll(re)) {
    const t = decode(stripTags(m[1]));
    if (t && t.length > 1 && t.length < 200 && !isNoise(t) && !out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}
