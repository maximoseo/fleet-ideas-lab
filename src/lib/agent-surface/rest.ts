import { requireAgentKey } from "./auth";
import { takeAuthFailure, takeToken, rateLimitResponse } from "./ratelimit";
import { audit } from "./audit";
import { parseInput } from "./schema";
import { RouteError } from "./types";
import type { AgentContext, AppInfo, Route } from "./types";

/** Version reported by /api/v1/health: the git sha Vercel stamped on the build. */
export function buildVersion(): string {
  return (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "unknown").slice(0, 40);
}

/** Write routes get `confirm: true` added to their schema exactly once, here. */
function withConfirm(r: Route): Route {
  if (!r.write) return r;
  const base = r.input ?? { type: "object" as const, properties: {}, additionalProperties: false };
  if (base.properties?.confirm) return r;
  return {
    ...r,
    input: {
      ...base,
      properties: { ...(base.properties ?? {}), confirm: { type: "boolean", description: "Must be true — this operation writes data." } },
      required: [...new Set([...(base.required ?? []), "confirm"])],
    },
  };
}

/** The route table plus the built-in health tool — the list every surface uses. */
export function allRoutes(app: AppInfo, routes: Route[]): Route[] {
  const health: Route = {
    name: "health",
    method: "GET",
    path: "/health",
    summary: `Health of the ${app.name} agent surface: ok, git sha, tool count.`,
    handler: async () => ({
      ok: true,
      app: app.id,
      version: buildVersion(),
      surface: "v1",
      tools: routes.length + 1,
      ts: new Date().toISOString(),
    }),
  };
  return [health, ...routes.map(withConfirm)];
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

// Callers hand over an encoded path (Next segments are re-encoded in the route file, Vite passes the
// raw pathname), so every parameter is decoded exactly once here.
function safeDecode(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

function matchPath(template: string, actual: string): Record<string, string> | null {
  const t = template.split("/").filter(Boolean);
  const a = actual.split("/").filter(Boolean);
  if (t.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < t.length; i++) {
    const seg = t[i];
    if (seg.startsWith("{") && seg.endsWith("}")) params[seg.slice(1, -1)] = safeDecode(a[i]);
    else if (seg !== a[i]) return null;
  }
  return params;
}

/** Request origin — only trusted when the host is one of the app's own hosts (or a Vercel preview). */
export function originOf(req: Request, app?: AppInfo): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host).toLowerCase();
  const hostname = host.replace(/:\d+$/, "");
  // own = configured hosts, this deployment's Vercel URLs, or a local run — never an arbitrary *.vercel.app
  const vercelOwn = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map((h) => String(h).toLowerCase());
  const own = !app || app.hosts.includes(hostname) || vercelOwn.includes(hostname) || hostname === "localhost" || hostname === "127.0.0.1";
  return own ? `${proto}://${host}` : `https://${app.hosts[0]}`;
}

/** Run one route with the shared gate: confirm for writes, then the handler. */
export async function invoke(route: Route, input: Record<string, unknown>, ctx: AgentContext): Promise<unknown> {
  if (route.write && input.confirm !== true) {
    throw new RouteError(400, "confirmation_required", `"${route.name}" is a write operation — resend with {"confirm": true}`);
  }
  return route.handler(input, ctx);
}

/**
 * REST dispatcher for /api/v1/<path>. `subPath` is the part after /api/v1.
 * Order: auth (401/503) → rate limit (429) → route match (404/405) → input (400) → handler.
 */
export async function handleRest(req: Request, app: AppInfo, routes: Route[], subPath: string): Promise<Response> {
  const t0 = Date.now();
  const table = allRoutes(app, routes);
  const path = "/" + subPath.replace(/^\/+|\/+$/g, "");
  const paramCount = (r: Route) => (r.path.match(/\{\w+\}/g) ?? []).length;
  const op = table.filter((r) => matchPath(r.path, path)).sort((a, b) => paramCount(a) - paramCount(b)).find((r) => r.method === req.method)?.name ?? path;
  const finish = (res: Response, keyId: string) => {
    audit({ surface: "rest", op, keyId, status: res.status, ms: Date.now() - t0 });
    return res;
  };

  const auth = requireAgentKey(req);
  if (auth.deny) {
    if (auth.deny.status === 503) return finish(auth.deny, "-"); // unconfigured: not a failed attempt
    const brake = takeAuthFailure(req);
    return finish(brake.allowed ? auth.deny : rateLimitResponse(brake), "-");
  }
  const rate = takeToken(auth.keyId);
  if (!rate.allowed) return finish(rateLimitResponse(rate), auth.keyId);

  // static segments beat {param} segments, so /sites/search wins over /sites/{id}
  const candidates = table.filter((r) => matchPath(r.path, path) !== null).sort((a, b) => paramCount(a) - paramCount(b));
  if (!candidates.length) return finish(json({ error: "not_found", path }, 404), auth.keyId);
  const route = candidates.find((r) => r.method === req.method);
  if (!route) return finish(json({ error: "method_not_allowed", allowed: candidates.map((r) => r.method) }, 405, { allow: candidates.map((r) => r.method).join(", ") }), auth.keyId);

  // null-prototype + own-key copy: a "__proto__" key in a body or query can never reach the prototype chain
  const raw: Record<string, unknown> = Object.create(null);
  const put = (k: string, v: unknown) => {
    if (k === "__proto__" || k === "constructor" || k === "prototype") return;
    raw[k] = v;
  };
  let fromQuery = true;
  if (req.method === "GET") {
    for (const [k, v] of new URL(req.url).searchParams) put(k, v);
  } else {
    fromQuery = false;
    try {
      const text = await req.text();
      if (text.trim()) {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return finish(json({ error: "invalid_json", message: "body must be a JSON object" }, 400), auth.keyId);
        for (const k of Object.keys(parsed)) put(k, (parsed as Record<string, unknown>)[k]);
      }
    } catch {
      return finish(json({ error: "invalid_json" }, 400), auth.keyId);
    }
  }
  for (const [k, v] of Object.entries(matchPath(route.path, path) ?? {})) put(k, v); // path params are authoritative
  // the confirm gate answers before field validation so an agent sees one clear reason
  if (route.write && raw.confirm !== true) {
    return finish(json({ error: "confirmation_required", message: `"${route.name}" is a write operation — resend with {"confirm": true}` }, 400), auth.keyId);
  }
  const { value, issues } = parseInput(route.input, raw, fromQuery);
  if (issues.length) return finish(json({ error: "invalid_input", issues }, 400), auth.keyId);

  const ctx: AgentContext = { keyId: auth.keyId, surface: "rest", origin: originOf(req, app) };
  try {
    const result = await invoke(route, value, ctx);
    return finish(json(result, 200, { "x-ratelimit-remaining": String(rate.remaining) }), auth.keyId);
  } catch (e) {
    if (e instanceof RouteError && e.status < 500) return finish(json({ error: e.code, message: e.message }, e.status), auth.keyId);
    // 5xx: detail goes to the runtime log only, never to the client
    const msg = e instanceof Error ? e.message : "internal_error";
    console.error("agent-surface rest error", route.name, msg);
    return finish(json({ error: e instanceof RouteError ? e.code : "internal_error" }, e instanceof RouteError ? e.status : 500), auth.keyId);
  }
}
