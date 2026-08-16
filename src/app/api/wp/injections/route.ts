import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbPatch, sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Injection registry read/manage API.
 * GET    ?status=live → registry rows (default: all, newest first)
 * PATCH  {id, status: "removed"} → manual state correction (does NOT touch WP;
 *         actual rollback goes through DELETE /api/wp/inject)
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ injections: [], persisted: false });
  const status = req.nextUrl.searchParams.get("status");
  const q = status
    ? `select=*&status=eq.${encodeURIComponent(status)}&order=created_at.desc&limit=200`
    : "select=*&order=created_at.desc&limit=200";
  try {
    const injections = await sbSelect("fil_injections", q);
    return NextResponse.json({ injections, persisted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id || body.status !== "removed") {
    return NextResponse.json({ error: "id and status:'removed' required" }, { status: 400 });
  }
  try {
    await sbPatch("fil_injections", `id=eq.${encodeURIComponent(id)}`, {
      status: "removed",
      removed_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
