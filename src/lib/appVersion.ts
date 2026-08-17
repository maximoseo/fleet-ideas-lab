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
  versionCode: 34,
  versionName: "1.3.8",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.3.8/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "1.3.8 Security review follow-ups: the app now stores your password only when biometric unlock is actually available, logout clears the saved username as well as the password, and a rejected access token says so plainly instead of looking like being offline. Carries 1.3.7's R8 shrinking (APK 2.9 MB, down from 15 MB) and the signed AAB.",
  mandatory: false,
  releasedAt: "2026-08-17T20:30:00Z",
} as const;
