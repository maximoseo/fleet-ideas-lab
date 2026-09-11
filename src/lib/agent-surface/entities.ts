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

// Secret-ish column names by segment (split on _ - space / camelCase): a column is withheld when a
// segment is a secret word or a known pair (api key, private key, client secret, refresh token, app password,
// auth header, webhook url). Metrics like tokens_in / total_tokens / content_hash / session_id stay visible.
const SECRET_WORDS = new Set(["token", "secret", "secrets", "password", "passwords", "passwd", "apikey", "apikeys", "credential", "credentials", "cookie", "cookies", "salt", "bearer", "dsn", "ssh", "encrypted", "jwt", "authorization"]); // "tokens" stays out on purpose: tokens_in / total_tokens are metrics
const SECRET_PAIRS = new Set(["api key", "api keys", "private key", "private keys", "client secret", "refresh token", "refresh tokens", "access token", "access tokens", "app password", "auth header", "webhook url", "webhook urls", "signing key", "service key", "service keys", "service role"]);
// "<something>_key" is a credential (openrouter_key, bing_key, service_key…) unless the prefix is one of these non-secret senses
const SAFE_KEY_PREFIX = new Set(["kpi", "idempotency", "commit", "metric", "primary", "foreign", "sort", "cache", "finding", "row", "step", "event", "group", "partition", "translation", "i18n", "lookup", "dedupe", "dedup", "cursor", "page", "map", "column", "field", "prompt", "template", "feature", "flag", "config", "setting", "locale"]);
export function isSecretColumn(name: string): boolean {
  const segs = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (segs.some((w) => SECRET_WORDS.has(w))) return true;
  for (let i = 0; i + 1 < segs.length; i++) if (SECRET_PAIRS.has(`${segs[i]} ${segs[i + 1]}`)) return true;
  // "<something>_key" anywhere in the name (openrouter_key, bing_key_id, service_key_hash…) is a credential
  // unless the prefix is one of the non-secret senses above
  for (let i = 1; i < segs.length; i++) if ((segs[i] === "key" || segs[i] === "keys") && !SAFE_KEY_PREFIX.has(segs[i - 1])) return true;
  return false;
}
/** kept for callers that test a key name; prefer isSecretColumn() */
export const SECRET_COLUMN = { test: isSecretColumn };

export function redact<T>(row: T): T {
  return redactKeeping(row, undefined);
}
/** keep: top-level column names an entity declares non-secret (e.g. `token_usage` is a metric) — the heuristic still applies to nested objects */
export function redactKeeping<T>(row: T, keep: readonly string[] | undefined): T {
  if (!row || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map((v) => redactKeeping(v, keep)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (isSecretColumn(k) && !keep?.includes(k)) continue;
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
  /** equality filters exposed as query params, e.g. ["status", "client_id", "active:boolean", "rating:integer"] */
  filters?: string[];
  /** soft-delete guard: columns that must be NULL on every row returned, e.g. ["deleted_at"] */
  isNull?: string[];
  /** fixed equality predicates applied to every query (list, get, search, stats) — ownership scope the caller cannot widen, e.g. { kind: "ca_single" } */
  where?: Record<string, string | number | boolean>;
  /** columns to count by in <entity>_stats, e.g. ["status"] */
  groupBy?: string[];
  maxLimit?: number;
  /** skip some of the four routes */
  only?: ("list" | "get" | "search" | "stats")[];
  /** post-process rows (after redact) */
  map?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** columns whose name looks secret but is a metric/label the UI shows (token_usage…); listed per entity, on purpose */
  keepColumns?: string[];
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
  const guard = (q: Q): Q => {
    let g = (spec.isNull ?? []).reduce((acc, c) => acc.is(c, null), q);
    for (const [c, v] of Object.entries(spec.where ?? {})) g = g.eq(c, v);
    return g;
  };
  // "col" or "col:boolean|integer|number" — the type drives validation and coercion, so an agent can pass true / 5
  const filterSpecs = (spec.filters ?? []).map((f) => {
    const [name, t] = f.split(":");
    const type = t === "boolean" || t === "integer" || t === "number" ? t : "string";
    return { name, type } as { name: string; type: "string" | "boolean" | "integer" | "number" };
  });
  const finish = (rows: unknown[]) => rows.map((r) => redactKeeping(r as Record<string, unknown>, spec.keepColumns)).map((r) => (spec.map ? spec.map(r) : r));
  const routes: Route[] = [];

  if (want.has("list")) {
    const props: Record<string, { type: "integer" | "string" | "boolean" | "number"; description?: string; minimum?: number; maximum?: number; default?: unknown }> = {
      limit: { type: "integer", description: `rows to return (1–${maxLimit})`, minimum: 1, maximum: maxLimit, default: 25 },
      offset: { type: "integer", description: "rows to skip", minimum: 0, default: 0 },
    };
    for (const f of filterSpecs) props[f.name] = { type: f.type, description: `filter: ${f.name} equals` };
    routes.push({
      name: `list_${spec.entity}`,
      method: "GET",
      path: base,
      summary: `List ${spec.summary} (ordered by ${orderCol} ${spec.ascending ? "ascending" : "descending"}, paginated).`,
      input: { type: "object", properties: props, additionalProperties: false },
      handler: async (input) => {
        // the schema already rejects non-integers / out-of-range values; clamp anyway so a handler called directly stays safe
        const limit = Math.max(1, Math.min(Math.trunc(Number(input.limit ?? 25)) || 25, maxLimit));
        const offset = Math.max(0, Math.trunc(Number(input.offset ?? 0)) || 0);
        let q = guard(db().from(spec.table).select(select, { count: "exact" }));
        for (const f of filterSpecs) if (input[f.name] !== undefined && input[f.name] !== "") q = q.eq(f.name, input[f.name]);
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
        const limit = Math.max(1, Math.min(Math.trunc(Number(input.limit ?? 25)) || 25, maxLimit));
        // strip PostgREST filter syntax: wildcards, list/group separators, quoting, escapes and the dotted operator form
        const needle = String(input.q).replace(/[%_*,()."\\:]/g, " ").replace(/\s+/g, " ").trim();
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
          if (isSecretColumn(col) && !spec.keepColumns?.includes(col)) continue; // never group by (= enumerate) a secret-looking column
          const { data, error: e2 } = await guard(db().from(spec.table).select(col)).limit(SCAN_CAP);
          if (e2) fail(e2);
          // truncated when the scan holds fewer rows than the authoritative count (our cap or PostgREST's max-rows)
          const scanned = ((data as unknown[]) ?? []).length;
          if (scanned < (count ?? 0)) truncated = true;
          const c: Record<string, number> = {};
          for (const row of (data as Record<string, unknown>[]) ?? []) {
            const v = row[col];
            const k = v === null || v === undefined ? "<null>" : String(v); // SQL NULL never collides with the string "null"
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
