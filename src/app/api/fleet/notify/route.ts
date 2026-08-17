import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/observability";
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

/**
 * No hardcoded fallback.
 *
 * This used to default to a literal chat id, so a missing or renamed
 * TELEGRAM_NOTIFY64_CHAT sent the brief to whoever that id belongs to instead
 * of failing. A messaging destination is not something to guess at — an
 * unconfigured server should refuse, loudly.
 */
function resolveChatId(explicit?: unknown): string | null {
  if (explicit !== undefined && typeof explicit !== "string") return null;
  const raw = ((explicit as string | undefined) || process.env.TELEGRAM_NOTIFY64_CHAT || "").trim();
  // A comma-separated list is allowed; the first entry wins.
  return raw.split(",")[0].trim() || null;
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

  // JSON gives no type guarantees. A number or an object here used to reach
  // .trim() and throw a 500 out of a request that was simply malformed.
  const asString = (v: unknown): string | null =>
    v === undefined || v === null ? "" : typeof v === "string" ? v : null;

  const rawSlug = asString(b.ideaSlug);
  const rawId = asString(b.ideaId);
  const rawMode = asString(b.mode);
  const rawBot = asString(b.bot);
  if (rawSlug === null || rawId === null || rawMode === null || rawBot === null) {
    return NextResponse.json({ error: "ideaSlug, ideaId, mode and bot must be strings" }, { status: 400 });
  }

  const ideaSlug = rawSlug.trim();
  const ideaId = rawId.trim();
  const mode = (rawMode || "build").trim().toLowerCase() === "improve" ? "improve" : "build";
  const bot = (rawBot || "spark").trim().toLowerCase() === "coding" ? "coding" : "spark";

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
  if (!chatId) {
    return NextResponse.json(
      { error: "Telegram destination is not configured (TELEGRAM_NOTIFY64_CHAT)" },
      { status: 503 },
    );
  }

  let brief: string;
  try {
    brief = mode === "improve" ? buildImprovePrompt(idea) : buildAgentPrompt(idea);
  } catch (e) {
    // The exception text can carry internal paths; log it, do not return it.
    reportError(e, { route: "/api/fleet/notify", meta: { stage: "build-brief", idea: idea.slug } });
    return NextResponse.json({ error: "Failed to build brief" }, { status: 500 });
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
    // The upstream message can echo the bot token back; never return it and
    // never log it raw.
    reportError(e, { route: "/api/fleet/notify", meta: { bot, idea: idea.slug, mode } });
    return NextResponse.json({ error: "Telegram send failed" }, { status: 502 });
  }

  const j = tgJson as { ok?: boolean; result?: { message_id?: number }; description?: string; error_code?: number };
  if (!tgRes.ok || j.ok === false) {
    // The upstream body can echo the bot token and chat metadata. It belongs
    // in the redacted server log, never in the response.
    reportError(new Error(j.description || `Telegram HTTP ${tgRes.status}`), {
      route: "/api/fleet/notify",
      meta: { bot, idea: idea.slug, mode, status: tgRes.status, code: j.error_code ?? null },
    });
    return NextResponse.json({ error: "Telegram rejected the message" }, { status: 502 });
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
