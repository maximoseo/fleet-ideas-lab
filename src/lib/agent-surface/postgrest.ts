import type { Db } from "./entities";

/**
 * Minimal PostgREST client shaped like the supabase-js query builder subset
 * that entities.ts uses — for apps that talk to Supabase over plain fetch and
 * do not ship @supabase/supabase-js. Same auth the app's own helper uses
 * (service role via apikey + Bearer); the caller supplies url + key getters.
 */
type Result = { data: unknown; error: { message: string } | null; count?: number | null };

class Query implements PromiseLike<Result> {
  private params: string[] = [];
  private cols = "*";
  private wantCount = false;
  private head = false;
  private lim: number | null = null;
  private rng: [number, number] | null = null;
  constructor(private base: string, private key: string, private table: string, private schema?: string) {}
  select(cols: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    this.cols = cols.replace(/\s+/g, "");
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  eq(col: string, v: unknown) { this.params.push(`${col}=eq.${encodeURIComponent(String(v))}`); return this; }
  is(col: string, v: null | boolean) { this.params.push(`${col}=is.${v === null ? "null" : String(v)}`); return this; }
  ilike(col: string, v: string) { this.params.push(`${col}=ilike.${encodeURIComponent(v)}`); return this; }
  or(f: string) { this.params.push(`or=(${encodeURIComponent(f).replace(/%2C/g, ",")})`); return this; } // keep %25: a raw % in the query string is a 500 at the edge
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.params.push(`order=${col}.${opts?.ascending ? "asc" : "desc"}.${opts?.nullsFirst ? "nullsfirst" : "nullslast"}`);
    return this;
  }
  range(from: number, to: number) { this.rng = [from, to]; return this; }
  limit(n: number) { this.lim = n; return this; }
  private async run(): Promise<Result> {
    const url = `${this.base}/rest/v1/${this.table}?select=${encodeURIComponent(this.cols)}${this.params.length ? "&" + this.params.join("&") : ""}${this.lim !== null ? `&limit=${this.lim}` : ""}`;
    const headers: Record<string, string> = { apikey: this.key, Authorization: `Bearer ${this.key}`, Accept: "application/json" };
    if (this.schema) headers["Accept-Profile"] = this.schema; // tables outside public
    const prefer: string[] = [];
    if (this.wantCount) prefer.push("count=exact");
    if (prefer.length) headers.Prefer = prefer.join(",");
    if (this.rng) headers.Range = `${this.rng[0]}-${this.rng[1]}`;
    if (this.head) headers.Range = "0-0";
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok && res.status !== 206) return { data: null, error: { message: `postgrest ${res.status}` } };
    const cr = res.headers.get("content-range") ?? "";
    const m = /\/(\d+|\*)$/.exec(cr);
    const count = m && m[1] !== "*" ? Number(m[1]) : null;
    const data = this.head ? [] : ((await res.json()) as unknown);
    return { data, error: null, count };
  }
  then<T1 = Result, T2 = never>(onfulfilled?: ((v: Result) => T1 | PromiseLike<T1>) | null, onrejected?: ((e: unknown) => T2 | PromiseLike<T2>) | null): PromiseLike<T1 | T2> {
    return this.run().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export function postgrestDb(base: () => string, key: () => string, opts?: { schema?: string }): Db {
  return { from: (table: string) => new Query(base().replace(/\/$/, ""), key(), table, opts?.schema) as unknown as ReturnType<Db["from"]> };
}
