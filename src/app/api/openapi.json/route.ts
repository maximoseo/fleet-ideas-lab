import { buildOpenApi } from "../../../../src/lib/agent-surface/openapi";
import { originOf } from "../../../../src/lib/agent-surface/rest";
import { APP, routes } from "../../../../src/lib/agent-surface/routes";

// Public (no key): the document holds no secrets and agents/n8n/Pipedream import it.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  return new Response(JSON.stringify(buildOpenApi(APP, routes, originOf(req, APP)), null, 2), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300", vary: "host, x-forwarded-host, x-forwarded-proto" },
  });
}
