import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";

export const maxDuration = 30;

/**
 * Lovart hook stub.
 * If LOVART_API_KEY is present, would call the real Lovart image API.
 * Currently returns a placeholder so the UI flow works without credentials.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const body = await req.json() as { style?: string; url?: string };
    const style = body.style || "violet";

    const key = process.env.LOVART_API_KEY || process.env.LOVART_SK || "";
    if (key) {
      // Real call would go here — Lovart API endpoint varies by account tier.
      // Keep stub behavior but indicate key was found so the client can show richer UX.
      // Example placeholder that would become: const res = await fetch("https://api.lovart.ai/v1/generate", { ... })
      return NextResponse.json({
        placeholder: true,
        style,
        note: "LOVART_API_KEY is set — wire the real endpoint when ready",
      });
    }

    return NextResponse.json({ placeholder: true, style });
  } catch (err) {
    return NextResponse.json({ error: "Lovart generation failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
