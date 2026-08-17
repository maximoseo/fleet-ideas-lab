import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { FLEET_IDEAS, FLEET_GENERATED_POOL } from "@/lib/fleet";
import { buildAgentPrompt, buildImprovePrompt } from "@/lib/agentPrompt";

export const runtime = "nodejs";

const TG_LIMIT = 4096;
const TRUNCATE_AT = 3800;

function resolveToken(bot: string): string | null {
  if (bot === "coding") {
    return (
      process.env.TELEGRAM_NOTIFY64_TOKEN_CODING ||
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.TELEGRAM_NOTIFY64_TOKEN ||
      null
    );
  }
  // spark / default
  return process.env.TELEGRAM_NOTIFY64_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
}

function resolveChatId(explicit?: string): string {
  const raw = (explicit || process.env.TELEGRAM_NOTIFY64_CHAT || "6090160018").trim();
  // allow comma-separated fallback to first
  return raw.split(",")[0].trim() || "6090160018";
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as {
    ideaSlug?: string;
    ideaId?: string;
    mode?: string;
    bot?: string;
    chatId?: string;
  };

  const ideaSlug = (b.ideaSlug || "").trim();
  const ideaId = (b.ideaId || "").trim();
  const mode = (b.mode || "build").trim().toLowerCase() === "improve" ? "improve" : "build";
  const bot = (b.bot || "spark").trim().toLowerCase() === "coding" ? "coding" : "spark";

  if (!ideaSlug && !ideaId) {
    return NextResponse.json({ error: "ideaSlug or ideaId required" }, { status: 400 });
  }

  const pool = [...FLEET_IDEAS, ...FLEET_GENERATED_POOL];
  const idea =
    pool.find((x) => x.slug === ideaSlug) ||
    pool.find((x) => x.id === ideaId) ||
    pool.find((x) => x.id === ideaSlug) ||
    null;

  if (!idea) {
    return NextResponse.json({ error: `Idea not found: ${ideaSlug || ideaId}` }, { status: 404 });
  }

  const token = resolveToken(bot);
  if (!token) {
    return NextResponse.json({ error: "Telegram bot token not configured on server" }, { status: 500 });
  }

  const chatId = resolveChatId(b.chatId);

  let brief: string;
  try {
    brief = mode === "improve" ? buildImprovePrompt(idea) : buildAgentPrompt(idea);
  } catch (e) {
    return NextResponse.json({ error: `Failed to build brief: ${String(e)}` }, { status: 500 });
  }

  // Header for Telegram so the chat is instantly recognizable
  const header =
    `📨 Fleet Ideas Lab → @${bot === "coding" ? "CodingAgent64Bot" : "HermesAgent64SparkBot"}\n` +
    `Idea: ${idea.title} (${idea.slug}) · ${mode.toUpperCase()} · gap ${idea.gapScore}%\n` +
    `Source: ${idea.id} · fleet-ideas-lab\n` +
    `—\n\n`;

  let text = header + brief;
  let truncated = false;
  if (text.length > TG_LIMIT) {
    const tail = "\n\n…(truncated — copy BUILD/IMPROVE in app for full brief)";
    text = header + brief.slice(0, TRUNCATE_AT - header.length - tail.length) + tail;
    // hard cap
    if (text.length > TG_LIMIT) text = text.slice(0, TG_LIMIT - 3) + "…";
    truncated = true;
  }

  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  let tgRes: Response;
  let tgJson: unknown;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const raw = await tgRes.text();
    try {
      tgJson = JSON.parse(raw);
    } catch {
      tgJson = { raw };
    }
  } catch (e) {
    console.error("[fleet-notify] telegram fetch failed", { bot, idea: idea.slug, mode, error: String(e) });
    return NextResponse.json({ error: `Telegram send failed: ${String(e)}` }, { status: 502 });
  }

  const j = tgJson as { ok?: boolean; result?: { message_id?: number }; description?: string; error_code?: number };
  if (!tgRes.ok || j.ok === false) {
    console.error("[fleet-notify] telegram error", { bot, idea: idea.slug, mode, status: tgRes.status, body: j });
    return NextResponse.json(
      { error: j.description || `Telegram error (${tgRes.status})`, telegram: j },
      { status: 502 }
    );
  }

  const messageId = j.result?.message_id ?? null;
  console.log("[fleet-notify] sent", { bot, idea: idea.slug, mode, chatId, messageId, truncated });

  // also log to fleet history (best-effort, same store as scaffold/history)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/fleet/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "notify",
        slug: idea.slug,
        ideaId: idea.id,
        title: idea.title,
        targetSlug: idea.targetSlug,
        gapScore: idea.gapScore,
        meta: { bot, mode, chatId, messageId, truncated },
      }),
    }).catch(() => {});
  } catch {}

  return NextResponse.json({
    ok: true,
    bot,
    chat_id: chatId,
    message_id: messageId,
    truncated,
    botUsername: bot === "coding" ? "CodingAgent64Bot" : "HermesAgent64SparkBot",
    ideaSlug: idea.slug,
    mode,
  });
}
