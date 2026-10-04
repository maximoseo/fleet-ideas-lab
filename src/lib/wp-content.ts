/**
 * Content handling shared by /api/wp/inject and /api/wp/batch: the reversible
 * marker format, the prototype wrapper, and the input scrubbing that keeps
 * generated CSS/HTML from escaping its block or overwriting unrelated content.
 */

export const MARKER_PREFIX = "design-lab-style";

/** Hard caps on what a single request may write into a client page. */
export const MAX_CSS_CHARS = 300_000;
export const MAX_HTML_CHARS = 1_000_000;
export const MAX_BATCH_PAGES = 100;

export function buildStyleBlock(css: string, id: string): string {
  return `\n<!-- ${MARKER_PREFIX}:${id}:start -->\n<style id="${MARKER_PREFIX}-${id}">\n${css}\n</style>\n<!-- ${MARKER_PREFIX}:${id}:end -->\n`;
}

/**
 * Remove previous design-lab blocks. The end marker must carry the SAME id as
 * the start marker: with `[^:]+` / any-id matching, a stray start marker (hand
 * edit, truncated save) swallowed everything up to the next unrelated end
 * marker. Ids are base36 plus an optional `-<pageId>`.
 */
export function stripPreviousInjections(content: string): string {
  return content.replace(
    /<!-- design-lab-style:([A-Za-z0-9_-]+):start -->[\s\S]*?<!-- design-lab-style:\1:end -->\n?/g,
    "",
  );
}

/** Drop any marker-looking comment from caller-supplied CSS/HTML. */
export function stripMarkers(input: string): string {
  return input.replace(/<!--\s*design-lab-style:[^>]*?-->/gi, "");
}

/**
 * CSS goes inside <style>. `</style>`, `<script` or comment delimiters would
 * close the block and turn "CSS" into page markup.
 */
export function sanitizeCss(css: string): { ok: true; css: string } | { ok: false; error: string } {
  if (css.length > MAX_CSS_CHARS) return { ok: false, error: `CSS too large (max ${MAX_CSS_CHARS} characters)` };
  const cleaned = stripMarkers(css);
  if (/<\s*\/?\s*(?:style|script)\b|<!--|-->/i.test(cleaned)) {
    return { ok: false, error: "CSS must not contain HTML tags or comment delimiters" };
  }
  return { ok: true, css: cleaned };
}

/**
 * Defence in depth for generated prototype HTML (LLM output derived from a
 * scraped, untrusted site). Removes script (including unterminated), frames,
 * objects, <base>, inline event handlers and javascript:/data:text/html URLs.
 * Not a full sanitiser: WordPress's own kses/unfiltered_html rules still apply.
 */
export function stripActiveContent(html: string): string {
  let out = html;
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out
      .replace(/<script\b[\s\S]*?(?:<\/script\s*>|$)/gi, "")
      .replace(/<\/?(?:iframe|frame|frameset|object|embed|applet|base)\b[^>]*>/gi, "")
      .replace(/([\s"'/])on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")
      .replace(
        /\b(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"'>\s]*\2/gi,
        "$1=$2#$2",
      );
    if (out === before) break;
  }
  return out;
}

/**
 * Convert a standalone prototype document into something safe to paste into a
 * WordPress page: head styles and font links lifted, CSS scoped to a wrapper
 * class, only the body markup kept.
 */
export function wrapPrototype(doc: string, id: string, opts: { bodyAttrs?: boolean } = {}): string {
  const wrapper = `${MARKER_PREFIX}-proto-${id}`;
  const source = stripMarkers(doc);

  const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const fontLinks = stripActiveContent(
    [...source.matchAll(/<link[^>]+href="https:\/\/fonts\.[^"]+"[^>]*>/gi)].map((m) => m[0]).join("\n"),
  );

  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyAttrs = source.match(/<body([^>]*)>/i)?.[1] || "";
  const dir = /dir\s*=\s*["']rtl["']/i.test(source) ? ' dir="rtl"' : "";
  const inner = stripActiveContent(bodyMatch ? bodyMatch[1] : source).trim();

  const scoped = styles
    .replace(/(^|\})\s*(:root|html|body)\s*(?=[,{])/g, `$1 .${wrapper} `)
    .replace(/(^|\})\s*(html|body)\s*,\s*/g, `$1 .${wrapper}, `);

  const langAttr = /lang\s*=\s*["']he["']/i.test(source) ? ' lang="he"' : "";
  const dataAttrs = opts.bodyAttrs
    ? ` data-body-attrs="${bodyAttrs.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 200)}"`
    : "";

  return `<!-- ${MARKER_PREFIX}:${id}:start -->
${fontLinks}
<style id="${MARKER_PREFIX}-${id}">
.${wrapper}{all:initial;display:block;}
.${wrapper} *{box-sizing:border-box;}
${scoped}
</style>
<div class="${wrapper}"${dir}${langAttr}${dataAttrs}>
${inner}
</div>
<!-- ${MARKER_PREFIX}:${id}:end -->`;
}
