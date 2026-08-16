import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release \u2014 keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 15,
  versionName: "1.1.4",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.1.4/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "Plain-English explainer per dashboard (37) + infinite scroll (Web + Android, new IDs only, never repeats, reshuffled) + 8 fresh ideas from web research (Exa/Brave/Firecrawl, source URLs in evidence, Fresh from web badge) + Favorites tab \u2661/\u2665 with DataStore (Android) + localStorage (web) \u00b7 37 verified \u00b7 11 deduped \u00b7 Turnstile 0x4AAAAAEQ",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
