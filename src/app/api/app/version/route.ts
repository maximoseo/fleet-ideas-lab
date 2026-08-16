import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release \u2014 keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 13,
  versionName: "1.1.2",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.1.2/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "Professional briefs: BUILD: vs IMPROVE: (10 sections execution-grade) + dual Copy UX (Auto/Build/Improve toggle, Inventory Improve per card), fit-all-screens, favorites pull-every-tab retained \u2661/\u2665 with DataStore (Android) + localStorage (web) \u00b7 37 verified \u00b7 11 deduped \u00b7 Turnstile 0x4AAAAAEQ",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
