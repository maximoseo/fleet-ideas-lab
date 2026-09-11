import { buildMcpHandler } from "../../../../src/lib/agent-surface/mcp";
import { APP, routes } from "../../../../src/lib/agent-surface/routes";

// Agent surface — MCP (Streamable HTTP). Bearer AGENT_API_KEY required for
// every method including initialize and tools/list.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const handler = buildMcpHandler(APP, routes);

export { handler as GET, handler as POST };
