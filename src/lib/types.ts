/**
 * Shared types for site extraction and prototype generation.
 *
 * `SiteProfile` is the contract between extraction (Firecrawl or the regex
 * fallback) and generation. Everything the model needs to redesign a page
 * without seeing the page must be on this object.
 */

export type ExtractSource = "firecrawl" | "fallback";

export interface ProfileColors {
  primary?: string;
  accent?: string;
  background?: string;
  textPrimary?: string;
  link?: string;
  /** Everything found, most-used first — useful when the named slots are empty. */
  palette: string[];
}

export interface ProfileTypography {
  headingFont?: string;
  bodyFont?: string;
  /** Full stacks as authored, so a redesign can keep a safe fallback chain. */
  headingStack: string[];
  bodyStack: string[];
  sizes: { h1?: string; h2?: string; body?: string };
}

export interface SectionImage {
  src: string;
  alt: string;
}

export interface SectionButton {
  label: string;
  href?: string;
}

export interface ProfileSection {
  type:
    | "nav"
    | "hero"
    | "features"
    | "testimonials"
    | "pricing"
    | "cta"
    | "gallery"
    | "content"
    | "footer";
  label: string;
  order: number;
  headings: string[];
  hasImage: boolean;
  hasButton: boolean;
  hasForm: boolean;
  /** Real content extracted for this section */
  paragraphs?: string[];
  images?: SectionImage[];
  buttons?: SectionButton[];
  formFields?: string[];
  /** Up to ~3000 chars of the original HTML for this section */
  rawHtml?: string;
}

/** The client's own words. Prototypes must use these, never lorem or "YourSite". */
export interface ProfileCopy {
  siteName: string;
  tagline: string;
  h1: string;
  headings: string[];
  navLabels: string[];
  ctaLabels: string[];
  paragraphs: string[];
  /** Real testimonial/review text found on the page. Empty means: invent none. */
  quotes: string[];
  /** Real currency amounts found on the page. Empty means: show no prices. */
  prices: string[];
  metaDescription: string;
}

export interface SiteProfile {
  url: string;
  title: string;
  platform: { platform: string; version?: string };
  colorScheme: "light" | "dark";
  colors: ProfileColors;
  typography: ProfileTypography;
  spacing: { baseUnit?: number; borderRadius?: string };
  images: { logo: string | null; favicon: string | null; ogImage: string | null };
  sections: ProfileSection[];
  copy: ProfileCopy;
  screenshots: { desktop: string | null; mobile: string | null };
  /** Loose descriptors ("professional", "playful") used to pick design directions. */
  personality: string[];
  source: ExtractSource;
  /**
   * 0-1. Firecrawl reports its own confidence and it is frequently 0 on thin or
   * unusual pages. Anything below CONFIDENCE_FLOOR triggers the fallback path,
   * and a low value is always surfaced to the operator rather than presented as
   * fact.
   */
  confidence: number;
  warnings: string[];
}

/** Below this, Firecrawl branding output is not trusted on its own. */
export const CONFIDENCE_FLOOR = 0.3;

/* ── Prototype generation ── */

export interface DesignDirection {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  /** Phrasing that steers the model, taken from the ui-ux-pro-max style corpus. */
  promptKeywords: string;
  cssKeywords: string;
  /** Contexts this style is explicitly wrong for. */
  avoidFor: string;
  bestFor: string;
  lightMode: boolean;
  darkMode: boolean;
  conversionFocused: boolean;
  tokens: Record<string, string>;
  fontPairing: { heading: string; body: string; googleFontsUrl: string };
}

export interface Prototype {
  id: string;
  directionId: string;
  directionName: string;
  rationale: string;
  html: string;
  slopScore: number;
  /** Structural fingerprint used to prove the three outputs really differ. */
  metrics: { nodes: number; sections: number; bytes: number };
  warnings: string[];
  /**
   * True when content-honesty checks still fail after the retry — fabricated
   * testimonials, invented prices or stock imagery survived. Such a prototype
   * may be previewed but must never be pushed to a live site.
   */
  honestyFailed: boolean;
  honestyWarnings: string[];
}
