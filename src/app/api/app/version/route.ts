import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Single source of truth for Android release — keep in sync with android/app/build.gradle.kts
// Bump versionCode/versionName here with every signed APK you ship.
const APP_VERSION = {
  versionCode: 17,
  versionName: "1.2.1",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.1/fleet-ideas-lab-v1.2.1.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "Login fixed for good — the app now signs in with its own trusted channel (no more 'Security verification failed' after a successful Turnstile). Deep design overhaul: real design tokens (dark+light), component library, triage-style inventory with worst-first sort and health summary strip, consistent cards/chips/empty states across every screen. NOTE: signed with the key introduced in 1.2.0 — 1.2.0 upgrades cleanly; v1.1.4 users must uninstall first.",
  mandatory: false,
  releasedAt: "2026-08-16T14:30:00Z",
};

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
