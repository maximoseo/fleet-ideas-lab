import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 28,
  versionName: "1.3.2",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.3.2/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "1.3.2 Settings: dedicated Settings screen (Account + Notifications + App) — Logout lives at bottom like Gmail/Slack (confirm dialog, SessionStore.clear + POST /api/auth/logout, back-stack cleared) + top bar Settings gear (rail 68px + inbox 300px + detail 01→06) bound to 38 dashboards / 29 ideas pool with real POST /api/fleet/scaffold (4-arg) + terminal footer + in-app update via WorkManager/FileProvider (/api/app/download 302→GitHub).",
  mandatory: false,
  releasedAt: "2026-08-17T17:00:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
