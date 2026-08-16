import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { runFleetProbes } from "@/lib/probes";
import { sendTelegramAlert } from "@/lib/alerting";
import { sbInsert, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Fleet probe runner. Two callers:
 *  - Vercel cron (Authorization: Bearer CRON_SECRET)
 *  - the operator, logged in (manual "probe now" from the UI)
 *
 * Sends Telegram alerts on confirmed state transitions. Roll-up rule: more
 * than 5 transitions in one run = one digest message (platform-wide incident
 * looks exactly like this; 38 separate pings would be a storm).
 */
function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!cronAuthorized(req)) {
    try {
      await requireUser();
    } catch {
      return unauthorized();
    }
  }

  const single = req.nextUrl.searchParams.get("slug");
  const targets = FLEET_INVENTORY.filter((p) => p.url && (!single || p.slug === single)).map((p) => ({
    slug: p.slug,
    name: p.name,
    url: p.url as string,
  }));

  const { probed, transitions, states, persisted } = await runFleetProbes(targets);

  // Alerting
  let alertSent = false;
  if (transitions.length > 0) {
    const downs = transitions.filter((t) => t.to === "down");
    const recoveries = transitions.filter((t) => t.to === "healthy");
    const lines: string[] = [];
    if (transitions.length > 5) {
      lines.push(`🚨 <b>Fleet roll-up:</b> ${transitions.length} dashboards changed state in one probe run.`);
      lines.push(`Down: ${downs.length} · Recovered: ${recoveries.length}`);
      for (const t of transitions.slice(0, 8)) lines.push(`• ${t.name}: ${t.from} → ${t.to}`);
      if (transitions.length > 8) lines.push(`…and ${transitions.length - 8} more. Check Fleet Ideas Lab.`);
    } else {
      for (const t of downs) {
        lines.push(`🔴 <b>${t.name}</b> is DOWN (${t.from} → down, HTTP ${t.status ?? "unreachable"})\n${t.url}`);
      }
      for (const t of recoveries) {
        lines.push(`✅ <b>${t.name}</b> recovered (${t.from} → healthy)\n${t.url}`);
      }
    }
    if (lines.length) {
      alertSent = await sendTelegramAlert(lines.join("\n"));
      if (supabaseEnabled()) {
        try {
          await sbInsert(
            "fil_alerts",
            transitions.map((t) => ({
              slug: t.slug,
              kind: t.to === "down" ? "down" : t.to === "healthy" ? "recovery" : "degraded",
              payload: { from: t.from, to: t.to, status: t.status, latencyMs: t.latencyMs, telegram: alertSent },
            })),
          );
        } catch (err) {
          console.warn("[probe] alert log failed:", (err as Error).message);
        }
      }
    }
  }

  return NextResponse.json({
    probed,
    transitions: transitions.length,
    down: Object.values(states).filter((s) => s === "down").length,
    degraded: Object.values(states).filter((s) => s === "degraded").length,
    alertSent,
    persisted,
    at: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
