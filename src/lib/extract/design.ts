/**
 * Design-token extraction from raw markup: colours, font families, platform.
 */

export function extractColorsFromHtml(html: string): string[] {
  const colors = new Map<string, number>();
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    let c = m[1].toLowerCase();
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    colors.set("#" + c, (colors.get("#" + c) || 0) + 1);
  }
  for (const m of html.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const hex = "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
    colors.set(hex, (colors.get(hex) || 0) + 1);
  }
  return [...colors.entries()]
    .filter(([c, count]) => {
      if (count < 2) return false;
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      const lum = (r + g + b) / 3;
      return lum > 20 && lum < 240;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);
}

export function extractFontsFromHtml(html: string): string[] {
  const fonts = new Set<string>();
  // The quote characters must NOT be excluded here. Any family name with a
  // space is quoted in real CSS (`font-family:"Helvetica Neue",sans-serif`),
  // and excluding the quote made the capture start on an excluded character,
  // so the whole declaration failed to match and the font vanished silently.
  for (const m of html.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const family = m[1].split(",")[0].trim().replace(/['"]/g, "");
    if (family && !family.startsWith("var(") && family.length < 40) fonts.add(family);
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/g)) {
    for (const f of decodeURIComponent(m[1]).split("|")) {
      const name = f.split(":")[0].replace(/\+/g, " ");
      if (name) fonts.add(name);
    }
  }
  return [...fonts].slice(0, 5);
}

export function detectPlatform(html: string, headers?: Headers): { platform: string; version?: string } {
  const generator = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
  const powered = headers?.get("x-powered-by") || "";
  if (generator?.[1]?.toLowerCase().includes("wordpress")) {
    return { platform: "WordPress", version: generator[1].match(/([\d.]+)/)?.[1] };
  }
  if (powered.toLowerCase().includes("wordpress")) return { platform: "WordPress" };
  if (html.includes("wp-content") || html.includes("wp-includes")) return { platform: "WordPress" };
  if (html.includes("shopify")) return { platform: "Shopify" };
  if (html.includes("wix.com") || html.includes("wixstatic")) return { platform: "Wix" };
  if (html.includes("__next") || powered.includes("Next.js")) return { platform: "Next.js" };
  return { platform: "Unknown" };
}

/** Loose descriptors used to pick design directions. Deliberately coarse. */
