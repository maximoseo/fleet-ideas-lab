import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 15;

/** Pipeline event feed — powers the changelog view. */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  if (!supabaseEnabled()) return NextResponse.json({ events: [], persisted: false });
  try {
    const events = await sbSelect(
      "fil_idea_events",
      "select=slug,event,from_status,to_status,note,created_at&order=created_at.desc&limit=50",
    );
    return NextResponse.json({ events, persisted: true });
  } catch (err) {
    console.warn("[idea-events] read failed:", (err as Error).message);
    return NextResponse.json({ error: "Event store unavailable" }, { status: 502 });
  }
}
