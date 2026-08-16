import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbInsert, sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Analysis history — now actually persisted (fil_analyses), replacing the
 * dead dynamic-import path that no-op'd since day one. Client keeps its
 * localStorage copy as an offline cache and merges on read.
 */

export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ entries: [], supabase: false });
  try {
    const rows = await sbSelect<{ id: string; url: string; payload: Record<string, unknown>; created_at: string }>(
      "fil_analyses",
      "select=id,url,payload,created_at&order=created_at.desc&limit=20",
    );
    return NextResponse.json({ entries: rows, supabase: true });
  } catch (err) {
    console.warn("[history] read failed:", (err as Error).message);
    return NextResponse.json({ entries: [], supabase: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ ok: false, supabase: false });
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "").slice(0, 500);
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  // Cap the stored payload — a runaway client must not bloat the table.
  const payload = body.payload ?? { title: body.title, score: body.score, platform: body.platform };
  const serialized = JSON.stringify(payload ?? {});
  if (serialized.length > 50_000) {
    return NextResponse.json({ error: "payload too large (50KB max)" }, { status: 413 });
  }
  try {
    await sbInsert("fil_analyses", { url, payload: JSON.parse(serialized) });
    return NextResponse.json({ ok: true, supabase: true });
  } catch (err) {
    console.warn("[history] write failed:", (err as Error).message);
    return NextResponse.json({ ok: false, supabase: false });
  }
}
