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
  versionCode: 33,
  versionName: "1.3.7",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.3.7/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "1.3.7 Hardened release: R8 code and resource shrinking, a signed AAB alongside the APK, and an honest \"app build out of date\" banner when the server rejects this build's access token instead of quietly showing stale data as if it were offline. Web side: security headers, login throttling that survives serverless, robots noindex, 81 new tests and the lint gate switched back on.",
  mandatory: false,
  releasedAt: "2026-08-17T20:00:00Z",
} as const;
