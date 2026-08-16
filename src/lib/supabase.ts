/**
 * Minimal server-side Supabase (PostgREST) client — no dependency.
 *
 * Server-only: uses the service-role key, which must NEVER reach the client
 * bundle or the APK. All tables are RLS-locked with grants to service_role
 * only, so this client is the sole data path.
 *
 * Disabled state is supported: when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * are unset every call returns the documented empty value and the app behaves
 * exactly as the pre-persistence version did.
 */

const URL = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function supabaseEnabled(): boolean {
  return Boolean(URL() && KEY());
}

interface SbOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Prefer header extras, e.g. resolution=merge-duplicates for upsert. */
  prefer?: string;
}

async function sb<T>(path: string, opts: SbOptions = {}): Promise<T | null> {
  if (!supabaseEnabled()) return null;
  const headers: Record<string, string> = {
    apikey: KEY(),
    Authorization: `Bearer ${KEY()}`,
    "Content-Type": "application/json",
  };
  if (opts.prefer) headers.Prefer = opts.prefer;
  const res = await fetch(`${URL()}/rest/v1/${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
    // A stalled PostgREST connection must never hold the function open.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`supabase ${opts.method || "GET"} ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T | null;
}

export async function sbSelect<T>(table: string, query = ""): Promise<T[]> {
  const rows = await sb<T[]>(`${table}${query ? `?${query}` : ""}`);
  return rows ?? [];
}

export async function sbInsert(table: string, rows: unknown | unknown[]): Promise<void> {
  await sb(table, { method: "POST", body: rows, prefer: "return=minimal" });
}

export async function sbUpsert(table: string, rows: unknown | unknown[], onConflict: string): Promise<void> {
  await sb(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function sbPatch(table: string, query: string, patch: unknown): Promise<void> {
  await sb(`${table}?${query}`, { method: "PATCH", body: patch, prefer: "return=minimal" });
}

export async function sbRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  return sb<T>(`rpc/${fn}`, { method: "POST", body: args });
}

/** Insert only rows whose PK is missing — existing rows stay untouched. */
export async function sbInsertIgnore(table: string, rows: unknown | unknown[]): Promise<void> {
  await sb(table, { method: "POST", body: rows, prefer: "resolution=ignore-duplicates,return=minimal" });
}

export async function sbDelete(table: string, query: string): Promise<void> {
  await sb(`${table}?${query}`, { method: "DELETE" });
}
