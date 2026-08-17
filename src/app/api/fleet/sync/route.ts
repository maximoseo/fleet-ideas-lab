import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/observability";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { sbUpsert, supabaseEnabled } from "@/lib/supabase";
import { computeDrift, fetchVercelProjects, EXCLUDED_UTILITIES, type DriftReport } from "@/lib/vercel-sync";
import { rollupProbes } from "@/lib/probes";

export const runtime = "nodejs";
export const maxDuration = 60;

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Nightly sync: Vercel projects → fil_projects (upsert, fail-open — a Vercel
 * API failure never wipes the last good snapshot), plus the drift report.
 */
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    try {
      await requireUser();
    } catch {
      return unauthorized();
    }
  }

  let drift: DriftReport;
  try {
    drift = await computeDrift();
  } catch (err) {
    reportError(err, { route: "/api/fleet/sync", meta: { stage: "compute-drift" } });
    return NextResponse.json({ error: "Vercel sync failed" }, { status: 502 });
  }

  let synced = 0;
  if (supabaseEnabled()) {
    try {
      const projects = await fetchVercelProjects();
      const dashboards = projects.filter((p) => !EXCLUDED_UTILITIES.has(p.name));
      const curated = new Map(FLEET_INVENTORY.map((p) => [p.slug, p]));
      await sbUpsert(
        "fil_projects",
        dashboards.map((p) => {
          const alias = p.targets?.production?.alias?.[0];
          const curatedEntry = curated.get(p.name);
          return {
            slug: p.name,
            name: curatedEntry?.name ?? p.name,
            url: alias ? `https://${alias}` : curatedEntry?.url ?? null,
            domains: curatedEntry?.domains ?? [],
            capabilities: curatedEntry?.capabilities ?? [],
            description: curatedEntry?.description ?? null,
            plain_explainer: curatedEntry?.plainExplainer ?? null,
            source: "vercel-sync",
            vercel_updated_at: new Date(p.updatedAt).toISOString(),
            last_seen_at: new Date().toISOString(),
          };
        }),
        "slug",
      );
      synced = dashboards.length;
    } catch (err) {
      reportError(err, { route: "/api/fleet/sync", meta: { stage: "upsert" } });
    }
  }

  // Housekeeping on the same daily tick: roll finished days into
  // fil_probe_daily and drop raw probe rows past the retention window.
  // Never allowed to fail the sync — a full table is a slow problem, a broken
  // cron is an immediate one.
  const rollup = await rollupProbes().catch(() => null);

  return NextResponse.json({ drift, synced, persisted: supabaseEnabled(), rollup });
}
