import { allRoutes } from "./rest";
import type { AppInfo, JsonSchema, Route } from "./types";

/**
 * OpenAPI 3.1 document generated from the route table. Served without a key
 * (it contains no secrets) so n8n / Pipedream / Make / ChatGPT Actions can
 * import it. Write operations carry `x-write: true` and require
 * `{"confirm": true}` in the body.
 */
export function buildOpenApi(app: AppInfo, routes: Route[], origin: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of allRoutes(app, routes)) {
    const pathParams = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const props = r.input?.properties ?? {};
    const required = new Set(r.input?.required ?? []);
    const op: Record<string, unknown> = {
      operationId: r.name,
      summary: r.summary,
      description: r.description ?? r.summary,
      tags: [r.write ? "write" : "read"],
      "x-write": Boolean(r.write),
      responses: {
        "200": { description: "OK", content: { "application/json": { schema: r.output ?? { type: "object" } } } },
        "400": { description: "Invalid input, or a write called without confirm: true" },
        "401": { description: "Missing or invalid key" },
        "429": { description: "Rate limited (60 requests / minute)" },
        "503": { description: "Agent surface not configured on this deployment" },
      },
    };
    const parameters: unknown[] = pathParams.map((p) => ({ name: p, in: "path", required: true, schema: { type: "string" } }));
    if (r.method === "GET") {
      for (const [k, s] of Object.entries(props)) {
        if (pathParams.includes(k)) continue;
        parameters.push({ name: k, in: "query", required: required.has(k), description: s.description, schema: stripDesc(s) });
      }
    } else {
      const bodyProps: Record<string, JsonSchema> = {};
      for (const [k, s] of Object.entries(props)) if (!pathParams.includes(k)) bodyProps[k] = s;
      const bodyRequired = [...required].filter((k) => !pathParams.includes(k));
      op.requestBody = {
        required: Boolean(bodyRequired.length),
        content: { "application/json": { schema: { type: "object", properties: bodyProps, required: bodyRequired.length ? bodyRequired : undefined, additionalProperties: r.input?.additionalProperties } } },
      };
    }
    if (parameters.length) op.parameters = parameters;
    paths[r.path] ??= {};
    paths[r.path][r.method.toLowerCase()] = op;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: `${app.name} — agent API`,
      version: "1.0.0",
      description: app.description ?? `Read/act on ${app.name} from any agent. Same operations as the MCP endpoint at ${origin}${app.mcpPath ?? "/api/mcp"}.`,
    },
    servers: [{ url: `${origin}/api/v1` }],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Authorization: Bearer <AGENT_API_KEY>" },
        apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      },
    },
    paths,
    "x-mcp": { url: `${origin}${app.mcpPath ?? "/api/mcp"}`, transport: "streamable-http", auth: "bearer" },
  };
}

function stripDesc(s: JsonSchema): JsonSchema {
  const { description: _d, ...rest } = s;
  void _d;
  return rest;
}
