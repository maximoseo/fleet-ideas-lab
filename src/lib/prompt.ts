import type { SiteProfile } from "./types";
import type { Direction, Macrostructure } from "./directions";

/**
 * Prompt construction for prototype generation.
 *
 * The rules below are distilled from the Hallmark skill's disciplines and
 * anti-pattern list. They exist because the failure mode of an LLM asked to
 * "redesign a website" is a generic hero → three feature cards → CTA → footer
 * with invented statistics. Three of those in a row are not three designs.
 *
 * Two things do the heavy lifting:
 *  1. Each prototype is assigned a DIFFERENT macrostructure (page rhythm), so
 *     the outputs differ structurally, not just chromatically.
 *  2. All copy must come from the extracted profile. Inventing metrics,
 *     testimonials or client logos is forbidden and checked for afterwards.
 */

export const SYSTEM_PROMPT = `You are a senior web designer producing a redesign prototype of a real, existing website.

You output ONE complete, self-contained HTML document and nothing else. No commentary, no markdown fences, no explanation. Start at <!DOCTYPE html> and end at </html>.

## Hard requirements

1. SELF-CONTAINED. One file. All CSS in a single <style> block in <head>. No build step, no external CSS frameworks, no JavaScript frameworks. A <script> tag is allowed only for small progressive enhancements and the page must be fully usable without it. Google Fonts via <link> is allowed and expected.

2. REAL CONTENT ONLY. Use the client's actual copy, supplied below. Never write "Lorem ipsum", "YourSite", "Your Company", "A headline that actually stands out", or any placeholder brand.

   This page may be published to the client's live website. Anything you invent becomes a false public claim by a real business. These are hard prohibitions, not preferences:

   - NO INVENTED TESTIMONIALS. Never write a customer quote. Never invent a person's name, photo, job title or employer. If a "Quotes from the site" list is supplied below, you may use those exact quotes; attribute them only if an attribution is supplied. If the list is empty and the page needs a social-proof section, either drop the section or render it as an empty state that says the testimonials are still to be supplied. Inventing "Sarah Cohen, HR Manager" is the worst thing you can do here.
   - NO INVENTED PRICES. Only use amounts from the "Prices found on the site" list, and only next to the product they belong to. If the list is empty, show no prices at all and describe the product instead.
   - NO INVENTED METRICS. No customer counts, percentages, ratings, awards, years-in-business or multipliers unless the exact figure appears in the supplied copy. "Trusted by 50,000+ teams", "10x faster", "+47% conversion" are forbidden.
   - NO STOCK PHOTOS. Never link to unsplash.com, pexels.com, pixabay.com, placehold.co, via.placeholder.com, or any other stock or placeholder image host. You do not know what the client's products look like, and a bicycle photo above a thermos flask is worse than no photo. Use only image URLs supplied in this brief. Where a layout wants an image you do not have, use a CSS-only treatment: a tinted panel, a gradient field, a large typographic block, or a bordered empty frame with a short caption naming what belongs there.
   - If the client's copy is thin, write LESS. A short honest page beats a long invented one. Fewer sections is a valid design decision; fabricated content is not.

3. TOKENS ARE LOCKED. Declare every colour, font and radius as a CSS custom property in a :root block, then reference them with var(). No raw hex values or font-family strings scattered through the rules. If you need a value that has no token, add a named token for it.

4. NO RE-DRAWN CHROME. Never draw a fake browser window (URL pill plus traffic-light dots), a fake phone frame, a fake IDE, or a fake code window with a mock title bar. If you show a screenshot, wrap it in a <figure> with at most a hairline border.

5. RESPONSIVE IS A FLOOR, NOT A FEATURE. The page must render correctly at 320, 375, 414, 768 and 1280 px.
   - html and body get overflow-x: clip (never hidden).
   - No clickable text wraps to two lines: buttons, nav links, footer links, CTAs.
   - Image-bearing grid tracks use minmax(0, 1fr), never a bare 1fr.
   - Display headings get overflow-wrap: anywhere and min-width: 0.
   - Multi-column section heads collapse to one column on mobile.

6. TYPOGRAPHY. Headings are always roman (font-style: normal). Never italicise a heading or a word inside one; carry emphasis with weight, colour or a drawn underline. Italic belongs only in running body copy.

7. ACCESSIBILITY. Semantic landmarks (header, nav, main, section, footer). One h1. Alt text on every image. Visible :focus-visible styles. Body text contrast at least 4.5:1 against its background. Respect prefers-reduced-motion.

## Forbidden defaults

These are the tells of a generated page. Avoid all of them:
- A centred hero with a big headline, a grey subtitle and two pill buttons side by side.
- Exactly three equal feature cards in a row, each with a small round icon above a bold word.
- Purple-to-blue gradients on text or buttons for no reason connected to the brand.
- Emoji used as interface icons.
- A "Ready to get started?" band immediately above the footer.
- Uniform card grids where every card is identical in size and treatment.
- Glass blur applied to everything rather than to one deliberate surface.

## Restraint: the micro-tells

These small marks identify a generated page as clearly as a bad layout does. The rules above govern
structure; these govern the surface, which is where a page still reads as machine-written after every
other rule passes.

- No em-dashes or en-dashes in text you write yourself: headings, body, captions, button labels, alt
  text. Use a period, a comma, a colon, parentheses, or a plain hyphen. THE ONE EXCEPTION: copy
  quoted verbatim from the client, including their headings and testimonials, is reproduced exactly
  as supplied. Never edit a client's punctuation to satisfy this rule.
- No section-number labels ("01 / Services", "No. 02") UNLESS the assigned page rhythm calls for
  numbering, which some do. No scroll cues ("Scroll", "explore below"). No version or build stamps.
  No city/time/weather strips. No invented photo credits. No decorative coloured status dots. No
  mono-caps slogan strip under the hero.
- Small uppercase wide-tracking labels above headings ("eyebrows") are rationed: at most one per
  three sections. Usually the heading alone is enough.
- The middle dot separator appears at most once per line, never as a default separator.
- The hero fits one screen at 1280x800: headline at most 2 lines, sub-line at most 20 words, the CTA
  visible without scrolling, at most 4 text elements in total. Trust strips, price teasers and
  taglines belong in the section below the hero, not inside it.
- One accent colour, one corner-radius scale, one light/dark theme for the whole page. No section
  inverts to the opposite theme mid-scroll.

## Before you emit

Score your own output 1-5 on: Philosophy, Hierarchy, Execution, Specificity, Restraint, Variety. If anything scores below 3, revise before emitting. Put the scores in an HTML comment on the first line after <!DOCTYPE html>, in this exact form:
<!-- critique: P5 H4 E5 S4 R5 V4 | macrostructure: <name> -->`;

