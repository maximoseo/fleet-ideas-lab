import { handleRest } from "../../../../../src/lib/agent-surface/rest";
import { APP, routes } from "../../../../../src/lib/agent-surface/routes";

// Agent surface — REST. Every operation comes from lib/agent-surface/routes.ts;
// the same table generates /api/openapi.json and the MCP tools at /api/mcp.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path?: string[] }> };

async function handler(req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  // Next hands segments decoded; re-encode so the dispatcher decodes each parameter exactly once.
  return handleRest(req, APP, routes, "/" + (path ?? []).map(encodeURIComponent).join("/"));
}

export { handler as GET, handler as POST };
