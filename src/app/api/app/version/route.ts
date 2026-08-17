import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 32,
  versionName: "1.3.6",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.3.6/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "1.3.6 Send Idea to Bot: send any idea directly to active live Telegram bots (@HermesAgent64SparkBot/@CodingAgent64Bot) via POST /api/fleet/notify — Web + Android picker, server builds brief + Telegram 4096 truncate (rail 68px + inbox 300px + detail 01→06) bound to 38 dashboards / 29 ideas pool with real POST /api/fleet/scaffold (4-arg) + terminal footer + in-app update via WorkManager/FileProvider (/api/app/download 302→GitHub).",
  mandatory: false,
  releasedAt: "2026-08-17T19:30:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
