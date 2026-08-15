import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release \u2014 keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 6,
  versionName: "1.0.5",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.0.5/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "Cloudflare Turnstile hardened (fleet widget 0x4AAAAAEQ) \u00b7 Android real CAPTCHA + siteverify \u00b7 Notifications verified (channels + deep links + settings) \u00b7 In-app update (banner + download + 12h WorkManager) \u00b7 Fingerprint auto-prompt \u00b7 Reload + pull-to-refresh",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
