import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY, FLEET_IDEAS, FLEET_GENERATED_POOL } from "@/lib/fleet";
import { auditFleet, gapRadar, generateIdeas } from "@/lib/ideas-engine";
import { sbInsertIgnore, sbSelect, supabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Static statuses → pipeline vocabulary. */
const STATUS_MAP: Record<string, string> = {
  new: "backlog",
  backlog: "backlog",
  scoped: "planned",
  shipped: "shipped",
};

interface IdeaRow {
  slug: string;
  title: string;
  status: string;
  priority: string | null;
  effort: string | null;
}

/**
 * Ideas = engine-generated list + curated pool, with DB-persisted pipeline
 * status when Supabase is on. First read seeds fil_ideas from the static
 * lists (upsert, never overwrites an operator's status change).
 */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const audits = auditFleet(FLEET_INVENTORY);
  const gaps = gapRadar(audits, FLEET_INVENTORY);
  const ideas = generateIdeas(gaps, FLEET_INVENTORY);

  let statuses: Record<string, string> = {};
  if (supabaseEnabled()) {
    try {
      const curated = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL];
      // Seed-missing-only: ignore-duplicates so an operator's status change is
      // never clobbered by the static map on the next read.
      await sbInsertIgnore(
        "fil_ideas",
        curated.map((i) => ({
          slug: i.slug,
          title: i.title,
          status: STATUS_MAP[i.status] ?? "backlog",
          priority: i.priority,
          effort: i.effort,
          payload: { domain: i.domain, kind: i.kind },
        })),
      );
      // Read back authoritative statuses after seeding.
      const rows = await sbSelect<IdeaRow>("fil_ideas", "select=slug,title,status,priority,effort");
      statuses = Object.fromEntries(rows.map((r) => [r.slug, r.status]));
    } catch (err) {
      console.warn("[ideas] supabase merge failed:", (err as Error).message);
    }
  }

  const withStatus = (list: typeof FLEET_IDEAS) =>
    list.map((i) => ({ ...i, pipelineStatus: statuses[i.slug] ?? STATUS_MAP[i.status] ?? "backlog" }));

  return NextResponse.json({
    ideas,
    curated: withStatus(FLEET_IDEAS),
    pool: withStatus(FLEET_GENERATED_POOL),
    gaps,
    count: ideas.length,
    persisted: supabaseEnabled(),
  });
}
