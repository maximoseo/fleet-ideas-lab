import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 16,
  versionName: "1.2.0",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.0/fleet-ideas-lab-v1.2.0.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Live fleet health sync — inventory now streams from /api/app/fleet with per-dashboard healthy/degraded/down chips and last-checked time, offline fallback to the last cached copy, new base domain fleet-ideas-lab.maximo-seo.ai. NOTE: signed with a NEW key (v1.1.4 key was lost) — uninstall v1.1.4 before installing 1.2.0.",
  mandatory: false,
  releasedAt: "2026-08-16T12:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
