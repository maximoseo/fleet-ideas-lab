/** Design System generators — shared between API route and /generate page. */

export interface DesignTokens {
  colors: {
    primary: string; secondary: string; accent: string;
    background: string; surface: string; text: string;
    textMuted: string; border: string; success: string;
    warning: string; error: string;
  };
  fonts: { display: string; body: string; mono: string };
  spacing: string[];
  radius: string[];
  shadows: string[];
}

// ---------- Color helpers: HSL lightness -40 for darkVariant ----------
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Darken by reducing lightness 40 points (clamped 0-100). Achromatic colors shift toward dark neutrals. */
export function darkenHex(hex: string, delta = 40): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const [h, s, l] = hexToHsl(hex);
  const nl = Math.max(0, l - delta);
  // For near-achromatic keep low saturation to avoid tinted greys
  return hslToHex(h, s, nl);
}

export function generateDarkVariant(colors: DesignTokens["colors"]): DesignTokens["colors"] {
  // HSL lightness -40 for palette colors; semantic dark neutrals are fixed for readability
  return {
    primary: darkenHex(colors.primary, 40),
    secondary: darkenHex(colors.secondary, 40),
    accent: darkenHex(colors.accent, 20),
    background: "#0d0b14",
    surface: "#161322",
    text: "#e8e5f0",
    textMuted: "#9a93b0",
    border: "#2a2540",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
  };
}

// ---------- Spacing / radius / shadows extraction ----------
export function extractSpacingFromHtml(html: string): string[] {
  const vals: string[] = [];
  for (const m of Array.from(html.matchAll(/(?:padding|margin|gap|space)[^:]*:\s*(\d+(?:px|rem))/gi))) {
    const v = (m[1] as string).toLowerCase();
    if (!vals.includes(v)) vals.push(v);
  }
  if (vals.length >= 4) {
    const uniq = Array.from(new Set(vals)).slice(0, 8);
    return uniq;
  }
  return ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"];
}

export function extractRadiusFromHtml(html: string, fallback?: string): string[] {
  if (fallback) {
    const n = parseInt(fallback, 10);
    if (!Number.isNaN(n)) {
      return [`${Math.max(2, Math.round(n * 0.33))}px`, `${Math.max(4, Math.round(n * 0.66))}px`, `${n}px`, `${Math.round(n * 1.33)}px`, "9999px"];
    }
  }
  const vals: string[] = [];
  for (const m of Array.from(html.matchAll(/border-radius\s*:\s*([^;}\"]+)/gi))) {
    const v = (m[1] as string).trim().split(/\s+/)[0]!.toLowerCase();
    if (/^\d+(px|rem|%)$/.test(v) && !vals.includes(v)) vals.push(v);
  }
  if (vals.length >= 2) return Array.from(new Set(vals)).slice(0, 5);
  return ["4px", "8px", "12px", "16px", "9999px"];
}

export function extractShadowsFromHtml(html: string): string[] {
  const vals: string[] = [];
  for (const m of Array.from(html.matchAll(/box-shadow\s*:\s*([^;}\"]+)/gi))) {
    const v = (m[1] as string).trim();
    if (v && v !== "none" && !vals.includes(v)) vals.push(v);
  }
  if (vals.length >= 1) return vals.slice(0, 3);
  return [
    "0 1px 2px rgba(0,0,0,0.05)",
    "0 4px 12px rgba(0,0,0,0.08)",
    "0 8px 24px rgba(0,0,0,0.12)",
  ];
}

// ---------- Generators ----------
export function generateCSS(tokens: DesignTokens, dark: DesignTokens["colors"]): string {
  return `:root {
  /* Colors */
  --color-primary: ${tokens.colors.primary};
  --color-secondary: ${tokens.colors.secondary};
  --color-accent: ${tokens.colors.accent};
  --color-background: ${tokens.colors.background};
  --color-surface: ${tokens.colors.surface};
  --color-text: ${tokens.colors.text};
  --color-text-muted: ${tokens.colors.textMuted};
  --color-border: ${tokens.colors.border};
  --color-success: ${tokens.colors.success};
  --color-warning: ${tokens.colors.warning};
  --color-error: ${tokens.colors.error};

  /* Fonts */
  --font-display: "${tokens.fonts.display}", sans-serif;
  --font-body: "${tokens.fonts.body}", sans-serif;
  --font-mono: "${tokens.fonts.mono}", monospace;

  /* Spacing */
${tokens.spacing.map((s, i) => `  --space-${i + 1}: ${s};`).join("\n")}

  /* Radius */
${tokens.radius.map((r, i) => `  --radius-${["sm", "md", "lg", "xl", "full"][i] || i}: ${r};`).join("\n")}

  /* Shadows */
${tokens.shadows.map((s, i) => `  --shadow-${["sm", "md", "lg"][i] || i}: ${s};`).join("\n")}
}

.dark {
  --color-primary: ${dark.primary};
  --color-secondary: ${dark.secondary};
  --color-accent: ${dark.accent};
  --color-background: ${dark.background};
  --color-surface: ${dark.surface};
  --color-text: ${dark.text};
  --color-text-muted: ${dark.textMuted};
  --color-border: ${dark.border};
  --color-success: ${dark.success};
  --color-warning: ${dark.warning};
  --color-error: ${dark.error};
}`;
}

export function generateTailwind(tokens: DesignTokens, _dark: DesignTokens["colors"]): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${tokens.colors.primary}",
        secondary: "${tokens.colors.secondary}",
        accent: "${tokens.colors.accent}",
        background: "${tokens.colors.background}",
        surface: "${tokens.colors.surface}",
        "text-primary": "${tokens.colors.text}",
        "text-muted": "${tokens.colors.textMuted}",
        border: "${tokens.colors.border}",
        success: "${tokens.colors.success}",
        warning: "${tokens.colors.warning}",
        error: "${tokens.colors.error}",
      },
      fontFamily: {
        display: ["${tokens.fonts.display}", "sans-serif"],
        body: ["${tokens.fonts.body}", "sans-serif"],
        mono: ["${tokens.fonts.mono}", "monospace"],
      },
      spacing: {
${tokens.spacing.map((s, i) => `        "${(i + 1) * 4}": "${s}",`).join("\n")}
      },
      borderRadius: {
        sm: "${tokens.radius[0]}",
        md: "${tokens.radius[1]}",
        lg: "${tokens.radius[2]}",
        xl: "${tokens.radius[3]}",
      },
      boxShadow: {
        sm: "${tokens.shadows[0]}",
        md: "${tokens.shadows[1]}",
        lg: "${tokens.shadows[2]}",
      },
    },
  },
  plugins: [],
};

export default config;`;
}

export function generateDesignMd(tokens: DesignTokens, dark: DesignTokens["colors"], url: string): string {
  return `# Design System
> Auto-generated from ${url}

## Colors

| Token | Light | Dark |
|---|---|---|
| primary | \`${tokens.colors.primary}\` | \`${dark.primary}\` |
| secondary | \`${tokens.colors.secondary}\` | \`${dark.secondary}\` |
| accent | \`${tokens.colors.accent}\` | \`${dark.accent}\` |
| background | \`${tokens.colors.background}\` | \`${dark.background}\` |
| surface | \`${tokens.colors.surface}\` | \`${dark.surface}\` |
| text | \`${tokens.colors.text}\` | \`${dark.text}\` |
| text-muted | \`${tokens.colors.textMuted}\` | \`${dark.textMuted}\` |
| border | \`${tokens.colors.border}\` | \`${dark.border}\` |
| success | \`${tokens.colors.success}\` | \`${dark.success}\` |
| warning | \`${tokens.colors.warning}\` | \`${dark.warning}\` |
| error | \`${tokens.colors.error}\` | \`${dark.error}\` |

## Typography

- **Display:** ${tokens.fonts.display}
- **Body:** ${tokens.fonts.body}
- **Mono:** ${tokens.fonts.mono}

## Spacing Scale

${tokens.spacing.map((s, i) => `- \`space-${i + 1}\`: ${s}`).join("\n")}

