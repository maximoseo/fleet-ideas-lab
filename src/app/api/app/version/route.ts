import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 18,
  versionName: "1.2.2",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.2/fleet-ideas-lab-v1.2.2.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Fingerprint unlock now truly works: credentials are saved encrypted (Keystore-backed AES256) and the app re-logs you in silently after the session expires. Username is prefilled. App now always starts in dark mode. In-app updater verified end-to-end (version check → download → install). Signed with the same key as 1.2.x — upgrades cleanly; v1.1.4 users must uninstall first.",
  mandatory: false,
  releasedAt: "2026-08-16T15:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
