import directionsData from "@/data/directions.json";
import macrosData from "@/data/macrostructures.json";
import type { SiteProfile } from "./types";

/**
 * Design directions and page macrostructures.
 *
 * Directions come from the ui-ux-pro-max style corpus (84 styles, 192 palettes,
 * 74 font pairings) distilled to 14 that suit real business websites. Each one
 * carries the corpus's own "AI prompt keywords", CSS keywords, design-system
 * variables and — importantly — what it must NOT be used for.
 *
 * Macrostructures come from Hallmark. They are the page's section rhythm, and
 * they are what makes three prototypes genuinely different rather than three
 * colour-swaps of one template. Each prototype in a run gets a different one.
 */

export interface Direction {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  promptKeywords: string;
  cssKeywords: string;
  designSystemVariables: string;
  bestFor: string;
  avoidFor: string;
  lightMode: boolean;
  darkMode: boolean;
  conversionFocused: boolean;
  suitsPersonality: string[];
  tokens: Record<string, string>;
  fontPairing: {
    name: string;
    heading: string;
    body: string;
    googleFontsUrl: string;
    mood: string[];
  };
}

export interface Macrostructure {
  id: string;
  no: number;
  name: string;
  description: string;
  topTen: boolean;
}

export const DIRECTIONS = directionsData as Direction[];
export const MACROSTRUCTURES = macrosData as Macrostructure[];

export function getDirection(id: string): Direction | undefined {
  return DIRECTIONS.find((d) => d.id === id);
}

/** Deterministic small hash, so the same site always gets the same picks. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function scoreDirection(d: Direction, profile: SiteProfile): number {
  let score = 0;
  const personality = new Set(profile.personality);

  for (const tag of d.suitsPersonality) if (personality.has(tag)) score += 3;

  // Respect the corpus's own colour-scheme support.
  if (profile.colorScheme === "dark" && !d.darkMode) score -= 4;
  if (profile.colorScheme === "light" && !d.lightMode) score -= 4;

  // Commercial pages benefit from conversion-focused styles.
  if ((personality.has("commercial") || personality.has("retail")) && d.conversionFocused) score += 2;

  // "Do Not Use For" is a hard signal, not decoration.
  const words = `${profile.copy.metaDescription} ${profile.copy.headings.join(" ")}`.toLowerCase();
  for (const term of d.avoidFor.toLowerCase().split(/[,;]/)) {
    const t = term.trim();
    if (t.length > 4 && words.includes(t)) score -= 5;
  }

  return score;
}

/**
 * Pick N directions that fit the site AND differ from each other.
 * Diversity is enforced by category and by font pairing, not just by score.
 */
export function pickDirections(profile: SiteProfile, n = 3): Direction[] {
  const seed = hash(profile.url);
  const ranked = DIRECTIONS.map((d, i) => ({
    d,
    // Tiny deterministic jitter breaks ties without making runs random.
    score: scoreDirection(d, profile) + ((seed + i * 7919) % 5) / 10,
  })).sort((a, b) => b.score - a.score);

  const chosen: Direction[] = [];
  const usedCategories = new Set<string>();
  const usedFonts = new Set<string>();

  for (const { d } of ranked) {
    if (chosen.length >= n) break;
    if (usedCategories.has(d.category) && usedFonts.has(d.fontPairing.name)) continue;
    chosen.push(d);
    usedCategories.add(d.category);
    usedFonts.add(d.fontPairing.name);
  }
  // Backfill if the diversity filter was too strict for a small corpus.
  for (const { d } of ranked) {
    if (chosen.length >= n) break;
    if (!chosen.includes(d)) chosen.push(d);
  }
  return chosen.slice(0, n);
}

/**
 * Assign a distinct macrostructure to each direction.
 * Prefers the first ten, which Hallmark marks as the strongest general shapes.
 */
export function pickMacrostructures(profile: SiteProfile, count: number): Macrostructure[] {
  const seed = hash(profile.url + profile.title);
  const pool = MACROSTRUCTURES.filter((m) => m.topTen);
  const extra = MACROSTRUCTURES.filter((m) => !m.topTen);

  // Some shapes need content the site may not have.
  const has = (t: string) => profile.sections.some((s) => s.type === t);
  const viable = pool.filter((m) => {
    if (m.no === 4 && !has("pricing")) return true; // stat-led is fine without pricing
    if (m.no === 9 && !has("testimonials")) return false; // quote-led needs real quotes
    if (m.no === 8 && !has("gallery") && profile.sections.filter((s) => s.hasImage).length === 0) return false;
    return true;
  });

  const ordered = [...(viable.length >= count ? viable : [...viable, ...extra])];
  const out: Macrostructure[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 5) % ordered.length;
    const pick = ordered.splice(idx % ordered.length, 1)[0];
    if (pick) out.push(pick);
  }
  return out;
}
