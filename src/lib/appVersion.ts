/**
 * Single source of truth for the shipped Android release.
 *
 * Keep in sync with `android/app/build.gradle.kts` on every signed build.
 * `scripts/check-version-sync.mjs` asserts the two agree, and CI runs it — the
 * failure mode this prevents is a served /api/app/version that advertises a
 * build nobody produced (the manifest route used to hardcode 1.2.0 while the
 * app shipped 1.3.6).
 */
export const APP_VERSION = {
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
} as const;
