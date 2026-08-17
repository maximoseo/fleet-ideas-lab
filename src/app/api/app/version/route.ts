import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/appVersion";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(APP_VERSION, {
    headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
