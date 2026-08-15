import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release \u2014 keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 7,
  versionName: "1.0.6",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.0.6/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "Inventory re-audit (37 verified dashboards, Vercel 46 \u2212 9 utilities, live aliases, clean domains) \u00b7 Cloudflare Turnstile 0x4AAAAAEQ \u00b7 Notifications + In-app update + Fingerprint + Reload/pull",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
