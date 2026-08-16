import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 20,
  versionName: "1.2.4",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.4/fleet-ideas-lab-v1.2.4.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Fix 2nd-load crash: Ideas no longer exits the app on the second New Idea load — guarded DataStore, sentinel on filtered ideas.size (not raw pool), throttle + try/finally, search-paused infinite scroll. Search spans ALL 29 ideas with auto-reveal. Retained: 38 dashboards, 29 ideas, Favorites, plain-English explainer, infinite scroll.",
  mandatory: false,
  releasedAt: "2026-08-16T15:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