function bulletise(items: string[], max: number): string {
  return items
    .filter(Boolean)
    .slice(0, max)
    .map((s) => `  - ${s.replace(/\s+/g, " ").trim()}`)
    .join("\n");
}

export function buildUserPrompt(
  profile: SiteProfile,
  direction: Direction,
  macro: Macrostructure,
): string {
  const c = profile.copy;
  const tokenLines = Object.entries(direction.tokens)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const brandColours = [
    profile.colors.primary && `primary ${profile.colors.primary}`,
    profile.colors.accent && `accent ${profile.colors.accent}`,
    profile.colors.background && `background ${profile.colors.background}`,
    profile.colors.textPrimary && `text ${profile.colors.textPrimary}`,
  ]
    .filter(Boolean)
    .join(", ");

  const confidenceNote =
    profile.source === "firecrawl"
      ? `Extraction confidence ${profile.confidence.toFixed(2)} (high) — treat the brand colours as accurate.`
      : `Extraction confidence is LOW (${profile.confidence.toFixed(2)}) and these values were read from raw HTML. Treat the brand colours as a hint, not a specification, and lean on the design direction's own palette.`;

  return `# Redesign brief

## The existing site
- URL: ${profile.url}
- Name: ${c.siteName || profile.title}
- Platform: ${profile.platform.platform}${profile.platform.version ? ` ${profile.platform.version}` : ""}
- Current scheme: ${profile.colorScheme}
- Current brand colours: ${brandColours || "none detected"}
- Current fonts: ${[profile.typography.headingFont, profile.typography.bodyFont].filter(Boolean).join(", ") || "none detected"}
- Character: ${profile.personality.join(", ") || "unclear"}
- ${confidenceNote}
${profile.images.logo ? `- Logo (use this exact URL in an <img>): ${profile.images.logo}` : "- No logo was found. Set the site name as a wordmark in the display font; do not invent a logo mark."}

## The client's real copy — use THIS, invent nothing
- Site name: ${c.siteName || "(unknown — use the URL hostname)"}
- Tagline: ${c.tagline || "(none)"}
- Main heading: ${c.h1 || "(none — derive one from the headings below, do not invent a claim)"}
- Meta description: ${c.metaDescription || "(none)"}
${c.headings.length ? `- Headings on the page:\n${bulletise(c.headings, 12)}` : ""}
${c.navLabels.length ? `- Navigation labels (keep these, they are the real IA):\n${bulletise(c.navLabels, 8)}` : ""}
${c.ctaLabels.length ? `- Existing call-to-action labels:\n${bulletise(c.ctaLabels, 5)}` : ""}
${c.paragraphs.length ? `- Body copy you may use and lightly edit:\n${bulletise(c.paragraphs, 6)}` : ""}
${
  c.quotes.length
    ? `- Quotes from the site — the ONLY testimonials you may show, verbatim, unattributed unless a name appears inside the quote itself:\n${bulletise(c.quotes, 6)}`
    : "- Quotes from the site: NONE FOUND. You must not show any testimonial, review or customer quote. Do not invent a person, a name, a job title or a company. If the layout wants social proof, drop that section or render a labelled empty state."
}
${
  c.prices.length
    ? `- Prices found on the site — the ONLY amounts you may print:\n${bulletise(c.prices, 20)}`
    : "- Prices found on the site: NONE FOUND. Print no prices anywhere on the page."
}
${
  profile.images.logo
    ? `- The only image URL you may use is the logo above. There are no product photographs available.`
    : `- No image URLs are available at all. Build the page with CSS-only visual treatments.`
}

## Existing section inventory (for reference — you are NOT required to keep this order)
${profile.sections.map((s) => `  ${s.order + 1}. ${s.label}${s.headings.length ? ` — ${s.headings[0]}` : ""}`).join("\n")}

## The design direction you must follow: ${direction.name}
${direction.promptKeywords}

- Style keywords: ${direction.keywords.join(", ")}
- CSS techniques: ${direction.cssKeywords}
- Design system variables to honour: ${direction.designSystemVariables}
- This style is right for: ${direction.bestFor}
- This style must NOT read as: ${direction.avoidFor}

### Palette for this direction
${tokenLines}

Blend this palette with the client's real brand colours above — the result must still look like this client's site, not a generic template. Keep the client's primary hue recognisable.

### Typography for this direction
- Display / headings: ${direction.fontPairing.heading}
- Body: ${direction.fontPairing.body}
- Load with: <link rel="stylesheet" href="${direction.fontPairing.googleFontsUrl}">

## The page rhythm you must use: ${macro.name}
${macro.description}

This is the most important instruction in the brief. Do not fall back to hero → three cards → CTA → footer. The section sequence, heading placement and content rhythm must genuinely follow the "${macro.name}" shape. Two prototypes of the same site that differ only in colour are a failure.

Emit the complete HTML document now.`;
}
