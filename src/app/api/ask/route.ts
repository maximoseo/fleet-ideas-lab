import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_INVENTORY, FLEET_IDEAS, FLEET_GENERATED_POOL } from "@/lib/fleet";
import { getHealthRows } from "@/lib/probes";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Ask-AI over the fleet (Productboard-style "Ask AI" for the inventory).
 *
 * Provider policy: v0 only (subscription, zero on-demand balance) — the same
 * sanctioned provider as prototype generation. Per-token vendors are not
 * used. Answers are grounded in a compact fleet JSON snapshot; the model is
 * instructed to say "not in the data" rather than invent.
 */

const V0_CHATS_ENDPOINT = "https://api.v0.dev/v1/chats";
const ASK_MODEL = "v0-mini"; // fast + cheap for Q&A; generation stays on v0-max-fast

function buildFleetContext(health: Record<string, { state: string; last_status: number | null; last_latency_ms: number | null }>): string {
  const inventory = FLEET_INVENTORY.map((p) => ({
    slug: p.slug,
    name: p.name,
    url: p.url,
    domains: p.domains,
    capabilities: p.capabilities,
    staticHealth: p.health,
    lastDeploy: p.updated,
    live: health[p.slug] ?? null,
  }));
  const ideas = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL].map((i) => ({
    slug: i.slug,
    title: i.title,
    domain: i.domain,
    kind: i.kind,
    priority: i.priority,
    effort: i.effort,
    status: i.status,
    gapScore: i.gapScore,
  }));
  return JSON.stringify({ inventory, ideas });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  const key = process.env.V0_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Ask-AI is unavailable: no sanctioned LLM provider configured (v0 key missing).", code: "llm_unavailable" },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim().slice(0, 1000);
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const health = (await getHealthRows()) ?? {};
  const context = buildFleetContext(health as Record<string, { state: string; last_status: number | null; last_latency_ms: number | null }>);

  const message = [
    "You are the analyst inside Fleet Ideas Lab, an internal ops dashboard for a fleet of ~38 Vercel dashboards.",
    "Answer ONLY from the fleet JSON below. If the answer is not in the data, say exactly that — never invent metrics, dashboards, or states.",
    "Answer in the language of the question (Hebrew question → Hebrew answer). Be concise: 2-6 sentences or a tight bullet list. Reference dashboards by name.",
    "",
    "FLEET JSON:",
    context,
    "",
    "QUESTION:",
    question,
  ].join("\n");

  try {
    const res = await fetch(V0_CHATS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        modelConfiguration: { modelId: ASK_MODEL },
        responseMode: "sync",
        privacy: "private",
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Ask-AI provider error (${res.status}): ${text.slice(0, 200)}` }, { status: 502 });
    }
    const chat = (await res.json()) as { messages?: { role?: string; content?: string }[]; text?: string };
    const assistant = (chat.messages || []).filter((m) => m.role === "assistant");
    const answer = assistant.reverse().find((m) => m.content)?.content || chat.text || "";
    if (!answer) return NextResponse.json({ error: "Ask-AI returned an empty answer" }, { status: 502 });
    return NextResponse.json({ answer, model: ASK_MODEL, grounded: { dashboards: FLEET_INVENTORY.length, liveHealth: Object.keys(health).length } });
  } catch (err) {
    return NextResponse.json({ error: `Ask-AI failed: ${(err as Error).message}` }, { status: 502 });
  }
}
