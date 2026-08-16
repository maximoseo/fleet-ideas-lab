import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { computeDrift } from "@/lib/vercel-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

/** On-demand drift report for the UI (operator session). */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const drift = await computeDrift();
    return NextResponse.json({ drift });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
