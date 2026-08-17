import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { generationRateLimit } from "@/lib/rateLimit";
import { startGeneration, pollGeneration, extractHtmlDocument, LlmUnavailableError, llmConfigured } from "@/lib/llm";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import { pickDirections, pickMacrostructures } from "@/lib/directions";
import { detectSlop } from "@/lib/slop-detector";
import { checkHonesty } from "@/lib/honesty";
import type { Prototype, SiteProfile } from "@/lib/types";

export const maxDuration = 60;

/**
 * Generate ONE prototype, asynchronously.
 *
 * Two calls:
 *   POST { profile, index, count }            -> { chatId, ... }   starts it
 *   POST { profile, index, count, chatId }    -> { pending } | { prototype }
 *
 * Generation is not held open in a single request. Measured synchronous runs
 * took 174s locally and over 260s in production for the same brief, against a
 * 300s function ceiling — one slow generation would have taken the whole
 * request down. v0's async response mode returns a chat id in well under a
 * second, so the client starts three generations and polls each.
 *
 * Direction and macrostructure selection is deterministic from the profile, so
 * the independent start and poll calls agree without any shared state.
 */

function structuralMetrics(html: string) {
  return {
    nodes: (html.match(/<[a-zA-Z][^>]*>/g) || []).length,
    sections: (html.match(/<(section|article|aside|footer|header|main|nav)[\s>]/gi) || []).length,
    bytes: html.length,
  };
}

function structuralSanity(html: string): string[] {
  const w: string[] = [];
  if (!/<!doctype html/i.test(html)) w.push("Missing doctype.");
  if (!/<\/html>/i.test(html)) w.push("Document looks truncated (no closing </html>).");
  if ((html.match(/<h1[\s>]/gi) || []).length !== 1) w.push("Page does not have exactly one h1.");
  if (!/overflow-x\s*:\s*clip/i.test(html)) w.push("Missing overflow-x: clip on the root elements.");
  if (!/@media/i.test(html)) w.push("No media queries — responsiveness is unverified.");
  if (!/:focus-visible/i.test(html)) w.push("No :focus-visible styles.");
  if (/<img(?![^>]*\balt=)/i.test(html)) w.push("At least one <img> has no alt attribute.");
  w.push(...overflowRisks(html));
  return w;
}

/**
 * Static horizontal-overflow risks.
 *
 * A declared `overflow-x: clip` proves nothing about layout — measured runs
 * still overflowed at 390 px (one page reported a 662 px scroll width inside a
 * 390 px viewport). These patterns catch the usual causes before the retry, and
 * the preview iframe measures the real scrollWidth afterwards, which is the
 * check that actually counts.
 */
