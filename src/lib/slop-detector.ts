/**
 * Slop Detector — 46 AI design anti-patterns
 * Inspired by Impeccable's slop detection (impeccable.style)
 * Organized in 7 categories: Typography, Color, Spatial, Responsive, Interaction, Motion, UX Writing
 */

export type SlopCategory = "typography" | "color" | "spatial" | "responsive" | "interaction" | "motion" | "ux-writing";
export type SlopSeverity = "critical" | "warning" | "info";

export interface SlopPattern {
  id: string;
  category: SlopCategory;
  label: string;
  severity: SlopSeverity;
  /** Test against raw HTML/CSS text */
  test: (html: string) => boolean;
  /** Concrete CSS fix suggestion */
  fix: string;
}

export interface SlopResult {
  pattern: SlopPattern;
  detected: boolean;
}

export interface SlopScore {
  total: number;
  detected: number;
  score: number; // 0-100 (100 = clean)
  byCategory: Record<SlopCategory, { total: number; detected: number }>;
  results: SlopResult[];
}

export const SLOP_PATTERNS: SlopPattern[] = [
  // ═══ TYPOGRAPHY (6) ═══
  { id: "t1", category: "typography", label: "Inter as the only font", severity: "critical", test: (h) => /font-family\s*:\s*['"]?Inter['"]?\s*[;,}]/i.test(h) && !/font-family\s*:\s*['"]?(?!Inter)/i.test(h), fix: "Use a display + body font pairing (e.g., Rubik for headings, Heebo for body)" },
  { id: "t2", category: "typography", label: "All text same weight", severity: "warning", test: (h) => (h.match(/font-weight\s*:\s*400/gi) || []).length > 5 && !/font-weight\s*:\s*[78]00/i.test(h), fix: "Add font-weight: 700-800 for headings, 400-500 for body" },
  { id: "t3", category: "typography", label: "No heading hierarchy", severity: "warning", test: (h) => !/<h1[\s>]/i.test(h) || (!/<h2[\s>]/i.test(h) && !/<h3[\s>]/i.test(h)), fix: "Establish clear h1 > h2 > h3 hierarchy with distinct sizes" },
  { id: "t4", category: "typography", label: "Line height too tight", severity: "info", test: (h) => /line-height\s*:\s*1[;.\s}]/i.test(h) || /line-height\s*:\s*1\.1[;.\s}]/i.test(h), fix: "Use line-height: 1.5-1.65 for body text, 1.15-1.25 for headings" },
  { id: "t5", category: "typography", label: "No letter-spacing on headings", severity: "info", test: (h) => /<h[12][\s>]/i.test(h) && !/letter-spacing/i.test(h), fix: "Add letter-spacing: -0.02em to large headings for tighter feel" },
  { id: "t6", category: "typography", label: "System font stack only", severity: "info", test: (h) => /font-family\s*:\s*-apple-system/i.test(h) && !/fonts\.googleapis\.com/i.test(h) && !/font-family\s*:\s*['"][A-Z]/i.test(h), fix: "Load a distinctive web font (Google Fonts) for display text" },

  // ═══ COLOR (8) ═══
  { id: "c1", category: "color", label: "Purple-pink gradient", severity: "critical", test: (h) => /linear-gradient\([^)]*(#7c3aed|#8b5cf6|#a855f7|#ec4899|#d946ef)/i.test(h), fix: "Use solid deep colors with subtle glow instead of gradients" },
  { id: "c2", category: "color", label: "Blue-purple gradient hero", severity: "critical", test: (h) => /linear-gradient\([^)]*(#3b82f6|#6366f1|#8b5cf6)/i.test(h), fix: "Replace with a single strong brand color or subtle radial glow" },
  { id: "c3", category: "color", label: "No semantic colors", severity: "warning", test: (h) => !/--success|--error|--warning|color:\s*#(16a34a|22c55e|dc2626|ef4444|d97706|f59e0b)/i.test(h), fix: "Define success/warning/error colors for status indicators" },
  { id: "c4", category: "color", label: "Low contrast text", severity: "warning", test: (h) => /color\s*:\s*#(9[0-9a-f]{5}|[a-f][0-9a-f][0-9a-f]{4})/i.test(h) && /background\s*:\s*#(f[0-9a-f]{5}|fff)/i.test(h), fix: "Ensure text contrast ratio ≥ 4.5:1 (WCAG AA)" },
  { id: "c5", category: "color", label: "Too many accent colors", severity: "info", test: (h) => { const accents = h.match(/#[0-9a-f]{6}/gi) || []; const unique = new Set(accents.map(c => c.toLowerCase())); return unique.size > 12; }, fix: "Limit to 1 primary + 1 secondary accent + semantic colors" },
  { id: "c6", category: "color", label: "Pure black text on pure white", severity: "info", test: (h) => /color\s*:\s*#000/i.test(h) && /background\s*:\s*#fff/i.test(h), fix: "Use #1c1917 on #fafaf9 for softer, less harsh contrast" },
  { id: "c7", category: "color", label: "Neon accent on dark bg", severity: "warning", test: (h) => /background\s*:\s*#(0[0-9a-f]{5}|1[0-2][0-9a-f]{4})/i.test(h) && /#(00ff|39ff|0f0|00e5ff)/i.test(h), fix: "Use muted accent (e.g., #a78bfa) with subtle glow instead of neon" },
  { id: "c8", category: "color", label: "Rainbow gradient text", severity: "critical", test: (h) => /background\s*:\s*linear-gradient[^;]+;\s*-webkit-background-clip\s*:\s*text/i.test(h), fix: "Use solid color for text; save gradients for decorative elements only" },

  // ═══ SPATIAL (7) ═══
  { id: "s1", category: "spatial", label: "Blanket rounded-2xl", severity: "warning", test: (h) => (h.match(/border-radius\s*:\s*1[6-9]px|rounded-2xl|rounded-3xl/gi) || []).length > 5, fix: "Vary radius by component: 6-8px buttons, 12px cards, 4px inputs" },
  { id: "s2", category: "spatial", label: "No max-width on content", severity: "warning", test: (h) => !/max-width\s*:\s*(1[0-2]00|900|800|700|68ch)/i.test(h), fix: "Add max-width: 1100px (or 68ch for text) with margin: auto" },
  { id: "s3", category: "spatial", label: "Cramped sections", severity: "warning", test: (h) => /padding\s*:\s*(8|10|12)px/i.test(h) && !/padding\s*:\s*(32|40|48|64)px/i.test(h), fix: "Use 40-64px vertical padding between major sections" },
  { id: "s4", category: "spatial", label: "Inconsistent spacing scale", severity: "info", test: (h) => { const pads = h.match(/padding[^:]*:\s*\d+px/gi) || []; const vals = new Set(pads.map(p => p.match(/\d+px/)?.[0])); return vals.size > 10; }, fix: "Use a consistent 4px-based spacing scale (4, 8, 12, 16, 24, 32, 48)" },
  { id: "s5", category: "spatial", label: "No container padding", severity: "info", test: (h) => /class=["'][^"']*container/i.test(h) && !/padding-inline|px-|padding-left|padding-right/i.test(h), fix: "Add horizontal padding (clamp(1rem, 4vw, 2.5rem)) to containers" },
  { id: "s6", category: "spatial", label: "Cards touching edges", severity: "info", test: (h) => /class=["'][^"']*card/i.test(h) && !/gap|margin|space-/i.test(h), fix: "Add gap: 16-24px between card grids" },
  { id: "s7", category: "spatial", label: "Uniform padding everywhere", severity: "info", test: (h) => { const p = h.match(/padding\s*:\s*(\d+)px/gi) || []; const vals = p.map(x => x.match(/\d+/)?.[0]); return vals.length > 5 && new Set(vals).size <= 2; }, fix: "Vary padding by context: tighter in dense UI, generous in hero/footer" },

  // ═══ RESPONSIVE (5) ═══
  { id: "r1", category: "responsive", label: "No viewport meta", severity: "critical", test: (h) => !/<meta[^>]*viewport/i.test(h), fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">' },
  { id: "r2", category: "responsive", label: "No media queries", severity: "warning", test: (h) => !/@media/i.test(h) && !/sm:|md:|lg:|xl:/i.test(h), fix: "Add responsive breakpoints for mobile (640px), tablet (768px), desktop (1024px)" },
  { id: "r3", category: "responsive", label: "Fixed pixel widths", severity: "warning", test: (h) => (h.match(/width\s*:\s*(500|600|700|800|900|1000|1200)px/gi) || []).length > 3, fix: "Use max-width + percentage/fluid widths instead of fixed px" },
  { id: "r4", category: "responsive", label: "No clamp() for fluid type", severity: "info", test: (h) => /font-size\s*:\s*(36|42|48|56|64)px/i.test(h) && !/clamp\(/i.test(h), fix: "Use font-size: clamp(2rem, 5vw, 3.5rem) for fluid headings" },
  { id: "r5", category: "responsive", label: "Touch targets too small", severity: "warning", test: (h) => /height\s*:\s*(2[0-9]|3[0-5])px/i.test(h) && /<(button|a)[\s>]/i.test(h), fix: "Ensure all interactive elements are ≥ 44px touch targets" },

  // ═══ INTERACTION (6) ═══
  { id: "i1", category: "interaction", label: "No hover states", severity: "warning", test: (h) => /<(button|a)[\s>]/i.test(h) && !/:hover/i.test(h) && !/hover:/i.test(h), fix: "Add hover states: color change, translateY(-1px), or shadow" },
  { id: "i2", category: "interaction", label: "No focus-visible styles", severity: "warning", test: (h) => !/:focus-visible|focus-visible:|outline/i.test(h), fix: "Add :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }" },
  { id: "i3", category: "interaction", label: "No cursor pointer on clickable", severity: "info", test: (h) => /<(button|a)[\s>]/i.test(h) && !/cursor\s*:\s*pointer/i.test(h), fix: "Add cursor: pointer to all clickable elements" },
  { id: "i4", category: "interaction", label: "No disabled states", severity: "info", test: (h) => /<button[\s>]/i.test(h) && !/:disabled|\[disabled\]|disabled:/i.test(h), fix: "Add disabled styles: opacity: 0.5, cursor: not-allowed" },
  { id: "i5", category: "interaction", label: "No transition on interactive", severity: "info", test: (h) => /<(button|a)[\s>]/i.test(h) && !/transition/i.test(h), fix: "Add transition: all 150ms ease to buttons and links" },
  { id: "i6", category: "interaction", label: "Blanket glassmorphism", severity: "warning", test: (h) => (h.match(/backdrop-filter\s*:\s*blur|backdrop-blur/gi) || []).length > 3, fix: "Use glassmorphism sparingly — only on overlays/nav, not every card" },

  // ═══ MOTION (7) ═══
  { id: "m1", category: "motion", label: "No animations at all", severity: "info", test: (h) => !/animation|transition|@keyframes|animate-/i.test(h), fix: "Add subtle transitions (150-200ms) to interactive elements" },
  { id: "m2", category: "motion", label: "Bounce/spring everywhere", severity: "warning", test: (h) => (h.match(/bounce|spring|elastic/gi) || []).length > 3, fix: "Use ease or ease-out for functional UI; save bounce for playful moments" },
  { id: "m3", category: "motion", label: "No reduced-motion support", severity: "warning", test: (h) => /animation|@keyframes/i.test(h) && !/prefers-reduced-motion/i.test(h), fix: "Add @media (prefers-reduced-motion: reduce) { animation: none }" },
  { id: "m4", category: "motion", label: "Excessive parallax", severity: "warning", test: (h) => (h.match(/parallax|translateZ|perspective/gi) || []).length > 2, fix: "Limit parallax to hero section only; remove from content areas" },
  { id: "m5", category: "motion", label: "Auto-playing animations", severity: "info", test: (h) => /animation\s*:[^;]*infinite/i.test(h) && !/animation-play-state/i.test(h), fix: "Add pause on hover/focus for infinite animations" },
  { id: "m6", category: "motion", label: "No loading states", severity: "info", test: (h) => !/skeleton|loading|spinner|pulse/i.test(h), fix: "Add skeleton loaders or spinners for async content" },
  { id: "m7", category: "motion", label: "Janky scroll animations", severity: "info", test: (h) => /scroll.*animation|animate.*scroll/i.test(h) && !/IntersectionObserver|scroll-timeline/i.test(h), fix: "Use IntersectionObserver or CSS scroll-timeline for performant scroll animations" },

  // ═══ UX WRITING (7) ═══
  { id: "w1", category: "ux-writing", label: "Generic Lorem ipsum", severity: "critical", test: (h) => /lorem ipsum|dolor sit amet/i.test(h), fix: "Replace with real, specific copy that speaks to the audience" },
  { id: "w2", category: "ux-writing", label: '"Learn More" buttons', severity: "warning", test: (h) => (h.match(/learn more|read more|click here/gi) || []).length > 2, fix: "Use specific CTAs: 'See pricing', 'Start free trial', 'View case study'" },
  { id: "w3", category: "ux-writing", label: "No aria-labels on icons", severity: "warning", test: (h) => /<(svg|img)[^>]*>/i.test(h) && !/aria-label|aria-hidden|alt=/i.test(h), fix: "Add aria-label to icon buttons, alt text to images" },
  { id: "w4", category: "ux-writing", label: "Generic page title", severity: "info", test: (h) => /<title[^>]*>\s*(Home|Untitled|Document|Page\s*1)\s*<\/title>/i.test(h), fix: "Write a descriptive title: 'Product Name — What It Does for Whom'" },
  { id: "w5", category: "ux-writing", label: "No meta description", severity: "info", test: (h) => !/<meta[^>]*name=["']description["']/i.test(h), fix: "Add a 150-char meta description with the page's value proposition" },
  { id: "w6", category: "ux-writing", label: "ALL CAPS body text", severity: "info", test: (h) => (h.match(/text-transform\s*:\s*uppercase/gi) || []).length > 3, fix: "Reserve uppercase for small labels/badges only, not paragraphs" },
  { id: "w7", category: "ux-writing", label: "No empty states", severity: "info", test: (h) => /class=["'][^"']*(list|grid|table)/i.test(h) && !/empty|no.*(data|results|items)/i.test(h), fix: "Add helpful empty states: 'No tasks yet — create your first one'" },
];

export function detectSlop(html: string): SlopScore {
  const results: SlopResult[] = SLOP_PATTERNS.map(pattern => ({
    pattern,
    detected: pattern.test(html),
  }));

  const detected = results.filter(r => r.detected);
  const byCategory = {} as Record<SlopCategory, { total: number; detected: number }>;

  for (const cat of ["typography", "color", "spatial", "responsive", "interaction", "motion", "ux-writing"] as SlopCategory[]) {
    const catResults = results.filter(r => r.pattern.category === cat);
    byCategory[cat] = {
      total: catResults.length,
      detected: catResults.filter(r => r.detected).length,
    };
  }

  // Score: weighted by severity
  const weights: Record<SlopSeverity, number> = { critical: 3, warning: 2, info: 1 };
  const maxScore = SLOP_PATTERNS.reduce((sum, p) => sum + weights[p.severity], 0);
  const penalty = detected.reduce((sum, r) => sum + weights[r.pattern.severity], 0);
  const score = Math.round(((maxScore - penalty) / maxScore) * 100);

  return {
    total: SLOP_PATTERNS.length,
    detected: detected.length,
    score,
    byCategory,
    results,
  };
}

// ── StyleTokens / SiteProfile wiring for Style Arena (P0.1.1) ──
// These helpers synthesize an HTML/CSS document from design tokens so the
// same 46 html-based patterns can score a StyleTokens selection without
// duplicating detection logic. Keeps SLOP_PATTERNS as single source of truth.

export interface StyleTokensInput {
  id: string;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
  radiusBtn: string;
}

export interface TweaksInput {
  fontScale?: number;
  radiusScale?: number;
  accentOverride?: string | null;
}

/** Build a synthetic HTML document from StyleTokens so html-based patterns can run */
export function styleTokensToHtml(style: StyleTokensInput, tweaks?: TweaksInput): string {
  const accent = tweaks?.accentOverride ?? style.accent;
  const r = Math.round(parseInt(style.radius || "12px", 10) * (tweaks?.radiusScale ?? 1));
  const rb = Math.round(parseInt(style.radiusBtn || style.radius, 10) * (tweaks?.radiusScale ?? 1));
  const fs = tweaks?.fontScale ?? 1;
  // Include just enough structure to let typography/spatial/responsive/interaction/motion/ux checks fire meaningfully
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${style.id} — Fleet Ideas Lab preview</title>
<meta name="description" content="Preview of ${style.id} style">
<style>
:root{--bg:${style.bg};--surface:${style.surface};--accent:${accent};--radius:${r}px}
body{font-family:'${style.fontBody}',sans-serif;font-size:${14 * fs}px;background:${style.bg};color:${style.textPrimary};line-height:1.6}
h1,h2{font-family:'${style.fontDisplay}',sans-serif;letter-spacing:-0.02em;line-height:1.2}
h1{font-weight:800;font-size:clamp(2rem,5vw,3.5rem)}
.card{border-radius:${r}px;border:1px solid ${style.border};background:${style.elevated};padding:16px}
button{border-radius:${rb}px;background:${accent};color:#fff;transition:all 150ms ease;cursor:pointer}
button:hover{filter:brightness(1.06)}
a:hover{opacity:0.8}
:focus-visible{outline:2px solid ${accent};outline-offset:2px}
@media(min-width:640px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head><body>
<h1>Client Board</h1><h2>Recent tasks</h2><h3>Section</h3>
<p>Real copy for auditing — not lorem ipsum.</p>
<div class="container" style="max-width:1100px;padding-inline:clamp(1rem,4vw,2.5rem)"><div class="grid" style="display:grid;gap:16px"><div class="card">Card A</div><div class="card">Card B</div></div></div>
<button>New client</button><a href="#">View all</a>
</body></html>`;
}

/** Score a StyleTokens selection using the same 46 patterns */
export function detectSlopForStyle(style: StyleTokensInput, tweaks?: TweaksInput): SlopScore {
  return detectSlop(styleTokensToHtml(style, tweaks));
}

/** Score from a SiteProfile (extracted site) — converts profile to html-ish text */
export function detectSlopForProfile(profile: { colors?: { palette?: string[] }; typography?: { headingFont?: string; bodyFont?: string; headingStack?: string[]; bodyStack?: string[] }; copy?: { siteName?: string } }): SlopScore {
  const parts: string[] = [];
  if (profile.colors?.palette) parts.push(`<!-- palette ${profile.colors.palette.join(" ")} -->`);
  if (profile.typography?.headingFont) parts.push(`<style>h1{font-family:'${profile.typography.headingFont}'}</style>`);
  if (profile.typography?.bodyFont) parts.push(`<style>body{font-family:'${profile.typography.bodyFont}'}</style>`);
  if (profile.copy?.siteName) parts.push(`<title>${profile.copy.siteName}</title>`);
  // Fall back to html detection on whatever we have
  return detectSlop(parts.join("\n") || "<html></html>");
}
