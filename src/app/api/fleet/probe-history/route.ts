import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/** Probe history + current health for one dashboard (detail page). */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!supabaseEnabled()) return NextResponse.json({ probes: [], health: null, persisted: false });
  try {
    const probes = await sbSelect(
      "fil_probes",
      `select=checked_at,ok,status,latency_ms,error&slug=eq.${encodeURIComponent(slug)}&order=checked_at.desc&limit=50`,
    );
    const healthRows = await sbSelect(
      "fil_project_health",
      `select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    );
    return NextResponse.json({ probes, health: healthRows[0] ?? null, persisted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
