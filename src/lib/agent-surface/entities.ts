import { RouteError } from "./types";
import type { Route } from "./types";

/**
 * Declarative read-only routes over one table, using the app's own server
 * client (the same one its internal API routes use). Generates:
 *   list_<entity>    GET  /<entity>            limit/offset/order + optional filters
 *   get_<entity>     GET  /<entity>/{id}
 *   search_<entity>  GET  /<entity>/search     q (ilike on searchColumns)
 *   <entity>_stats   GET  /<entity>/stats      total + counts per groupBy column
 *
 * Every row goes through redact(): columns whose name smells like a secret
 * are dropped before anything leaves the process.
 */

// Minimal structural view of the supabase-js query builder; keeps this file
// independent of the @supabase/supabase-js major each repo pins.
type Q = {
  select: (cols: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => Q;
  eq: (col: string, v: unknown) => Q;
  is: (col: string, v: null | boolean) => Q;
  ilike: (col: string, v: string) => Q;
  or: (f: string) => Q;
  order: (col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => Q;
  range: (from: number, to: number) => Q;
  limit: (n: number) => Q;
  then: <T>(cb: (r: { data: unknown; error: { message: string } | null; count?: number | null }) => T) => Promise<T>;
};
export type Db = { from: (table: string) => Q };

export const SECRET_COLUMN = /(token|secret|password|passwd|api_key|apikey|private_key|credential|cookie|session|salt|hash|auth_header|bearer|refresh|client_secret|encrypted|ssh|webhook_url|dsn)/i;

export function redact<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map((v) => redact(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (SECRET_COLUMN.test(k)) continue;
    out[k] = v && typeof v === "object" ? redact(v) : v;
  }
  return out as T;
}

export type EntitySpec = {
  /** singular-ish noun used in tool names and the path: tasks → list_tasks, /tasks */
  entity: string;
  /** path prefix when the app already owns /api/v1/<entity> with its own auth, e.g. "/agent" */
  pathPrefix?: string;
  table: string;
  summary: string;
  /** explicit column list when the table holds anything sensitive; default "*" (still redacted) */
  select?: string;
  idColumn?: string;
  /** ilike targets for search_<entity>; omit to skip the search route */
  searchColumns?: string[];
  orderBy?: string;
  ascending?: boolean;
  /** equality filters exposed as query params, e.g. ["status", "client_id"] */
  filters?: string[];
  /** soft-delete guard: columns that must be NULL on every row returned, e.g. ["deleted_at"] */
  isNull?: string[];
  /** columns to count by in <entity>_stats, e.g. ["status"] */
  groupBy?: string[];
  maxLimit?: number;
  /** skip some of the four routes */
  only?: ("list" | "get" | "search" | "stats")[];
  /** post-process rows (after redact) */
  map?: (row: Record<string, unknown>) => Record<string, unknown>;
};

function fail(e: { message: string } | null): never {
  throw new RouteError(502, "upstream_error", e?.message ?? "query failed");
}

export function entityRoutes(db: () => Db, spec: EntitySpec): Route[] {
  const id = spec.idColumn ?? "id";
  const select = spec.select ?? "*";
  const maxLimit = spec.maxLimit ?? 100;
  const orderCol = spec.orderBy ?? "created_at";
  const base = `${spec.pathPrefix ?? ""}/${spec.entity}`;
  const want = new Set(spec.only ?? ["list", "get", "search", "stats"]);
  const guard = (q: Q): Q => (spec.isNull ?? []).reduce((acc, c) => acc.is(c, null), q);
  const finish = (rows: unknown[]) => rows.map((r) => redact(r as Record<string, unknown>)).map((r) => (spec.map ? spec.map(r) : r));
  const routes: Route[] = [];

  if (want.has("list")) {
    const props: Record<string, { type: "integer" | "string" | "boolean"; description?: string; minimum?: number; maximum?: number; default?: unknown }> = {
      limit: { type: "integer", description: `rows to return (1–${maxLimit})`, minimum: 1, maximum: maxLimit, default: 25 },
      offset: { type: "integer", description: "rows to skip", minimum: 0, default: 0 },
    };
    for (const f of spec.filters ?? []) props[f] = { type: "string", description: `filter: ${f} equals` };
    routes.push({
      name: `list_${spec.entity}`,
      method: "GET",
      path: base,
      summary: `List ${spec.summary} (newest first, paginated).`,
      input: { type: "object", properties: props, additionalProperties: false },
      handler: async (input) => {
        const limit = Math.min(Number(input.limit ?? 25), maxLimit);
        const offset = Number(input.offset ?? 0);
        let q = guard(db().from(spec.table).select(select, { count: "exact" }));
        for (const f of spec.filters ?? []) if (input[f] !== undefined && input[f] !== "") q = q.eq(f, input[f]);
        q = q.order(orderCol, { ascending: spec.ascending ?? false, nullsFirst: false }).range(offset, offset + limit - 1);
        const { data, error, count } = await q;
        if (error) fail(error);
        const rows = finish((data as unknown[]) ?? []);
        return { items: rows, count: rows.length, total: count ?? null, limit, offset };
      },
    });
  }

  if (want.has("get")) {
    routes.push({
      name: `get_${spec.entity}`,
      method: "GET",
      path: `${base}/{id}`,
      summary: `Get one of ${spec.summary} by ${id}.`,
      input: { type: "object", properties: { id: { type: "string", description: `${id} of the row` } }, required: ["id"], additionalProperties: false },
      handler: async (input) => {
        const { data, error } = await guard(db().from(spec.table).select(select).eq(id, input.id)).limit(1);
        if (error) fail(error);
        const rows = finish((data as unknown[]) ?? []);
        if (!rows.length) throw new RouteError(404, "not_found", `${spec.entity} ${String(input.id)} not found`);
        return rows[0];
      },
    });
  }

  if (want.has("search") && spec.searchColumns?.length) {
    routes.push({
      name: `search_${spec.entity}`,
      method: "GET",
      path: `${base}/search`,
      summary: `Search ${spec.summary} by text (${spec.searchColumns.join(", ")}).`,
      input: {
        type: "object",
        properties: {
          q: { type: "string", description: "text to match (case-insensitive, substring)", minLength: 1, maxLength: 200 },
          limit: { type: "integer", minimum: 1, maximum: maxLimit, default: 25 },
        },
        required: ["q"],
        additionalProperties: false,
      },
      handler: async (input) => {
        const limit = Math.min(Number(input.limit ?? 25), maxLimit);
        const needle = String(input.q).replace(/[%_*,()]/g, " ").trim();
        if (!needle) return { items: [], count: 0, q: needle };
        const or = spec.searchColumns!.map((c) => `${c}.ilike.%${needle}%`).join(",");
        const { data, error } = await guard(db().from(spec.table).select(select).or(or)).order(orderCol, { ascending: spec.ascending ?? false, nullsFirst: false }).limit(limit);
        if (error) fail(error);
        const rows = finish((data as unknown[]) ?? []);
        return { items: rows, count: rows.length, q: needle };
      },
    });
  }

  if (want.has("stats")) {
    routes.push({
      name: `${spec.entity}_stats`,
      method: "GET",
      path: `${base}/stats`,
      summary: `Counts for ${spec.summary}${spec.groupBy?.length ? ` by ${spec.groupBy.join(", ")}` : ""}.`,
      handler: async () => {
        const { error, count } = await guard(db().from(spec.table).select(id, { count: "exact", head: true }));
        if (error) fail(error);
        const by: Record<string, Record<string, number>> = {};
        const SCAN_CAP = 5000;
        let truncated = false;
        for (const col of spec.groupBy ?? []) {
          const { data, error: e2 } = await guard(db().from(spec.table).select(col)).limit(SCAN_CAP);
          if (e2) fail(e2);
          if (((data as unknown[]) ?? []).length >= SCAN_CAP) truncated = true;
          const c: Record<string, number> = {};
          for (const row of (data as Record<string, unknown>[]) ?? []) {
            const k = String(row[col] ?? "null");
            c[k] = (c[k] ?? 0) + 1;
          }
          by[col] = c;
        }
        return { table: spec.entity, total: count ?? 0, by, by_truncated: truncated, by_scan_limit: SCAN_CAP };
      },
    });
  }

  return routes;
}
