import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { getHealthRows } from "@/lib/probes";
import { supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Inventory = curated snapshot (fleet.ts) merged with LIVE probe state when
 * persistence is available. Static health stays as the fallback so the UI
 * never regresses when Supabase is down.
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const health = await getHealthRows();
  const inventory = FLEET_INVENTORY.map((p) => {
    const live = health[p.slug];
    return {
      ...p,
      live: live
        ? {
            state: live.state,
            lastStatus: live.last_status,
            latencyMs: live.last_latency_ms,
            checkedAt: live.updated_at,
            lastOkAt: live.last_ok_at,
          }
        : null,
    };
  });
  return NextResponse.json({
    inventory,
    count: inventory.length,
    liveHealth: supabaseEnabled() && Object.keys(health).length > 0,
  });
}
