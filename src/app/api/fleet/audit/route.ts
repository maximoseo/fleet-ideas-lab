import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { auditFleet, gapRadar, inventorySnapshot, AUDIT_BASIS } from "@/lib/ideas-engine";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const audits = auditFleet(FLEET_INVENTORY);
  const gaps = gapRadar(audits, FLEET_INVENTORY);
  return NextResponse.json({ audits, gaps, basis: AUDIT_BASIS, snapshot: inventorySnapshot(FLEET_INVENTORY) });
}
