import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { extractProfile, microlinkScreenshot } from "@/lib/extract";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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

    let target: URL;
    try {
      target = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Use Firecrawl branding when available, fallback to DOM (extractProfile does both)
    let profile;
    let html: string;
    try {
      const res = await extractProfile(target.href);
      profile = res.profile;
      html = res.html;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Microlink screenshots desktop+mobile as fallback (never fails request)
    const [desktopShot, mobileShot] = await Promise.all([
      profile.screenshots.desktop ? Promise.resolve(profile.screenshots.desktop) : microlinkScreenshot(profile.url, "desktop"),
      profile.screenshots.mobile ? Promise.resolve(profile.screenshots.mobile) : microlinkScreenshot(profile.url, "mobile"),
    ]);

    // Ensure sections are the rich content-real ones from detectSections
    const sections = profile.sections;

    return NextResponse.json({
      url: profile.url,
      title: profile.title,
      sections,
      screenshots: { desktop: desktopShot, mobile: mobileShot },
      sectionCount: sections.length,
      copy: profile.copy,
      colors: profile.colors,
      typography: profile.typography,
      source: profile.source,
      confidence: profile.confidence,
      warnings: profile.warnings,
    });
  } catch (err) {
    return NextResponse.json({ error: "Mockup generation failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
