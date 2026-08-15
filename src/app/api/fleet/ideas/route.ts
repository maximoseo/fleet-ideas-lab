import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { auditFleet, gapRadar, generateIdeas } from "@/lib/ideas-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const audits = auditFleet(FLEET_INVENTORY);
  const gaps = gapRadar(audits, FLEET_INVENTORY);
  const ideas = generateIdeas(gaps, FLEET_INVENTORY);
  return NextResponse.json({ ideas, gaps, count: ideas.length });
}
