/**
 * Vercel fleet sync + drift detection.
 *
 * The curated overlay in `src/lib/fleet.ts` stays the source of domains,
 * capabilities and plain-English explainers; Vercel is the source of what
 * actually EXISTS. Drift = the difference, reported (never silently merged).
 */

import { FLEET_INVENTORY } from "@/lib/fleet";

const TEAM_ID = "team_NVnIOFO7th3wYtoyRoqJnLhr";

/** Utilities excluded from the fleet inventory in the 2026-08-15 audit. */
export const EXCLUDED_UTILITIES = new Set([
  "maximo-seo",
  "apk-download",
  "ronyb-deploy",
  "summit-garage-prototype",
  "seo-audit-report",
  "site-scan-fix",
  "todo-tasks",
  "to-do-tasks",
  "dp-work",
]);

export interface VercelProject {
  name: string;
  updatedAt: number;
  targets?: { production?: { alias?: string[] } };
}

export async function fetchVercelProjects(): Promise<VercelProject[]> {
  const token = process.env.VERCEL_READ_TOKEN;
  if (!token) throw new Error("VERCEL_READ_TOKEN not configured");
  const out: VercelProject[] = [];
  let until: number | undefined;
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ teamId: TEAM_ID, limit: "100" });
    if (until) qs.set("until", String(until));
    const res = await fetch(`https://api.vercel.com/v9/projects?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`vercel api ${res.status}`);
    const data = (await res.json()) as { projects: VercelProject[]; pagination?: { next?: number | null } };
    out.push(...data.projects);
    if (!data.pagination?.next) break;
    until = data.pagination.next;
  }
  return out;
}

export interface DriftReport {
  inVercelNotCurated: string[];
  curatedNotInVercel: string[];
  excludedUtilities: string[];
  vercelCount: number;
  curatedCount: number;
  at: string;
}

export async function computeDrift(): Promise<DriftReport> {
  const projects = await fetchVercelProjects();
  const dashboards = projects.filter((p) => !EXCLUDED_UTILITIES.has(p.name));
  const vercelNames = new Set(dashboards.map((p) => p.name));
  const curatedSlugs = new Set(FLEET_INVENTORY.map((p) => p.slug));
  return {
    inVercelNotCurated: [...vercelNames].filter((n) => !curatedSlugs.has(n)).sort(),
    curatedNotInVercel: [...curatedSlugs].filter((s) => !vercelNames.has(s)).sort(),
    excludedUtilities: projects.filter((p) => EXCLUDED_UTILITIES.has(p.name)).map((p) => p.name).sort(),
    vercelCount: dashboards.length,
    curatedCount: curatedSlugs.size,
    at: new Date().toISOString(),
  };
}
