import { NextRequest, NextResponse } from "next/server";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { getHealthRows } from "@/lib/probes";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * APK feed: live inventory + probe health for the Android app.
 *
 * Public in the middleware sense (no session cookie on a phone), but guarded
 * by a dedicated APP_TOKEN bearer — revocable without touching the operator
 * password, and never the same credential as the dashboard login.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.APP_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "App feed not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Invalid app token" }, { status: 401 });
  }
  const health = await getHealthRows();
  const inventory = FLEET_INVENTORY.map((p) => ({
    slug: p.slug,
    name: p.name,
    url: p.url,
    domains: p.domains,
    capabilities: p.capabilities,
    plainExplainer: p.plainExplainer,
    live: health?.[p.slug]
      ? {
          state: health[p.slug].state,
          lastStatus: health[p.slug].last_status,
          latencyMs: health[p.slug].last_latency_ms,
          checkedAt: health[p.slug].updated_at,
        }
      : null,
  }));
  return NextResponse.json({ inventory, count: inventory.length, at: new Date().toISOString() });
}
