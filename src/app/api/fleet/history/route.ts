import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbInsert, sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Fleet history — the probe archive. Replaces the old hostinger-json file
 * path (unreadable on Vercel) and the dead supabase-js dynamic import.
 * GET returns recent probe runs; POST appends an operator event
 * (e.g. scaffold) to the analyses log.
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
    console.warn("[fleet-history] read failed:", (err as Error).message);
    return NextResponse.json({ error: "History store unavailable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ ok: false, persisted: false });
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "event").slice(0, 40);
  const title = String(body.title || body.slug || kind).slice(0, 200);
  const serialized = JSON.stringify(body.payload ?? body);
  if (serialized.length > 20_000) {
    return NextResponse.json({ error: "payload too large (20KB max)" }, { status: 413 });
  }
  try {
    await sbInsert("fil_analyses", { url: `fleet://${kind}/${title}`, payload: JSON.parse(serialized) });
    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    console.warn("[fleet-history] write failed:", (err as Error).message);
    return NextResponse.json({ ok: false, persisted: false });
  }
}
