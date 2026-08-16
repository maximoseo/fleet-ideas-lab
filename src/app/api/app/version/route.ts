import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release \u2014 keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 14,
  versionName: "1.1.3",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.1.3/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.vercel.app/api/app/download",
  changelog: "Agent-proof CBC: BUILD says New Dashboards and New Apps explicitly + 9-step CBC with tools/inputs/outputs/commands + Favorites tab + Reload novelty (only unseen New IDs, Fisher-Yates reshuffle, never repeats) + generated pool 10 \u2661/\u2665 with DataStore (Android) + localStorage (web) \u00b7 37 verified \u00b7 11 deduped \u00b7 Turnstile 0x4AAAAAEQ",
  mandatory: false,
  releasedAt: "2026-08-09T11:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
