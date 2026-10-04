/**
 * Cloudflare Turnstile verification for the login form.
 *
 * Policy (OPERATIONS.md §2): in production the check FAILS CLOSED. A missing
 * TURNSTILE_SECRET_KEY, a missing token, a rejected token or an unreachable
 * verifier all refuse the web login (the Android app channel does not use this
 * path). Outside production a missing secret skips the check so local runs and
 * CI smoke tests work without Cloudflare. With a secret set it is enforced everywhere.
 *
 * Until 2026-10-04 production without a secret skipped the check while a comment
 * claimed it failed closed (diagnosis F7). The secret was confirmed present in the
 * production environment before this was tightened.
 */
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

export async function verifyTurnstile(token: string | undefined, ip: string | null, deps: TurnstileDeps = {}): Promise<boolean> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetchImpl ?? fetch;
  const secret = env.TURNSTILE_SECRET_KEY;
  const isProd = env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
  if (!secret) {
    if (isProd) {
      console.error("[login] TURNSTILE_SECRET_KEY not set in production — refusing web login (fail closed)");
      return false;
    }
    return true;
  }
  if (!token) {
    console.warn("[login] turnstileToken missing — rejecting (TURNSTILE_SECRET_KEY is set)");
    return false;
  }
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await doFetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[login] turnstile verify failed:", err);
    return false; // fail closed
  }
}
