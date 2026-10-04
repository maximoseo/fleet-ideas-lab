/**
 * Cloudflare Turnstile verification for the login form.
 *
 * Policy (documented in OPERATIONS.md §2): the captcha is RECOMMENDED, not
 * required. With no TURNSTILE_SECRET_KEY the check is skipped and a warning is
 * logged in production, so a missing variable disables bot protection quietly.
 * With a secret configured the check fails CLOSED: a missing token, a rejected
 * token or an unreachable verifier all refuse the login.
 *
 * (Until 2026-10-04 the comment on this logic claimed it "fails CLOSED in
 * production" with no secret, which the code never did. Making that true is a
 * deliberate decision, because it locks the web login out if the secret is not
 * set in the production environment. It is tracked in the diagnosis report as F7.)
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
    if (isProd) console.warn("[login] TURNSTILE_SECRET_KEY not set in production — captcha skipped (configure Cloudflare Turnstile to enable it)");
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
