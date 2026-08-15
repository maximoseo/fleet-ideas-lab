import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { extractProfile, extractColorsFromHtml, extractFontsFromHtml } from "@/lib/extract";

export const maxDuration = 60;

/**
 * Site analysis.
 *
 * Returns three things:
 *  - the legacy `SiteAnalysis` fields, so the existing "Quick CSS tweak" flow
 *    keeps working unchanged;
 *  - `profile`, the richer SiteProfile that prototype generation consumes;
 *  - `html`, the raw page source.
 *
 * Returning `html` fixes a real defect: /audit and /history used to fetch the
 * target site cross-origin from the browser, which the browser blocks, so
 * detectSlop() ran against an empty string and every "missing X" pattern fired.
 * Healthy sites scored terribly. The server already has this HTML in memory.
 */

function structureOf(html: string) {
  const count = (re: RegExp) => (html.match(re) || []).length;
  return {
    headings: { h1: count(/<h1[\s>]/gi), h2: count(/<h2[\s>]/gi), h3: count(/<h3[\s>]/gi) },
    images: count(/<img[\s>]/gi),
    links: count(/<a[\s>]/gi),
    buttons: count(/<button[\s>]/gi) + count(/class=["'][^"']*btn/gi),
    forms: count(/<form[\s>]/gi),
    sections: count(/<section[\s>]/gi),
    hasNav: /<nav[\s>]/gi.test(html) || /class=["'][^"']*menu/gi.test(html),
    hasFooter: /<footer[\s>]/gi.test(html),
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "",
    metaDescription:
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || "",
  };
}

/* Screenshot via Microlink (free tier, no key). Only used when Firecrawl
   did not already return one, and never allowed to fail the request. */
async function microlinkShot(url: string, viewport: "desktop" | "mobile"): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      url,
      screenshot: "true",
      viewport: viewport === "mobile" ? "375x812" : "1440x900",
      waitForTimeout: "3000",
    });
    const res = await fetch(`https://api.microlink.io/?${params}`, {
      headers: { "User-Agent": "DesignLab/1.0" },
      signal: AbortSignal.timeout(25000),
    });
    const json = await res.json();
    return json.status === "success" && json.data?.screenshot?.url ? json.data.screenshot.url : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let profile, html;
    try {
      ({ profile, html } = await extractProfile(url));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg.startsWith("Invalid URL")) {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const structure = structureOf(html);

    // Firecrawl gives a desktop shot; Microlink fills the gaps.
    const [desktop, mobile] = await Promise.all([
      profile.screenshots.desktop ? Promise.resolve(profile.screenshots.desktop) : microlinkShot(profile.url, "desktop"),
      microlinkShot(profile.url, "mobile"),
    ]);
    profile.screenshots = { desktop, mobile };

    return NextResponse.json({
      // ── legacy SiteAnalysis shape, still consumed by generateVariations() ──
      url: profile.url,
      title: structure.title || profile.title,
      platform: profile.platform,
      colors: profile.colors.palette.length ? profile.colors.palette : extractColorsFromHtml(html),
      fonts: [profile.typography.headingFont, profile.typography.bodyFont]
        .filter((f): f is string => Boolean(f))
        .concat(extractFontsFromHtml(html))
        .filter((f, i, a) => a.indexOf(f) === i)
        .slice(0, 5),
      structure,
      screenshots: profile.screenshots,
      htmlSize: html.length,
      // ── new ──
      profile,
      html,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Analysis failed: " + (err instanceof Error ? err.message : "unknown") },
      { status: 500 },
    );
  }
}