function overflowRisks(html: string): string[] {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const risks: string[] = [];

  if (/\b100vw\b/.test(css)) {
    risks.push("Uses 100vw, which includes the scrollbar and overflows. Use 100% or 100dvw.");
  }
  const wideFixed = [...css.matchAll(/(?:^|[;{\s])(?:min-)?width\s*:\s*(\d{3,})px/gi)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n > 320);
  if (wideFixed.length) {
    risks.push(
      `Fixed widths wider than a phone viewport (${[...new Set(wideFixed)].slice(0, 4).join(", ")}px). Use max-width with width:100%.`,
    );
  }
  if (/grid-template-columns\s*:\s*repeat\([^)]*?,\s*1fr\)/i.test(css) && /<img/i.test(html)) {
    risks.push("Image-bearing grid uses a bare 1fr track. Use minmax(0, 1fr).");
  }
  if (/white-space\s*:\s*nowrap/i.test(css) && !/text-overflow\s*:\s*ellipsis/i.test(css)) {
    risks.push("white-space: nowrap without an ellipsis can force horizontal scroll.");
  }
  if (/\bposition\s*:\s*absolute[\s\S]{0,120}?\b(?:right|left)\s*:\s*-\d+/i.test(css)) {
    risks.push("An absolutely positioned element sits outside the viewport edge.");
  }
  return risks;
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }

  if (!llmConfigured()) {
    return NextResponse.json(
      {
        error: "AI generation is not configured on this deployment.",
        code: "llm_unavailable",
        hint: "Set V0_API_KEY. The Quick CSS tweak mode works without it.",
      },
      { status: 503 },
    );
  }

  let limit = { allowed: true, remaining: -1, retryAfter: 0 };

  try {
    const body = await req.json();

    // Only a start consumes quota. Polling the same generation must not, or a
    // single run would exhaust the hourly cap by checking on itself.
    const isStart = typeof body.chatId !== "string" || !body.chatId;
    if (isStart) {
      limit = await generationRateLimit(user.username);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: "Generation limit reached for this hour.", retryAfter: limit.retryAfter },
          { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
        );
      }
    }
    const profile = body.profile as SiteProfile | undefined;
    const index = Number.isInteger(body.index) ? (body.index as number) : 0;
    const count = Number.isInteger(body.count) ? Math.min(body.count as number, 3) : 3;

    if (!profile?.url || !profile.copy) {
      return NextResponse.json({ error: "A site profile is required. Analyse a URL first." }, { status: 400 });
    }
    if (index < 0 || index >= count) {
      return NextResponse.json({ error: "index out of range" }, { status: 400 });
    }

    const directions = pickDirections(profile, count);
    const macros = pickMacrostructures(profile, count);
    const direction = directions[index];
    const macro = macros[index] || macros[0];
    if (!direction || !macro) {
      return NextResponse.json({ error: "Could not select a design direction." }, { status: 500 });
    }

    const userPrompt = buildUserPrompt(profile, direction, macro);
    const chatId = typeof body.chatId === "string" ? body.chatId : "";
    const attempt = Number.isInteger(body.attempt) ? (body.attempt as number) : 1;
    const previousWarnings: string[] = Array.isArray(body.previousWarnings) ? body.previousWarnings : [];

    const promptFor = (n: number) =>
      n === 1
        ? userPrompt
        : `${userPrompt}

## Your previous attempt was rejected

Fix every one of these and emit the corrected document. Change nothing else about the concept:
${previousWarnings.map((x) => `- ${x}`).join("\n")}`;

    // ── start ──
    if (!chatId) {
      const started = await startGeneration({ system: SYSTEM_PROMPT, user: promptFor(attempt) });
      return NextResponse.json({
        pending: true,
        chatId: started.chatId,
        model: started.model,
        attempt,
        index,
        macrostructure: macro.name,
        direction: {
          id: direction.id,
          name: direction.name,
          fontPairing: direction.fontPairing.name,
          bestFor: direction.bestFor,
        },
        remaining: limit.remaining,
      });
    }

    // ── poll ──
    const poll = await pollGeneration(chatId);
    const html = extractHtmlDocument(poll.text);

    if (!poll.ready || !html || !/<html/i.test(html)) {
      return NextResponse.json({ pending: true, chatId, attempt, index });
    }

    const honesty = checkHonesty(html, profile);
    const sanity = structuralSanity(html);
    const slop = detectSlop(html).score;

    // One retry, with the failures fed back — but only for content honesty.
    //
    // A retry costs another full generation, roughly four minutes and another
    // slice of the subscription allowance. Fabricated testimonials, invented
    // prices or stock imagery are worth that, because they cannot be allowed
    // near a client's site. A bare 1fr grid track is not; it is reported as a
    // warning and the operator decides.
    if (attempt < 2 && honesty.length > 0) {
      const retry = await startGeneration({
        system: SYSTEM_PROMPT,
        user: `${userPrompt}

## Your previous attempt was rejected

Fix every one of these and emit the corrected document. Change nothing else about the concept:
${honesty.map((x) => `- ${x}`).join("\n")}`,
      });
      return NextResponse.json({
        pending: true,
        chatId: retry.chatId,
        attempt: 2,
        index,
        retriedBecause: honesty,
      });
    }

    const prototype: Prototype = {
      id: `${direction.id}-${index}`,
      directionId: direction.id,
      directionName: direction.name,
      rationale: `${direction.name} laid out as "${macro.name}" — ${macro.description}`,
      html,
      slopScore: slop,
      metrics: structuralMetrics(html),
      warnings: [...honesty, ...sanity],
      honestyFailed: honesty.length > 0,
      honestyWarnings: honesty,
    };

    return NextResponse.json({
      prototype,
      macrostructure: macro.name,
      direction: {
        id: direction.id,
        name: direction.name,
        fontPairing: direction.fontPairing.name,
        bestFor: direction.bestFor,
      },
      attempts: attempt,
      remaining: limit.remaining,
    });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 });
  }
}
