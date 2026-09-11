import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Bearer-key auth for the agent surface. Fails closed:
 *  - no key configured          -> 503 "agent surface not configured" (never allow-all)
 *  - header missing or wrong    -> 401 "unauthorized"
 * Accepts `Authorization: Bearer <key>` and `x-api-key: <key>`.
 * Comparison is timing-safe on sha256 digests (equal length by construction).
 *
 * Keys: AGENT_API_KEY is the fleet standard (one per Vercel project, mirrored in
 * Doppler agents/prd + the vault). DASHBOARD_AGENT_API_KEY is accepted as a
 * secondary key where the parallel Hermes rollout (2026-09-11) set one, so its
 * consumers keep working against this route. Never allow-all.
 */

export type AuthOk = { ok: true; keyId: string };
export type AuthFail = { ok: false; status: 401 | 503; error: string };

export function keyIdOf(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 6);
}

function safeEq(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Every credential the request presents: Bearer token and/or x-api-key (both are checked). */
export function presentedKeys(req: Request): string[] {
  const out: string[] = [];
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (m && m[1]) out.push(m[1].trim());
  const x = req.headers.get("x-api-key");
  if (x && x.trim()) out.push(x.trim());
  return out;
}

export function presentedKey(req: Request): string | null {
  return presentedKeys(req)[0] ?? null;
}

const warnedShort = new Set<string>();
function configuredKeys(): string[] {
  const out: string[] = [];
  for (const name of ["AGENT_API_KEY", "DASHBOARD_AGENT_API_KEY"]) {
    const v = (process.env[name] ?? "").trim();
    if (v.length >= 16) out.push(v);
    else if (v && !warnedShort.has(name)) {
      warnedShort.add(name);
      console.warn(`agent-surface: ${name} is set but shorter than 16 characters — ignored`);
    }
  }
  return out;
}

export function agentSurfaceConfigured(): boolean {
  return configuredKeys().length > 0;
}

export function checkAgentKey(req: Request): AuthOk | AuthFail {
  const keys = configuredKeys();
  if (!keys.length) return { ok: false, status: 503, error: "agent surface not configured" };
  const presented = presentedKeys(req);
  if (!presented.length) return { ok: false, status: 401, error: "unauthorized" };
  // every presented credential against every configured key (constant work) — no early exit on match position
  let matched: string | null = null;
  for (const p of presented) for (const k of keys) if (safeEq(p, k)) matched = k;
  if (!matched) return { ok: false, status: 401, error: "unauthorized" };
  return { ok: true, keyId: keyIdOf(matched) };
}

/** Returns a Response to send, or null when the request is authorised. */
export function requireAgentKey(req: Request): { keyId: string; deny: null } | { keyId: null; deny: Response } {
  const r = checkAgentKey(req);
  if (r.ok === true) return { keyId: r.keyId, deny: null };
  const headers: Record<string, string> = { "content-type": "application/json", "cache-control": "no-store" };
  if (r.status === 401) headers["www-authenticate"] = 'Bearer realm="agent-surface"';
  return { keyId: null, deny: new Response(JSON.stringify({ error: r.error }), { status: r.status, headers }) };
}
