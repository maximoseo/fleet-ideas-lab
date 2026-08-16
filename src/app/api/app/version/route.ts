import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 19,
  versionName: "1.2.3",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.3/fleet-ideas-lab-v1.2.3.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Fix search kick: search now spans ALL 29 ideas (including unseen Fresh from web) with auto-reveal + guarded pull-to-refresh; plain-English explainer per dashboard (38) + infinite scroll (Web + Android, new IDs only, reshuffled) + 8 fresh ideas from web research + Favorites tab — all retained (38 dashboards, 29 ideas).",
  mandatory: false,
  releasedAt: "2026-08-16T15:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