## Border Radius

${tokens.radius.map((r, i) => `- \`${["sm", "md", "lg", "xl", "full"][i] || i}\`: ${r}`).join("\n")}

## Shadows

${tokens.shadows.map((s, i) => `- \`${["sm", "md", "lg"][i] || i}\`: \`${s}\``).join("\n")}

## Guardrails

- ❌ No generic purple-pink gradients
- ❌ No Inter as the only font
- ❌ No blanket glassmorphism
- ❌ No blanket rounded-2xl
- ✅ Always use display + body font pairing
- ✅ Dark mode via CSS variables (class-based toggle)
`;
}

export function generateShadcn(tokens: DesignTokens): string {
  return `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "theme": {
    "colors": {
      "primary": "${tokens.colors.primary}",
      "secondary": "${tokens.colors.secondary}",
      "accent": "${tokens.colors.accent}",
      "background": "${tokens.colors.background}",
      "foreground": "${tokens.colors.text}",
      "muted": "${tokens.colors.textMuted}",
      "border": "${tokens.colors.border}",
      "destructive": "${tokens.colors.error}"
    },
    "fontFamily": {
      "display": "${tokens.fonts.display}",
      "body": "${tokens.fonts.body}"
    },
    "borderRadius": {
      "sm": "${tokens.radius[0]}",
      "md": "${tokens.radius[1]}",
      "lg": "${tokens.radius[2]}"
    }
  }
}`;
}

export function generateReadme(tokens: DesignTokens, url: string): string {
  return `# Design System — ${url}

Generated by Fleet Ideas Lab. Unzip and copy what you need.

## Files

- \`design-tokens.css\` — :root variables + .dark variant (copy into your CSS)
- \`tailwind.config.ts\` — full Tailwind theme extension
- \`design.md\` — human-readable spec for handoff
- \`shadcn-theme.json\` — shadcn/ui theme + aliases
- \`tokens.json\` — raw DesignTokens JSON (colors, fonts, spacing, radius, shadows)

## Quick start

1. Copy \`design-tokens.css\` variables into your \`globals.css\`.
2. Merge \`tailwind.config.ts\` \`theme.extend\` into your config.
3. Enable dark mode by toggling \`class=\"dark\"\` on \`<html>\`.

Display: ${tokens.fonts.display} · Body: ${tokens.fonts.body} · Mono: ${tokens.fonts.mono}
`;
}
