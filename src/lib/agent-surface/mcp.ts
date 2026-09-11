import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { agentSurfaceConfigured, checkAgentKey } from "./auth";
import { audit } from "./audit";
import { takeAuthFailure, takeToken, rateLimitResponse } from "./ratelimit";
import { allRoutes, invoke, originOf } from "./rest";
import { toStandardSchema } from "./schema";
import { RouteError } from "./types";
import type { AppInfo, Route } from "./types";

/**
 * MCP endpoint (Streamable HTTP, stateless) generated from the same route
 * table as the REST API. Every tool = one route; writes require confirm: true.
 *
 * Auth: the same AGENT_API_KEY as REST. `initialize` and `tools/list` need a
 * valid key; without one → 401 (withMcpAuth, required: true). Empty key env →
 * 503 before anything else — never allow-all.
 */
export function buildMcpHandler(app: AppInfo, routes: Route[]): (req: Request) => Promise<Response> {
  const table = allRoutes(app, routes);

  const core = createMcpHandler(
    (server) => {
      for (const r of table) {
        server.registerTool(
          r.name,
          {
            title: r.name,
            description: r.write ? `${r.summary} WRITE — requires confirm: true.` : r.summary,
            inputSchema: toStandardSchema(r.input),
            annotations: { readOnlyHint: !r.write, destructiveHint: Boolean(r.write), idempotentHint: !r.write, openWorldHint: false },
          },
          async (args: Record<string, unknown>, ctx) => {
            const t0 = Date.now();
            const keyId = String(ctx.http?.authInfo?.clientId ?? "-");
            const origin = ctx.http?.authInfo?.extra?.origin ? String(ctx.http.authInfo.extra.origin) : `https://${app.hosts[0]}`;
            try {
              const result = await invoke(r, args ?? {}, { keyId, surface: "mcp", origin });
              audit({ surface: "mcp", op: r.name, keyId, status: 200, ms: Date.now() - t0 });
              return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 1) }] };
            } catch (e) {
              const status = e instanceof RouteError ? e.status : 500;
              const code = e instanceof RouteError ? e.code : "internal_error";
              const msg = e instanceof Error ? e.message : "internal_error";
              audit({ surface: "mcp", op: r.name, keyId, status, ms: Date.now() - t0 });
              if (status >= 500) console.error("agent-surface mcp error", r.name, msg);
              // 4xx carry their message (validation, not-found, confirm); 5xx detail stays in the log
              return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(status < 500 ? { error: code, message: msg.slice(0, 300) } : { error: code }) }] };
            }
          },
        );
      }
    },
    {
      serverInfo: { name: app.id, version: "1.0.0" },
      instructions: `${app.name} agent surface. Read tools are safe to call freely; tools marked WRITE need confirm: true. Same operations as the REST API at /api/v1 (OpenAPI at /api/openapi.json).`,
      verboseLogs: false,
    },
  );

  const authed = withMcpAuth(
    core,
    (req) => {
      const r = checkAgentKey(req);
      if (r.ok !== true) return undefined;
      return { token: r.keyId, clientId: r.keyId, scopes: ["agent"], extra: { origin: originOf(req, app) } };
    },
    { required: true },
  );

  return async (req: Request) => {
    const t0 = Date.now();
    if (!agentSurfaceConfigured()) {
      audit({ surface: "mcp", op: "http", keyId: "-", status: 503, ms: Date.now() - t0 });
      return new Response(JSON.stringify({ error: "agent surface not configured" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    const auth = checkAgentKey(req);
    if (auth.ok === true) {
      const rate = takeToken(auth.keyId);
      if (!rate.allowed) {
        audit({ surface: "mcp", op: "http", keyId: auth.keyId, status: 429, ms: Date.now() - t0 });
        return rateLimitResponse(rate);
      }
    } else {
      const brake = takeAuthFailure(req);
      if (!brake.allowed) {
        audit({ surface: "mcp", op: "http", keyId: "-", status: 429, ms: Date.now() - t0 });
        return rateLimitResponse(brake);
      }
    }
    let op = req.method.toLowerCase();
    if (req.method === "POST") {
      try {
        const body = await req.clone().json();
        if (Array.isArray(body)) {
          // one operation per HTTP request, so the per-request token means one tool call
          audit({ surface: "mcp", op: "batch", keyId: auth.ok === true ? auth.keyId : "-", status: 400, ms: Date.now() - t0 });
          return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "JSON-RPC batches are not accepted; send one request per call" } }), { status: 400, headers: { "content-type": "application/json" } });
        }
        if (body && typeof body.method === "string") op = body.method;
      } catch {
        /* not JSON — the SDK answers */
      }
    }
    const res = await authed(req);
    audit({ surface: "mcp", op, keyId: auth.ok === true ? auth.keyId : "-", status: res.status, ms: Date.now() - t0 });
    return res;
  };
}
