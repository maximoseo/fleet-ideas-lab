import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";

export const maxDuration = 60;

export interface Suggestion {
  id: string;
  category: "layout" | "typography" | "color" | "spacing" | "cta" | "mobile" | "accessibility";
  title: string;
  issue: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
}

/* ── Contrast ratio calculation (WCAG) ── */
function luminance(hex: string): number {
  const rgb = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg), l2 = luminance(bg);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Generate prioritized design suggestions from analysis ── */
function generateSuggestions(analysis: {
  colors: string[];
  fonts: string[];
  structure: {
    headings: { h1: number; h2: number; h3: number };
    images: number;
    buttons: number;
    forms: number;
    hasNav: boolean;
    hasFooter: boolean;
    metaDescription: string;
  };
}): Suggestion[] {
  const s: Suggestion[] = [];
  const { colors, fonts, structure } = analysis;

  // Typography
  if (fonts.length === 0 || (fonts.length === 1 && /inherit|sans-serif|arial|helvetica/i.test(fonts[0]))) {
    s.push({
      id: "typo-fonts",
      category: "typography",
      title: "No distinctive font pairing",
      issue: "The site uses only generic system fonts, which makes it look templated.",
      recommendation: "Pair a display font (Rubik, Frank Ruhl Libre) for headings with a readable body font (Heebo, Assistant). This single change has the highest visual impact.",
      impact: "high",
      effort: "easy",
    });
  }

  if (structure.headings.h1 === 0) {
    s.push({
      id: "typo-h1",
      category: "typography",
      title: "Missing H1 heading",
      issue: "No <h1> found. This hurts both SEO and visual hierarchy.",
      recommendation: "Add exactly one descriptive <h1> that states the page's main value proposition.",
      impact: "high",
      effort: "easy",
    });
  }

  if (structure.headings.h1 > 1) {
    s.push({
      id: "typo-multi-h1",
      category: "typography",
      title: `Multiple H1 headings (${structure.headings.h1})`,
      issue: "More than one <h1> dilutes hierarchy and confuses search engines.",
      recommendation: "Keep a single <h1>; demote the rest to <h2>/<h3>.",
      impact: "medium",
      effort: "easy",
    });
  }

  // Color
  if (colors.length >= 2) {
    const text = colors.find(c => luminance(c) < 0.2) || colors[0];
    const bg = colors.find(c => luminance(c) > 0.8) || colors[colors.length - 1];
    if (text && bg) {
      const ratio = contrastRatio(text, bg);
      if (ratio < 4.5) {
        s.push({
          id: "color-contrast",
          category: "color",
          title: `Low text contrast (${ratio.toFixed(1)}:1)`,
          issue: "Text/background contrast is below WCAG AA (4.5:1), making it hard to read.",
          recommendation: "Darken text or lighten background until the ratio reaches at least 4.5:1.",
          impact: "high",
          effort: "easy",
        });
      }
    }
  }

  if (colors.length > 8) {
    s.push({
      id: "color-too-many",
      category: "color",
      title: `Too many colors (${colors.length} detected)`,
      issue: "A large palette feels chaotic and unbranded.",
      recommendation: "Consolidate to 1 primary + 1 secondary + neutrals + 3 semantic colors (success/warning/error).",
      impact: "medium",
      effort: "medium",
    });
  }

  // Layout
  if (!structure.hasNav) {
    s.push({
      id: "layout-nav",
      category: "layout",
      title: "No clear navigation detected",
      issue: "No <nav> element found, which can hurt usability.",
      recommendation: "Add a persistent navigation bar with 4-6 primary links.",
      impact: "medium",
      effort: "medium",
    });
  }

  if (structure.images > 50) {
    s.push({
      id: "layout-images",
      category: "layout",
      title: `Heavy image count (${structure.images})`,
      issue: "Many images can slow page load and hurt Core Web Vitals.",
      recommendation: "Lazy-load below-the-fold images, use WebP/AVIF, and add width/height to prevent layout shift.",
      impact: "high",
      effort: "medium",
    });
  }

  // CTA
  if (structure.buttons === 0) {
    s.push({
      id: "cta-none",
      category: "cta",
      title: "No clear call-to-action",
      issue: "No buttons detected. Visitors have no obvious next step.",
      recommendation: "Add a prominent primary CTA above the fold with a specific action ('Get a quote', 'Book a demo').",
      impact: "high",
      effort: "easy",
    });
  }

  // SEO / meta
  if (!structure.metaDescription) {
    s.push({
      id: "seo-meta",
      category: "layout",
      title: "Missing meta description",
      issue: "No meta description hurts search click-through rates.",
      recommendation: "Add a 150-character meta description summarizing the page's value.",
      impact: "medium",
      effort: "easy",
    });
  }

  // Mobile
  s.push({
    id: "mobile-touch",
    category: "mobile",
    title: "Verify mobile touch targets",
    issue: "Interactive elements under 44px are hard to tap on mobile.",
    recommendation: "Ensure all buttons and links have a minimum 44×44px touch area, with adequate spacing.",
    impact: "medium",
    effort: "easy",
  });

  // Accessibility
  s.push({
    id: "a11y-alt",
    category: "accessibility",
    title: "Audit image alt text",
    issue: structure.images > 0 ? `${structure.images} images — missing alt text breaks screen readers.` : "Ensure any added images have descriptive alt text.",
    recommendation: "Add meaningful alt text to informative images and alt=\"\" to decorative ones.",
    impact: "medium",
    effort: "medium",
  });

  // Sort by impact
  const impactWeight = { high: 3, medium: 2, low: 1 };
  return s.sort((a, b) => impactWeight[b.impact] - impactWeight[a.impact]);
}

export async function POST(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { analysis } = await req.json();
    if (!analysis) {
      return NextResponse.json({ error: "Missing analysis data" }, { status: 400 });
    }
    const suggestions = generateSuggestions(analysis);
    return NextResponse.json({ suggestions, count: suggestions.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
