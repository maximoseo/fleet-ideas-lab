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
  versionCode: 35,
  versionName: "1.4.0",
  minSdk: 24,
  targetSdk: 36,
  apkUrl: "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.4.0/app-release.apk",
  fallbackUrl: "https://fleet-ideas-lab.maximo-seo.ai/api/app/download",
  changelog:
    "1.4.0 Visual release. Fleet strip on Inventory — one bar per dashboard, worst first, hatched for unknown, with the colour rule written out. Health tracks replace score badges so you compare by position, not by decoding a colour. Skeletons shaped like the row that is coming, everywhere a list used to appear blank. Inventory renders a page at a time instead of mounting all 38 cards. Favourites no longer flashes \"no favourites\" before the store answers. One staggered entrance animation, skipped entirely if you have animations turned off in Android settings.",
  mandatory: false,
  releasedAt: "2026-08-17T21:15:00Z",
} as const;
