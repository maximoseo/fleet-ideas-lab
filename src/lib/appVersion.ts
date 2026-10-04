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
  versionCode: 36,
  versionName: "1.5.0",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.5.0/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  /**
   * Public release notes. This object is served unauthenticated at
   * /api/app/version — the APK feed needs it, so it cannot be gated — which
   * means anything here is world-readable on an indexed host. Keep it to
   * user-visible change; internal postmortems belong in the repo, not in a
   * feed the whole internet can fetch.
   */
  changelog:
    "1.5.0 — full Hebrew interface, a per-dashboard detail screen with probe history and p50/p95 latency, search across the fleet, a two-column layout on tablets and landscape, and an offline queue for actions taken with no signal.",
  mandatory: false,
  releasedAt: "2026-08-17T22:00:00Z",
} as const;
