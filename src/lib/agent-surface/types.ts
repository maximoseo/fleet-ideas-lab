/**
 * Fleet agent surface — shared types.
 *
 * One route table (routes.ts) drives three things: the REST routes under
 * /api/v1, the OpenAPI 3.1 document at /api/openapi.json and the MCP tools at
 * /api/mcp. Nothing else declares an operation.
 */

/** A deliberately small JSON-schema subset: enough for tool arguments. */
export type JsonSchema = {
  type?: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
};

export type ObjectSchema = JsonSchema & { type: "object"; properties: Record<string, JsonSchema> };

export type AgentContext = {
  /** first 6 hex chars of sha256(key) — never the key */
  keyId: string;
  surface: "rest" | "mcp";
  origin: string;
};

export type RouteHandler = (input: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;

export type Route = {
  /** tool / operationId: list_<entity>, get_<entity>, search_<entity>, <entity>_stats, create_<entity>, run_<action> */
  name: string;
  method: "GET" | "POST";
  /** relative to /api/v1 — may contain {param} segments */
  path: string;
  /** one line an agent can act on */
  summary: string;
  description?: string;
  /** write tools require { confirm: true } and are marked x-write in OpenAPI */
  write?: boolean;
  input?: ObjectSchema;
  output?: JsonSchema;
  handler: RouteHandler;
};

export type AppInfo = {
  /** Vercel project / registry id */
  id: string;
  /** human name shown in OpenAPI + MCP serverInfo */
  name: string;
  /** production hosts, first one is canonical */
  hosts: string[];
  description?: string;
  /** where the standard MCP handler is mounted; default /api/mcp (override when the app already owns that path) */
  mcpPath?: string;
};

export class RouteError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}
