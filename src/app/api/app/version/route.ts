import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 3,
  versionName: "1.0.2",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.0.2/app-release.apk",
  // Fallback direct download via Vercel (served from /public not needed — GitHub is primary)
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "In-app update + notifications (12h check, banner, notification, FileProvider, WorkManager) \u00b7 Professional Ideas Lab icon + name \u00b7 BASE_URL fleet-ideas-lab.vercel.app",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
