import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Fleet history — the probe archive. Replaces the old hostinger-json file
 * path (unreadable on Vercel) and the dead supabase-js dynamic import.
 * Returns recent probe runs aggregated per day per state.
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ entries: [], persisted: false });
  try {
    const probes = await sbSelect<{ slug: string; checked_at: string; ok: boolean; status: number | null; latency_ms: number | null }>(
      "fil_probes",
      "select=slug,checked_at,ok,status,latency_ms&order=checked_at.desc&limit=500",
    );
    return NextResponse.json({ entries: probes, persisted: true, count: probes.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
