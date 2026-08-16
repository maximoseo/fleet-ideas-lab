import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY } from "@/lib/fleet";
import { sbUpsert, supabaseEnabled } from "@/lib/supabase";
import { computeDrift, fetchVercelProjects, EXCLUDED_UTILITIES, type DriftReport } from "@/lib/vercel-sync";

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
    return NextResponse.json({ error: `vercel sync failed: ${(err as Error).message}` }, { status: 502 });
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
      console.warn("[sync] supabase upsert failed:", (err as Error).message);
    }
  }

  return NextResponse.json({ drift, synced, persisted: supabaseEnabled() });
}
