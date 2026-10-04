#!/usr/bin/env node
/**
 * Post-deploy check: /api/v1/health must say what is running.
 *
 *   AGENT_API_KEY=... node scripts/smoke-health-version.mjs <baseUrl> [expectedSha]
 *
 * Exit 1 when the version is "unknown" (nothing stamped the build) or, if an
 * expected sha is given, when the reported version does not start with it.
 * The key is read from the environment and never printed.
 */
const [baseUrl, expected] = process.argv.slice(2);
const key = process.env.AGENT_API_KEY;
if (!baseUrl || !key) {
  console.error("usage: AGENT_API_KEY=... node scripts/smoke-health-version.mjs <baseUrl> [expectedSha]");
  process.exit(2);
}
const res = await fetch(new URL("/api/v1/health", baseUrl), { headers: { Authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`health returned HTTP ${res.status}`);
  process.exit(1);
}
const body = await res.json();
const version = String(body.version ?? "");
console.log(`health ok=${body.ok} version=${version}`);
if (!version || version === "unknown") {
  console.error("FAIL: version is unknown, the deploy carried no commit sha (pass --build-env GIT_COMMIT_SHA=$(git rev-parse HEAD))");
  process.exit(1);
}
if (expected && !version.startsWith(expected.slice(0, version.length))) {
  console.error(`FAIL: deployed ${version} does not match expected ${expected.slice(0, 12)}`);
  process.exit(1);
}
console.log("PASS");
