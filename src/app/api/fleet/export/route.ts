import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY, FLEET_IDEAS, FLEET_GENERATED_POOL } from "@/lib/fleet";
import { getHealthRows } from "@/lib/probes";
import { sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Full export/backup: inventory + ideas + pipeline events + live health. */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const health = await getHealthRows();
  let events: unknown[] = [];
  let alerts: unknown[] = [];
  if (supabaseEnabled()) {
    try {
      events = await sbSelect("fil_idea_events", "select=*&order=created_at.desc&limit=200");
      alerts = await sbSelect("fil_alerts", "select=*&order=sent_at.desc&limit=200");
    } catch (err) {
      console.warn("[export] read failed:", (err as Error).message);
    }
  }
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    inventory: FLEET_INVENTORY,
    ideas: [...FLEET_IDEAS, ...FLEET_GENERATED_POOL],
    liveHealth: health ?? {},
    ideaEvents: events,
    alerts,
  });
}
