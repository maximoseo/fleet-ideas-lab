import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbDelete, sbInsert, sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Server-backed favorites (idea slugs). The client keeps localStorage as an
 * offline cache and merges — this is the sync layer that finally reaches the
 * APK and other devices.
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ favorites: [], persisted: false });
  try {
    const rows = await sbSelect<{ idea_slug: string; created_at: string }>(
      "fil_favorites",
      "select=idea_slug,created_at&order=created_at.desc",
    );
    return NextResponse.json({ favorites: rows.map((r) => r.idea_slug), persisted: true });
  } catch (err) {
    console.warn("[favorites] read failed:", (err as Error).message);
    return NextResponse.json({ error: "Favorites store unavailable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || "");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  try {
    await sbInsert("fil_favorites", { idea_slug: slug });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Duplicate favorite is idempotent-success for the operator.
    if ((err as Error).message.includes("409") || (err as Error).message.includes("duplicate")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.warn("[favorites] write failed:", (err as Error).message);
    return NextResponse.json({ error: "Favorites store unavailable" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  try {
    await sbDelete("fil_favorites", `idea_slug=eq.${encodeURIComponent(slug)}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[favorites] delete failed:", (err as Error).message);
    return NextResponse.json({ error: "Favorites store unavailable" }, { status: 502 });
  }
}
