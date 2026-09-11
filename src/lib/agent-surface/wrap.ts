import { RouteError } from "./types";

/**
 * Reuse an existing Next.js route handler as an agent tool without going
 * through HTTP: build the Request the handler expects, call it, unwrap JSON.
 * The dashboard's own service code stays the single implementation.
 */
// Next types each handler's params precisely; `Promise<never>` accepts every such handler
// without `any`, and viaRoute passes the record the route expects.
export type NextRouteHandler = (req: Request, ctx: { params: Promise<never> }) => Promise<Response> | Response;

export async function viaRoute(
  handler: NextRouteHandler,
  opts: { origin: string; path?: string; params?: Record<string, string>; query?: Record<string, unknown>; method?: "GET" | "POST"; body?: unknown } ,
): Promise<unknown> {
  const url = new URL(opts.path ?? "/api/internal", opts.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const init: RequestInit = { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers: { accept: "application/json" } };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { ...init.headers, "content-type": "application/json" };
  }
  const res = await handler(new Request(url, init), { params: Promise.resolve(opts.params ?? {}) as Promise<never> });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body stays a string */
  }
  if (res.status < 200 || res.status >= 300) {
    const msg = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : `upstream ${res.status}`;
    if (res.status >= 500 || res.status < 400) {
      // 5xx and unexpected redirects: detail to the log, generic to the caller
      console.error("agent-surface viaRoute upstream error", res.status, msg.slice(0, 300));
      throw new RouteError(502, "upstream_error", "upstream route failed");
    }
    throw new RouteError(res.status, res.status === 404 ? "not_found" : "upstream_error", msg);
  }
  return data;
}
