/**
 * Auth-matrix smoke test — the regression net for the middleware allowlist.
 *
 * Asserts every /api route returns 401 without a session, EXCEPT the
 * documented public allowlist. One careless PUBLIC_EXACT addition must fail
 * CI, not ship — /api/wp/* writes to customer WordPress sites.
 *
 * Usage: node scripts/smoke-auth-matrix.mjs [baseUrl]
 * Expects a running server (CI boots `next start` first) with NO valid
 * session cookie — all requests are anonymous by construction.
 */

const BASE = process.argv[2] || "http://127.0.0.1:3000";

const API_ROUTES = [
  "/api/analyze",
  "/api/app/download",
  "/api/app/version",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/design-system",
  "/api/fleet/audit",
  "/api/fleet/drift",
  "/api/fleet/gaps",
  "/api/fleet/history",
  "/api/fleet/ideas",
  "/api/fleet/inventory",
  "/api/fleet/probe",
  "/api/fleet/scaffold",
  "/api/fleet/sync",
  "/api/generate-prototype",
  "/api/history",
  "/api/lovart",
  "/api/mockup",
  "/api/suggestions",
  "/api/wp/batch",
  "/api/wp/connect",
  "/api/wp/inject",
  "/api/wp/revisions",
  "/api/wp/theme-css",
];

/** Public without a session — must match middleware PUBLIC_EXACT exactly. */
const PUBLIC_ALLOWLIST = new Set([
  "/api/app/version",
  "/api/app/download",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
]);

let failures = 0;

for (const route of API_ROUTES) {
  let status;
  try {
    const res = await fetch(BASE + route, { redirect: "manual" });
    status = res.status;
    // Drain so the connection closes cleanly
    await res.text();
  } catch (err) {
    console.error(`FAIL ${route}: fetch error ${err.message}`);
    failures++;
    continue;
  }
  if (PUBLIC_ALLOWLIST.has(route)) {
    // Public routes must NOT be 401-from-middleware; their own status is fine
    // (login POST-only routes may 400/405 on a bare GET — that's their code, not the wall).
    console.log(`ok   ${route}: public (${status})`);
  } else if (status === 401) {
    console.log(`ok   ${route}: 401`);
  } else {
    console.error(`FAIL ${route}: expected 401 anonymous, got ${status}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} route(s) leaked past the auth wall.`);
  process.exit(1);
}
console.log(`\nAuth matrix OK: ${API_ROUTES.length - PUBLIC_ALLOWLIST.size} protected, ${PUBLIC_ALLOWLIST.size} public.`);
