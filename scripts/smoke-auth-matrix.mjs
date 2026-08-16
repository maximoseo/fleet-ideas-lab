/**
 * Auth-matrix smoke test — the regression net for the middleware allowlist.
 *
 * API routes are DERIVED from src/app/api (never a hand-maintained list), and
 * the public allowlist comes from the same src/lib/publicRoutes.json the
 * middleware reads — a new public route without an explicit allowlist entry
 * fails CI instead of shipping open.
 *
 * Usage: node scripts/smoke-auth-matrix.mjs [baseUrl]
 * Expects a running server with NO valid session cookie.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function findApiRoutes(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findApiRoutes(full));
    else if (entry === "route.ts" || entry === "route.tsx" || entry === "route.js") {
      out.push(full.slice(full.indexOf(`${join("src", "app")}`) + join("src", "app").length).replace(/\/route\.(ts|tsx|js)$/, ""));
    }
  }
  return out;
}

const API_ROUTES = findApiRoutes(join(ROOT, "src", "app", "api")).sort();
const publicRoutes = JSON.parse(readFileSync(join(ROOT, "src", "lib", "publicRoutes.json"), "utf8"));
const PUBLIC_ALLOWLIST = new Set(publicRoutes.exact.filter((p) => p.startsWith("/api/")));

console.log(`Discovered ${API_ROUTES.length} API routes; ${PUBLIC_ALLOWLIST.size} public.`);
let failures = 0;

for (const route of API_ROUTES) {
  let status;
  try {
    const res = await fetch(BASE + route, { redirect: "manual" });
    status = res.status;
    await res.text();
  } catch (err) {
    console.error(`FAIL ${route}: fetch error ${err.message}`);
    failures++;
    continue;
  }
  if (PUBLIC_ALLOWLIST.has(route)) {
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
