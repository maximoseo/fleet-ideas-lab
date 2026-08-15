/**
 * Generation client for prototype generation.
 *
 * Subscription-only policy, set by the operator:
 *   - v0 (Vercel) is the sole provider. It runs on an existing v0 subscription
 *     (plan v0-level3) whose billing cycle includes a credit balance, and the
 *     account's on-demand balance is zero — so when the included allowance is
 *     exhausted the API stops rather than silently billing extra.
 *   - Per-token API vendors are not used. OpenRouter and Mistral were both
 *     removed; do not reintroduce either, nor any other pay-as-you-go key.
 *   - This box's ANTHROPIC_* credentials belong to another service and must
 *     never be deployed into a web app.
 *
 * Absence of the key is a supported state, not an error: the app falls back to
 * the no-AI "Quick CSS tweak" mode rather than returning a 500.
 *
 * v0's API is not OpenAI-shaped. POST /v1/chats creates a chat and answers with
 * a messages array; the generated document arrives as the last assistant
 * message rather than in `files`, because the brief asks for one self-contained
 * document instead of a component tree.
 */

const V0_CHATS_ENDPOINT = "https://api.v0.dev/v1/chats";
/**
 * Valid ids: v0-auto | v0-mini | v0-pro | v0-max | v0-max-fast
 *
 * v0-max-fast measured at ~174s for a full 7k-character brief. v0-max and
 * v0-pro both stalled on the same brief — the chat was created but the
 * assistant message stayed empty past 240s — so they are not usable here.
 */
const DEFAULT_V0_MODEL = "v0-max-fast";

export class LlmUnavailableError extends Error {
  code = "llm_unavailable";
}

export type Provider = "v0";

/** The single supported provider, or null when no key is configured. */
export function activeProvider(): Provider | null {
  return process.env.V0_API_KEY ? "v0" : null;
}

export function llmConfigured(): boolean {
  return activeProvider() !== null;
}

export function llmModel(): string {
  return process.env.V0_MODEL || DEFAULT_V0_MODEL;
}

export interface CompletionResult {
  text: string;
  model: string;
  /** v0 chat id, useful for opening the generation at v0.app when debugging. */
  chatId?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface CompletionOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

interface V0Message {
  role?: string;
  content?: string;
}

interface V0Chat {
  id?: string;
  text?: string;
  messages?: V0Message[];
  files?: { name?: string; content?: string; source?: string; meta?: { file?: string } }[];
  latestVersion?: { files?: { name?: string; content?: string; source?: string }[] };
  error?: { message?: string; type?: string };
}

/** Pull the generated document out of whichever field v0 used. */
function harvest(chat: V0Chat): string {
  const candidates: string[] = [];

  const assistant = (chat.messages || []).filter((m) => m.role === "assistant");
  for (const m of assistant.reverse()) if (m.content) candidates.push(m.content);

  const files = [...(chat.files || []), ...(chat.latestVersion?.files || [])];
  for (const f of files) {
    const body = f.content || f.source;
    if (body) candidates.push(body);
  }

  if (chat.text) candidates.push(chat.text);

  // Prefer whatever actually contains a document.
  const withDoc = candidates.find((c) => /<!doctype html/i.test(c) || /<html[\s>]/i.test(c));
  return withDoc || candidates[0] || "";
}

/**
 * Start a generation and return immediately.
 *
 * responseMode "async" answers in under a second with the chat id, instead of
 * holding the connection open for the whole generation. That matters: measured
 * synchronous runs took 174s locally and over 260s in production for the same
 * brief, which is too close to the 300s function limit to be safe. The caller
 * polls with pollGeneration() instead.
 */
export async function startGeneration(opts: CompletionOptions): Promise<{ chatId: string; model: string }> {
  const key = process.env.V0_API_KEY;
  if (!key) throw new LlmUnavailableError("V0_API_KEY is not configured");

  const model = llmModel();
  // v0 has no separate system role; the constraints are prepended to the brief.
  const message = `${opts.system}\n\n---\n\n${opts.user}`;

  const res = await fetch(V0_CHATS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      modelConfiguration: { modelId: model },
      responseMode: "async",
      privacy: "private",
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Never echo the key; v0 error bodies do not contain it.
    throw new Error(`Generation request failed (${res.status}, v0 ${model}): ${body.slice(0, 300)}`);
  }

  const chat = (await res.json()) as V0Chat;
  if (chat.error) throw new Error(`v0 error: ${chat.error.message || "unknown"}`);
  if (!chat.id) throw new Error("v0 did not return a chat id");

  return { chatId: chat.id, model };
}

export interface PollResult {
  ready: boolean;
  text: string;
}

/** Check a generation once. `ready` is false while v0 is still working. */
export async function pollGeneration(chatId: string): Promise<PollResult> {
  const key = process.env.V0_API_KEY;
  if (!key) throw new LlmUnavailableError("V0_API_KEY is not configured");

  const res = await fetch(`${V0_CHATS_ENDPOINT}/${encodeURIComponent(chatId)}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Could not read the generation (${res.status}): ${body.slice(0, 200)}`);
  }

  const chat = (await res.json()) as V0Chat;
  if (chat.error) throw new Error(`v0 error: ${chat.error.message || "unknown"}`);

  const text = harvest(chat);
  return { ready: /<\/html>/i.test(text), text };
}

/**
 * Models sometimes wrap the document in a fence or add a sentence before it,
 * despite the instruction not to. Recover the document rather than failing.
 */
export function extractHtmlDocument(raw: string): string {
  let s = raw.trim();

  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim().toLowerCase().includes("<!doctype")) {
    s = fence[1].trim();
  } else if (fence && fence[1].trim().toLowerCase().includes("<html")) {
    s = fence[1].trim();
  }

  const start = s.search(/<!doctype html/i);
  if (start > 0) s = s.slice(start);

  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end !== -1) s = s.slice(0, end + "</html>".length);

  return s.trim();
}
