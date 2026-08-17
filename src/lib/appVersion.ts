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
  changelog:
    "1.5.0 Hebrew, a detail screen, and two things the app used to state untruthfully. At large text the fleet strip legend silently dropped a whole band, so a fleet with unknown dashboards reported as if it had none. In Hebrew the health rail did not mirror, so a low score sat where a high one belongs. Both fixed and both now covered by tests that fail if they come back. New: full Hebrew interface, a per-dashboard detail screen with probe history and p50/p95 latency, search across the 38 dashboards, two-column layout on tablets and landscape, an offline queue for actions taken with no signal, and one emphasis level so the worst dashboard actually stands out.",
  mandatory: false,
  releasedAt: "2026-08-17T22:00:00Z",
} as const;
