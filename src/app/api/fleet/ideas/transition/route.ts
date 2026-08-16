import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbRpc, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

const ALLOWED = new Set(["backlog", "planned", "building", "shipped", "archived"]);

/**
 * Move an idea through the pipeline. Atomic via the fil_transition_idea RPC
 * (conditional update + append-only event in one transaction).
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "");
  const to = String(body.to || "");
  const note = body.note ? String(body.note).slice(0, 500) : null;
  if (!slug || !ALLOWED.has(to)) {
    return NextResponse.json({ error: "slug and a valid `to` status are required" }, { status: 400 });
  }
  try {
    const result = await sbRpc("fil_transition_idea", { p_slug: slug, p_to: to, p_note: note });
    return NextResponse.json({ ok: true, transition: result });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("idea not found")) return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
