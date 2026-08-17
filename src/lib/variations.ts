
export interface SiteAnalysis {
  url: string;
  title: string;
  platform: { platform: string; version?: string };
  colors: string[];
  fonts: string[];
  structure: {
    headings: { h1: number; h2: number; h3: number };
    images: number;
    links: number;
    buttons: number;
    forms: number;
    sections: number;
    hasNav: boolean;
    hasFooter: boolean;
    title: string;
    metaDescription: string;
  };
  screenshots: { desktop: string | null; mobile: string | null };
}

export interface DesignVariation {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** The CSS to inject into the site */
  css: string;
  /** Preview tokens for the mockup */
  preview: {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    accentStrong: string;
    fontDisplay: string;
    fontBody: string;
    radius: string;
  };
}

function lighten(hex: string, amt: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0xff) + amt);
  const b = Math.min(255, (num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darken(hex: string, amt: number): string {
  return lighten(hex, -amt);
}

/**
 * Generate 5 design-improvement variations for a site,
 * each built on a style family but adapted to the site's own palette.
 */
export function generateVariations(site: SiteAnalysis): DesignVariation[] {
  const siteAccent = site.colors[0] || "#7c3aed";
  const siteSecondary = site.colors[1] || "#0d9488";

  return [
    {
      id: "typography",
      name: "Typography Upgrade",
      tagline: "Better fonts, stronger hierarchy",
      description:
        "Replaces the default font stack with a distinctive display + body pairing, tightens letter-spacing on headings, and establishes a clear type scale. The single highest-impact change for most sites.",
      css: `/* ══ Fleet Ideas Lab: Typography Upgrade ══ */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800&family=Heebo:wght@400;500;600&display=swap');

body { font-family: 'Heebo', -apple-system, sans-serif !important; line-height: 1.65 !important; }
h1, h2, h3, h4, .entry-title, .site-title {
  font-family: 'Rubik', sans-serif !important;
  letter-spacing: -0.02em !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
}
h1 { font-size: clamp(2.2rem, 5vw, 3.5rem) !important; }
h2 { font-size: clamp(1.6rem, 3.5vw, 2.4rem) !important; }
p { max-width: 68ch; }
a { text-underline-offset: 3px; }
button, .button, input[type="submit"] {
  font-family: 'Rubik', sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
}`,
      preview: {
        bg: "#fafaf9", surface: "#ffffff", text: "#1c1917", textMuted: "#78716c",
        accent: siteAccent, accentStrong: darken(siteAccent, 20),
        fontDisplay: "Rubik", fontBody: "Heebo", radius: "8px",
      },
    },
    {
      id: "color-refresh",
      name: "Color Refresh",
      tagline: "Your palette, but with contrast",
      description:
        `Keeps your brand colors (${siteAccent}) but fixes contrast, adds a proper accent hierarchy, and removes muddy grays. Buttons and links become unmistakable.`,
      css: `/* ══ Fleet Ideas Lab: Color Refresh ══ */
:root {
  --dl-accent: ${siteAccent};
  --dl-accent-strong: ${darken(siteAccent, 25)};
  --dl-accent-soft: ${lighten(siteAccent, 160)};
  --dl-text: #1c1917;
  --dl-text-muted: #57534e;
  --dl-bg: #fafaf9;
  --dl-surface: #ffffff;
}
body { background: var(--dl-bg) !important; color: var(--dl-text) !important; }
a { color: var(--dl-accent-strong) !important; }
a:hover { color: var(--dl-accent) !important; }
button, .button, input[type="submit"], .wp-block-button__link {
  background: var(--dl-accent-strong) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.75em 1.5em !important;
  transition: transform 150ms ease, box-shadow 150ms ease !important;
}
button:hover, .button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px ${siteAccent}40 !important;
}
hr, .separator { border-color: #e7e5e4 !important; }`,
      preview: {
        bg: "#fafaf9", surface: "#ffffff", text: "#1c1917", textMuted: "#57534e",
        accent: siteAccent, accentStrong: darken(siteAccent, 25),
        fontDisplay: "Rubik", fontBody: "Heebo", radius: "8px",
      },
    },
    {
      id: "spacing",
      name: "Spacing & Rhythm",
      tagline: "Air, alignment, breathing room",
      description:
        "Fixes cramped layouts: generous section padding, consistent max-width, proper vertical rhythm between headings and paragraphs. Makes the site feel immediately more premium.",
      css: `/* ══ Fleet Ideas Lab: Spacing & Rhythm ══ */
section, .entry-content > *, .wp-block-group {
  margin-block: 2.5rem !important;
}
.entry-content, .container, .site-content {
  max-width: 1100px !important;
  margin-inline: auto !important;
  padding-inline: clamp(1rem, 4vw, 2.5rem) !important;
}
h1, h2, h3 { margin-bottom: 0.6em !important; }
p { margin-bottom: 1.25em !important; }
img { border-radius: 12px; }
header, .site-header { padding-block: 1rem !important; }
footer, .site-footer { padding-block: 3rem !important; margin-top: 4rem !important; }
ul, ol { padding-inline-start: 1.5em !important; }
li { margin-block: 0.4em !important; }`,
      preview: {
        bg: "#f8f7f4", surface: "#ffffff", text: "#292524", textMuted: "#78716c",
        accent: siteSecondary, accentStrong: darken(siteSecondary, 20),
        fontDisplay: "Rubik", fontBody: "Heebo", radius: "12px",
      },
    },
    {
      id: "full-treatment",
      name: "Full Treatment",
      tagline: "Typography + color + spacing, unified",
      description:
        "The complete package: all three improvements combined into one coherent design system. Recommended if you want the biggest visible change in a single step.",
      css: `/* ══ Fleet Ideas Lab: Full Treatment ══ */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800&family=Heebo:wght@400;500;600&display=swap');
:root {
  --dl-accent: ${siteAccent};
  --dl-accent-strong: ${darken(siteAccent, 25)};
  --dl-text: #1c1917;
  --dl-text-muted: #57534e;
  --dl-bg: #fafaf9;
  --dl-surface: #ffffff;
  --dl-border: #e7e5e4;
}
body { font-family: 'Heebo', sans-serif !important; background: var(--dl-bg) !important; color: var(--dl-text) !important; line-height: 1.65 !important; }
h1,h2,h3,h4,.entry-title { font-family: 'Rubik', sans-serif !important; letter-spacing: -0.02em !important; line-height: 1.15 !important; font-weight: 800 !important; }
h1 { font-size: clamp(2.2rem, 5vw, 3.5rem) !important; }
h2 { font-size: clamp(1.6rem, 3.5vw, 2.4rem) !important; }
a { color: var(--dl-accent-strong) !important; }
button,.button,input[type="submit"],.wp-block-button__link {
  background: var(--dl-accent-strong) !important; color: #fff !important; border: none !important;
  border-radius: 8px !important; padding: 0.75em 1.5em !important; font-family: 'Rubik', sans-serif !important; font-weight: 600 !important;
  transition: transform 150ms ease, box-shadow 150ms ease !important;
}
button:hover,.button:hover { transform: translateY(-1px) !important; box-shadow: 0 4px 12px ${siteAccent}40 !important; }
section,.entry-content > * { margin-block: 2.5rem !important; }
.entry-content,.container { max-width: 1100px !important; margin-inline: auto !important; padding-inline: clamp(1rem,4vw,2.5rem) !important; }
img { border-radius: 12px; }
footer,.site-footer { padding-block: 3rem !important; margin-top: 4rem !important; border-top: 1px solid var(--dl-border) !important; }`,
      preview: {
        bg: "#fafaf9", surface: "#ffffff", text: "#1c1917", textMuted: "#57534e",
        accent: siteAccent, accentStrong: darken(siteAccent, 25),
        fontDisplay: "Rubik", fontBody: "Heebo", radius: "10px",
      },
    },
    {
      id: "dark-mode",
      name: "Dark Mode",
      tagline: "A premium dark theme",
      description:
        "Inverts the site into a deep, low-glare dark theme with your accent color glowing against dark surfaces. Great for modern brands and portfolios.",
      css: `/* ══ Fleet Ideas Lab: Dark Mode ══ */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700;800&family=Heebo:wght@400;500;600&display=swap');
:root {
  --dl-accent: ${lighten(siteAccent, 40)};
  --dl-text: #e8e5f0;
  --dl-text-muted: #9a93b0;
  --dl-bg: #0d0b14;
  --dl-surface: #161322;
  --dl-border: #2a2540;
}
html { background: var(--dl-bg) !important; }
body { font-family: 'Heebo', sans-serif !important; background: var(--dl-bg) !important; color: var(--dl-text) !important; line-height: 1.65 !important; }
h1,h2,h3,h4,.entry-title { font-family: 'Rubik', sans-serif !important; letter-spacing: -0.02em !important; color: var(--dl-text) !important; font-weight: 800 !important; }
a { color: var(--dl-accent) !important; }
button,.button,input[type="submit"],.wp-block-button__link {
  background: ${siteAccent} !important; color: #fff !important; border: none !important;
  border-radius: 8px !important; padding: 0.75em 1.5em !important; font-family: 'Rubik', sans-serif !important; font-weight: 600 !important;
}
header,.site-header,footer,.site-footer { background: var(--dl-surface) !important; border-color: var(--dl-border) !important; }
img { border-radius: 12px; }
input,textarea,select { background: var(--dl-surface) !important; color: var(--dl-text) !important; border-color: var(--dl-border) !important; }`,
      preview: {
        bg: "#0d0b14", surface: "#161322", text: "#e8e5f0", textMuted: "#9a93b0",
        accent: lighten(siteAccent, 40), accentStrong: siteAccent,
        fontDisplay: "Rubik", fontBody: "Heebo", radius: "10px",
      },
    },
  ];
}
