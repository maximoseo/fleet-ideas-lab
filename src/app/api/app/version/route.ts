import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 22,
  versionName: "1.2.6",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.6/fleet-ideas-lab-v1.2.6.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Fix desktop IDEA scroll jump: scroll no longer bounces to top — sentinel is stable (no global reshuffle, keys stable), search/favorites pause infinite scroll, candidates-only shuffle. Web + Android infinite scroll now appends unseen only. Retained: 38 dashboards, 29 ideas, Favorites, plain-English explainer.",
  mandatory: false,
  releasedAt: "2026-08-16T15:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
