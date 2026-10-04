#!/usr/bin/env node
/**
 * Drift check between the hand-curated FLEET_INVENTORY and the agent-surface registry.
 *
 *   doppler secrets get FLEET_AGENT_SURFACES_JSON --plain > /tmp/registry.json
 *   node scripts/check-inventory-vs-registry.mjs /tmp/registry.json
 *
 * Exit 1 when the registry has a surface that is neither in the inventory nor in
 * INVENTORY_EXCLUDED. Inventory slugs the registry does not know are only reported
 * (they may be aliases). The registry is not a build or runtime dependency on purpose:
 * it lives in Doppler and the app must keep working without it.
 */
import { readFileSync } from "node:fs";
const file = process.argv[2];
if (!file) { console.error("usage: node scripts/check-inventory-vs-registry.mjs <registry.json>"); process.exit(2); }
const reg = Object.keys(JSON.parse(readFileSync(file, "utf8")).dashboards);
const src = readFileSync(new URL("../src/lib/fleet.ts", import.meta.url), "utf8");
const inv = src.slice(src.indexOf("export const FLEET_INVENTORY"), src.indexOf("export const INVENTORY_EXCLUDED"));
const have = new Set([...inv.matchAll(/slug: "([a-z0-9-]+)", name:/g)].map((m) => m[1]));
const excl = src.slice(src.indexOf("export const INVENTORY_EXCLUDED"));
const excluded = new Set([...excl.slice(0, excl.indexOf("};")).matchAll(/"([a-z0-9-]+)":/g)].map((m) => m[1]));
const missing = reg.filter((s) => !have.has(s) && !excluded.has(s));
const unknown = [...have].filter((s) => !reg.includes(s));
console.log(`registry ${reg.length}, inventory ${have.size}, excluded ${excluded.size}`);
if (unknown.length) console.log("in inventory but not in registry (aliases?):", unknown.join(", "));
if (missing.length) { console.error("FAIL: in registry but not in inventory or exclusions:", missing.join(", ")); process.exit(1); }
console.log("PASS");
