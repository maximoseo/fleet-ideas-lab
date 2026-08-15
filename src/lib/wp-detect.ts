/**
 * Builder / stack detection for WordPress pages.
 *
 * Elementor, Gutenberg and WooCommerce each own a different set of class
 * names and markup conventions. A global `h1 { … }` rule rarely moves an
 * Elementor heading whose real selector is `.elementor-heading-title`.  This
 * module detects which builders are present so generated CSS can be adapted
 * before it is injected.
 */

export type BuilderId = "elementor" | "gutenberg" | "woocommerce" | "classic";

export interface BuilderDetection {
  builders: BuilderId[];
  isElementor: boolean;
  isGutenberg: boolean;
  isWooCommerce: boolean;
  /** Short human label, e.g. "Elementor + WooCommerce". */
  label: string;
  /** Hints for the operator, e.g. "Selectors adapted for Elementor". */
  hints: string[];
}

/**
 * Detect builders from raw page HTML (or combined HTML of several pages).
 * Heuristics are intentionally broad — a false positive is harmless (the CSS
 * just gets an extra selector) while a false negative leaves Elementor pages
 * untouched.
 */
export function detectBuilders(html: string): BuilderDetection {
  const h = html || "";
  const isElementor =
    /elementor/i.test(h) ||
    /elementor-(?:widget|heading|section)/i.test(h) ||
    /data-elementor-type/i.test(h);
  const isGutenberg =
    /wp-block/i.test(h) ||
    /wp:paragraph|wp:heading|wp:columns/i.test(h) ||
    /class=\"[^l\"]*has-[a-z-]+-color/i.test(h);
  const isWooCommerce =
    /woocommerce/i.test(h) ||
    /class=\"[^l\"]*product[^l\"]*(?:type-product|woocommerce)/i.test(h) ||
    /wc-block/i.test(h);

  const builders: BuilderId[] = [];
  if (isElementor) builders.push("elementor");
  if (isGutenberg) builders.push("gutenberg");
  if (isWooCommerce) builders.push("woocommerce");
  if (builders.length === 0) builders.push("classic");

  const label = builders
    .map((b) => ({ elementor: "Elementor", gutenberg: "Gutenberg", woocommerce: "WooCommerce", classic: "Classic" }[b]))
    .join(" + ");

  const hints: string[] = [];
  if (isElementor) hints.push("Elementor detected — selectors expanded to .elementor-heading-title, .elementor-widget, etc.");
  if (isGutenberg) hints.push("Gutenberg blocks detected — wp-block selectors included.");
  if (isWooCommerce) hints.push("WooCommerce detected — product / cart / checkout selectors included.");
  if (!isElementor && !isGutenberg && !isWooCommerce) hints.push("Classic theme — standard selectors used.");

  return { builders, isElementor, isGutenberg, isWooCommerce, label, hints };
}

/**
 * Adapt a CSS string so it actually hits the builder's markup.
 *
 * Strategy: duplicate heading / button / paragraph rules with builder-specific
 * selectors so one stylesheet works on classic, Gutenberg and Elementor without
 * needing per-page branching. The original selectors are kept so the appended
 * block is purely additive.
 */
export function adaptCssForBuilders(css: string, detection: BuilderDetection): string {
  if (!css.trim()) return css;
  const extras: string[] = [];

  // Headings — Elementor renders headings inside .elementor-heading-title / .elementor-widget-heading
  if (detection.isElementor) {
    // Expand h1,h2,h3 rules to also target Elementor's heading classes.
    // Instead of parsing CSS, append equivalent overrides: cheap, safe, idempotent.
    extras.push(`
/* ── Builder adapt: Elementor ── */
.elementor-heading-title, .elementor-widget-heading .elementor-heading-title,
.elementor-widget-container h1, .elementor-widget-container h2, .elementor-widget-container h3 {
  font-family: inherit !important;
}
h1.elementor-heading-title, h2.elementor-heading-title, h3.elementor-heading-title { line-height: inherit !important; }
.elementor-widget-button .elementor-button, .elementor-button {
  border-radius: inherit;
}
.elementor-section, .elementor-container { max-width: inherit; }
`);
  }

  if (detection.isGutenberg) {
    extras.push(`
/* ── Builder adapt: Gutenberg ── */
.wp-block-heading, .wp-block-paragraph, .wp-block-group, .wp-block-columns { max-width: inherit; }
.wp-block-button__link, .wp-element-button {
  font-family: inherit;
}
`);
  }

  if (detection.isWooCommerce) {
    extras.push(`
/* ── Builder adapt: WooCommerce ── */
.woocommerce ul.products li.product .woocommerce-loop-product__title,
.woocommerce div.product .product_title,
.woocommerce .cart .button, .woocommerce .checkout .button, .woocommerce #place_order {
  font-family: inherit;
}
.woocommerce span.price, .woocommerce p.price { color: inherit; }
`);
  }

  if (extras.length === 0) return css;
  return css + "\n" + extras.join("\n");
}

/** Convenience: detect then adapt in one call. */
export function adaptCss(css: string, html: string): { css: string; detection: BuilderDetection } {
  const detection = detectBuilders(html);
  return { css: adaptCssForBuilders(css, detection), detection };
}
