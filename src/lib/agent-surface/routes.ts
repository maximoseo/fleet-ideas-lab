import { FLEET_IDEAS, FLEET_GENERATED_POOL, FLEET_INVENTORY } from "../fleet";
import { auditFleet, gapRadar, generateIdeas, inventorySnapshot, AUDIT_BASIS } from "../ideas-engine";
import { effectiveStatus } from "../ideaStatus";
import { getHealthRows } from "../probes";
import { sbSelect, supabaseEnabled } from "../supabase";
import { RouteError } from "./types";
import type { AppInfo, Route } from "./types";

/**
 * THE route table for Fleet Ideas Lab. REST (/api/v1), OpenAPI (/api/openapi.json)
 * and MCP (/api/mcp) are generated from this list.
 *
 * Read-only, through the same library the page routes use: the fleet
 * inventory with live health, the audit scores + gap radar + generated
 * ideas (pure functions over the inventory), the curated idea board with
 * its Supabase statuses and the idea event log. Status transitions stay
 * a UI action.
 */
export const APP: AppInfo = {
  id: "fleet-ideas-lab",
  name: "Fleet Ideas Lab",
  hosts: ["fleet-ideas-lab.maximo-seo.ai"],
  description: "Fleet strategy lab: dashboard inventory with live health, capability audit and gap radar, idea board with statuses and events.",
};

type IdeaRow = { slug: string; title: string; payload: unknown; status: string; priority: string | null; effort: string | null; created_at: string; updated_at: string };

function requireDb() {
  if (!supabaseEnabled()) throw new RouteError(503, "not_configured", "Supabase is not configured on this deployment");
}

export const routes: Route[] = [
  {
    name: "list_inventory",
    method: "GET",
    path: "/inventory",
    summary: "The fleet inventory (slug, name, url, domains, capabilities, status) with live health when probes exist. `health` is the label frozen at the inventory snapshot; `live.state` is the current probe state; `snapshot` says how old the curated inventory is.",
    handler: async () => {
      const health = await getHealthRows();
      const items = FLEET_INVENTORY.map((p) => {
        const live = health?.[p.slug];
        return { ...p, live: live ? { state: live.state, lastStatus: live.last_status, latencyMs: live.last_latency_ms, checkedAt: live.updated_at, lastOkAt: live.last_ok_at } : null };
      });
      return { items, count: items.length, liveHealth: health !== null && Object.keys(health).length > 0, snapshot: inventorySnapshot(FLEET_INVENTORY) };
    },
  },
  {
    name: "fleet_audit",
    method: "GET",
    path: "/audit",
    summary: "Heuristic audit score per dashboard (declared capabilities, inventory snapshot age, static health label). Not measured usage or quality: see `basis` and `snapshot`.",
    handler: async () => {
      const items = auditFleet(FLEET_INVENTORY);
      return { items, count: items.length, basis: AUDIT_BASIS, snapshot: inventorySnapshot(FLEET_INVENTORY) };
    },
  },
  {
    name: "gap_radar",
    method: "GET",
    path: "/gaps",
    summary: "Gap radar: domains × capabilities coverage matrix across the fleet.",
    handler: async () => gapRadar(auditFleet(FLEET_INVENTORY), FLEET_INVENTORY),
  },
  {
    name: "generated_ideas",
    method: "GET",
    path: "/ideas/generated",
    summary: "Ideas generated from the gap radar (title, domain, kind, priority, effort).",
    handler: async () => {
      const items = generateIdeas(gapRadar(auditFleet(FLEET_INVENTORY), FLEET_INVENTORY), FLEET_INVENTORY);
      return { items, count: items.length };
    },
  },
  {
    name: "list_ideas",
    method: "GET",
    path: "/ideas",
    summary: "The idea board: curated + pooled ideas. `status` is the current pipeline status (the persisted board status when there is one, otherwise the seed mapped into the same vocabulary); `seed_status` is the raw value from the static seed; `board` carries the persisted row (status, updated_at) or null.",
    input: { type: "object", properties: { status: { type: "string", description: "filter by pipeline status (backlog / planned / building / shipped / archived)" } }, additionalProperties: false },
    handler: async (input) => {
      const curated = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL];
      let statuses: Record<string, IdeaRow> = {};
      let boardOk = false; // true only once the board statuses were actually read
      if (supabaseEnabled()) {
        try {
          const rows = await sbSelect<IdeaRow>("fil_ideas", "select=slug,title,payload,status,priority,effort,created_at,updated_at");
          statuses = Object.fromEntries(rows.map((r) => [r.slug, r]));
          boardOk = true;
        } catch (e) {
          // the curated list is still useful without the board; say so instead of failing the whole call
          console.error("agent-surface list_ideas: board read failed", e instanceof Error ? e.message : e);
        }
      }
      let items = curated.map((i) => {
        const row = statuses[i.slug];
        const board = row ? { status: row.status, updated_at: row.updated_at } : null;
        // `status` used to be the raw seed value (new / scoped …) next to a separate `board.status`,
        // so an idea moved on the board still read as "new" to anyone who looked at the top-level field.
        return { ...i, seed_status: i.status, status: effectiveStatus(i.status, board), board };
      });
      if (input.status) items = items.filter((i) => i.status === String(input.status));
      return { items, count: items.length, board: boardOk ? "ok" : supabaseEnabled() ? "unavailable" : "not configured" };
    },
  },
  {
    name: "list_idea_events",
    method: "GET",
    path: "/ideas/events",
    summary: "Idea status transitions (slug, from → to, note), newest first.",
    input: { type: "object", properties: { slug: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200, default: 50 } }, additionalProperties: false },
    handler: async (input) => {
      requireDb();
      const slug = input.slug ? `&slug=eq.${encodeURIComponent(String(input.slug))}` : "";
      const items = await sbSelect<Record<string, unknown>>("fil_idea_events", `select=id,slug,event,from_status,to_status,note,created_at${slug}&order=created_at.desc&limit=${Number(input.limit ?? 50)}`);
      return { items, count: items.length };
    },
  },
];
