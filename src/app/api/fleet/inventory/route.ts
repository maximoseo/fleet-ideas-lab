import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  return NextResponse.json({ inventory: FLEET_INVENTORY, count: FLEET_INVENTORY.length });
}
