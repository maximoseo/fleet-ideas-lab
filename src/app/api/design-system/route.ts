import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { extractColorsFromHtml, extractFontsFromHtml } from "@/lib/extract";
import {
  type DesignTokens,
  generateCSS,
  generateTailwind,
  generateDesignMd,
  generateShadcn,
  generateReadme,
  generateDarkVariant,
  extractSpacingFromHtml,
  extractRadiusFromHtml,
  extractShadowsFromHtml,
} from "@/lib/design-system";

import JSZip from "jszip";

export const maxDuration = 60;

function categorizeColors(colors: string[]): DesignTokens["colors"] {
  const sorted = Array.from(colors).sort((a, b) => {
    const lumA = (parseInt(a.slice(1, 3), 16) + parseInt(a.slice(3, 5), 16) + parseInt(a.slice(5, 7), 16)) / 3;
    const lumB = (parseInt(b.slice(1, 3), 16) + parseInt(b.slice(3, 5), 16) + parseInt(b.slice(5, 7), 16)) / 3;
    return lumB - lumA;
  });
  const dark = sorted.filter((c) => {
    const lum = (parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)) / 3;
    return lum < 80;
  });
  const light = sorted.filter((c) => {
    const lum = (parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)) / 3;
    return lum > 200;
  });
  const mid = sorted.filter((c) => {
    const lum = (parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)) / 3;
    return lum >= 80 && lum <= 200;
  });
  return {
    primary: mid[0] || "#7c3aed",
    secondary: mid[1] || "#0d9488",
    accent: mid[2] || "#f59e0b",
    background: light[0] || "#fafaf9",
    surface: light[1] || "#ffffff",
    text: dark[0] || "#1c1917",
    textMuted: dark[1] || "#78716c",
    border: light[2] || "#e7e5e4",
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
  };
}

function buildTokens(html: string, radiusFallback?: string): { tokens: DesignTokens; rawColors: string[]; rawFonts: string[]; darkVariant: DesignTokens["colors"] } {
  const rawColors = extractColorsFromHtml(html);
  const rawFonts = extractFontsFromHtml(html);
  const categorized = categorizeColors(rawColors);
  const darkVariant = generateDarkVariant(categorized);
  const tokens: DesignTokens = {
    colors: categorized,
    fonts: {
      display: rawFonts[0] || "Rubik",
      body: rawFonts[1] || "Heebo",
      mono: rawFonts[2] || "JetBrains Mono",
    },
    spacing: extractSpacingFromHtml(html),
    radius: extractRadiusFromHtml(html, radiusFallback),
    shadows: extractShadowsFromHtml(html),
  };
  return { tokens, rawColors, rawFonts, darkVariant };
}

async function fetchHtml(target: URL): Promise<string> {
  const res = await fetch(target.href, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DesignLab/1.0)" },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  return await res.text();
}

async function buildZip(url: string, tokens: DesignTokens, darkVariant: DesignTokens["colors"]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("design-tokens.css", generateCSS(tokens, darkVariant));
  zip.file("tailwind.config.ts", generateTailwind(tokens, darkVariant));
  zip.file("design.md", generateDesignMd(tokens, darkVariant, url));
  zip.file("shadcn-theme.json", generateShadcn(tokens));
  zip.file("tokens.json", JSON.stringify(tokens, null, 2));
  zip.file("README.md", generateReadme(tokens, url));
  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function parseUrl(input: string): URL {
  return new URL(input.startsWith("http") ? input : `https://${input}`);
}

// ---------- GET ?url=...&format=zip ----------
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const urlParam = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }
  let target: URL;
  try {
    target = parseUrl(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  let html = "";
  try {
    html = await fetchHtml(target);
  } catch {
    return NextResponse.json({ error: "Could not fetch the site." }, { status: 422 });
  }

  const { tokens, rawColors, rawFonts, darkVariant } = buildTokens(html);

  if (format === "zip") {
    const buf = await buildZip(target.href, tokens, darkVariant);
    return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="design-system.zip"`,
        "Content-Length": String(buf.length),
      },
    });
  }

  return NextResponse.json({ url: target.href, tokens, darkVariant, rawColors, rawFonts });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const body = await req.json() as { url?: string; format?: string };
    const { url, format } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let target: URL;
    try {
      target = parseUrl(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    let html = "";
    try {
      html = await fetchHtml(target);
    } catch {
      return NextResponse.json({ error: "Could not fetch the site." }, { status: 422 });
    }

    const { tokens, rawColors, rawFonts, darkVariant } = buildTokens(html);

    // Server-side ZIP via POST with format=zip
    if (format === "zip") {
      const buf = await buildZip(target.href, tokens, darkVariant);
      return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="design-system.zip"`,
          "Content-Length": String(buf.length),
        },
      });
    }

    return NextResponse.json({
      url: target.href,
      tokens,
      darkVariant,
      rawColors,
      rawFonts,
    });
  } catch (err) {
    return NextResponse.json({ error: "Design system generation failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
