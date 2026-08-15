export type StyleId = "violet" | "quiet" | "print" | "dither" | "classical";

export interface StyleTokens {
  id: StyleId;
  name: string;
  nameHe: string;
  description: string;
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  accentGlow: string;
  success: string;
  warning: string;
  error: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
  radiusBtn: string;
}

export const STYLES: Record<StyleId, StyleTokens> = {
  violet: {
    id: "violet",
    name: "Violet Mission Control",
    nameHe: "Violet Mission Control",
    description: "Deep violet, subtle glow, strong typography. Not a gradient slop.",
    bg: "#0f0b1a",
    surface: "#1a1428",
    elevated: "#231c33",
    border: "#3d3355",
    textPrimary: "#f0ecf7",
    textSecondary: "#a89bc2",
    textMuted: "#6b5f82",
    accent: "#a78bfa",
    accentStrong: "#7c3aed",
    accentGlow: "rgba(167,139,250,0.15)",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    fontDisplay: "Rubik",
    fontBody: "Heebo",
    radius: "12px",
    radiusBtn: "8px",
  },
  quiet: {
    id: "quiet",
    name: "Quiet Ledger",
    nameHe: "Quiet Ledger",
    description: "Minimalist light, airy, thin lines, slow heavy motion.",
    bg: "#fafaf9",
    surface: "#ffffff",
    elevated: "#f5f5f4",
    border: "#d6d3d1",
    textPrimary: "#1c1917",
    textSecondary: "#57534e",
    textMuted: "#a8a29e",
    accent: "#0d9488",
    accentStrong: "#0f766e",
    accentGlow: "rgba(13,148,136,0.08)",
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
    fontDisplay: "Frank Ruhl Libre",
    fontBody: "Heebo",
    radius: "8px",
    radiusBtn: "6px",
  },
  print: {
    id: "print",
    name: "Print-Tech Paper",
    nameHe: "Print-Tech Paper",
    description: "Paper texture, data as graphics, monospace accents, report feel.",
    bg: "#f7f5f0",
    surface: "#fffef9",
    elevated: "#f0ede5",
    border: "#d4cfc4",
    textPrimary: "#2c2a25",
    textSecondary: "#5c584e",
    textMuted: "#9c9688",
    accent: "#b45309",
    accentStrong: "#92400e",
    accentGlow: "rgba(180,83,9,0.08)",
    success: "#15803d",
    warning: "#ca8a04",
    error: "#b91c1c",
    fontDisplay: "JetBrains Mono",
    fontBody: "Heebo",
    radius: "4px",
    radiusBtn: "4px",
  },
  dither: {
    id: "dither",
    name: "Dither Mono",
    nameHe: "Dither Mono",
    description: "Black & white with dither, terminal aesthetic, single green accent.",
    bg: "#0a0a0a",
    surface: "#141414",
    elevated: "#1e1e1e",
    border: "#333333",
    textPrimary: "#e5e5e5",
    textSecondary: "#a3a3a3",
    textMuted: "#525252",
    accent: "#22c55e",
    accentStrong: "#16a34a",
    accentGlow: "rgba(34,197,94,0.1)",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
    fontDisplay: "JetBrains Mono",
    fontBody: "JetBrains Mono",
    radius: "2px",
    radiusBtn: "2px",
  },
  classical: {
    id: "classical",
    name: "Classical Remix",
    nameHe: "Classical Remix",
    description: "Modern serifs, high contrast, magazine feel.",
    bg: "#fdfcfa",
    surface: "#ffffff",
    elevated: "#f8f6f2",
    border: "#e0dcd4",
    textPrimary: "#1a1815",
    textSecondary: "#4a4540",
    textMuted: "#8a8478",
    accent: "#9333ea",
    accentStrong: "#7e22ce",
    accentGlow: "rgba(147,51,234,0.08)",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
    fontDisplay: "Frank Ruhl Libre",
    fontBody: "Heebo",
    radius: "6px",
    radiusBtn: "4px",
  },
};

export const STYLE_LIST = Object.values(STYLES);
