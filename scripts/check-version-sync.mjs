/**
 * Assert the served app version matches the Gradle build.
 *
 * `src/lib/appVersion.ts` is what `/api/app/version` and the in-app updater
 * read; `android/app/build.gradle.kts` is what the APK actually is. When they
 * disagree, every phone either sees no update or downloads a build that
 * reports a different version than it advertises.
 *
 * Usage: node scripts/check-version-sync.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function pick(text, pattern, label) {
  const m = text.match(pattern);
  if (!m) {
    console.error(`FAIL: could not read ${label}`);
    process.exit(1);
  }
  return m[1];
}

const ts = readFileSync(join(ROOT, "src", "lib", "appVersion.ts"), "utf8");
const gradle = readFileSync(join(ROOT, "android", "app", "build.gradle.kts"), "utf8");

const tsCode = pick(ts, /versionCode:\s*(\d+)/, "versionCode in appVersion.ts");
const tsName = pick(ts, /versionName:\s*"([^"]+)"/, "versionName in appVersion.ts");
const gradleCode = pick(gradle, /versionCode\s*=\s*(\d+)/, "versionCode in build.gradle.kts");
const gradleName = pick(gradle, /versionName\s*=\s*"([^"]+)"/, "versionName in build.gradle.kts");

let failures = 0;
if (tsCode !== gradleCode) {
  console.error(`FAIL versionCode: appVersion.ts=${tsCode} gradle=${gradleCode}`);
  failures++;
}
if (tsName !== gradleName) {
  console.error(`FAIL versionName: appVersion.ts=${tsName} gradle=${gradleName}`);
  failures++;
}

// The published APK URL must name the same version it serves.
const apkUrl = pick(ts, /apkUrl:\s*"([^"]+)"/, "apkUrl in appVersion.ts");
if (!apkUrl.includes(`/v${tsName}/`)) {
  console.error(`FAIL apkUrl does not point at v${tsName}: ${apkUrl}`);
  failures++;
}

// /api/app/download must not keep its own copy of the URL. It did twice, and
// once it pointed at a build whose signing key is lost.
const download = readFileSync(join(ROOT, "src", "app", "api", "app", "download", "route.ts"), "utf8");
if (/https:\/\/github\.com\/[^"']*app-release\.apk/.test(download)) {
  console.error("FAIL /api/app/download hardcodes an APK URL; import APP_VERSION instead");
  failures++;
}

if (failures) process.exit(1);
console.log(`version sync OK — ${tsName} (${tsCode})`);
