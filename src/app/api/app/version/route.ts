import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 25,
  versionName: "1.2.9",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.9/fleet-ideas-lab-v1.2.9.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Brand + UI copy 1.2.9: every user-facing Design Lab string → Fleet Ideas Lab (login header + bulb icon, loading, share, experiments, WP draft titles/markers) + title/meta/ICO already violet #7C3AED. Retained: stable infinite scroll + xl:4 dense.",
  mandatory: false,
  releasedAt: "2026-08-16T15:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
