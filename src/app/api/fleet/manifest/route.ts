import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { appTokenRotationPending } from "@/lib/appToken";
import { APP_VERSION } from "@/lib/appVersion";

export const runtime = "nodejs";

/**
 * Agent manifest: machine-readable description of the fleet API surface.
 * Lets fleet agents (Hermes, Devin, Warp) discover inventory/gaps/health
 * endpoints without scraping the UI. Read-only by design.
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  return NextResponse.json({
    name: "fleet-ideas-lab",
    version: APP_VERSION.versionName,
    description: "Meta-dashboard API for the MaximoSEO fleet: inventory, live health, gap radar, idea pipeline.",
    auth: {
      session: "POST /api/auth/login {username,password,turnstileToken?} → dl_session cookie",
      app: "Authorization: Bearer <APP_TOKEN> for /api/app/fleet (APK/agent feed)",
      cron: "Authorization: Bearer <CRON_SECRET> for /api/fleet/probe, /api/fleet/sync",
    },
    // Operator reminder: APP_TOKEN_PREVIOUS is a rotation window, not a
    // permanent setting. Clear it once the new APK is installed.
    appTokenRotationPending: appTokenRotationPending(),
    endpoints: {
      "GET /api/fleet/inventory": "Curated inventory merged with live probe health",
      "GET /api/fleet/gaps": "Domain×capability gap matrix",
      "GET /api/fleet/ideas": "Engine ideas + curated pool with pipeline statuses",
      "POST /api/fleet/ideas/transition": "Move idea status (backlog|planned|building|shipped|archived)",
      "GET /api/fleet/ideas/events": "Pipeline event feed (changelog)",
      "GET /api/fleet/probe-history?slug=": "Probe history + health for one dashboard",
      "GET /api/fleet/drift": "Vercel↔curated inventory drift report",
      "GET /api/fleet/export": "Full JSON backup",
      "GET /api/app/fleet": "APK/agent feed (APP_TOKEN)",
    },
  });
}
