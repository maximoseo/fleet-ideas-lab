import { z } from 'zod';
import { createHmac } from 'crypto';

/**
 * Server-side environment validation.
 *
 * Ported from site-intel-dashboard. This app now has a database (Supabase) and cron
 * jobs, but the validation below deliberately covers only the auth variables: the
 * Supabase and CRON_SECRET checks of the source app were removed and are not
 * enforced at boot, so a missing one fails at the route that needs it.
 *
 * Fail-closed policy:
 *  - Real production (VERCEL_ENV=production, or NODE_ENV=production outside Vercel):
 *    missing/weak critical secrets throw an explicit configuration error.
 *  - Preview/development: never fail boot; auth falls back to a per-boot random
 *    secret with a loud warning (sessions simply do not survive restarts).
 */

const schema = z.object({
  DASHBOARD_AUTH_SECRET: z.string().optional(),
  DASHBOARD_AUTH_SECRET_PREVIOUS: z.string().optional(),
  DASHBOARD_AUTH_USERNAME: z.string().optional(),
  DASHBOARD_AUTH_PASSWORD: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  /**
   * Optional: when unset the app degrades to the no-AI "Quick CSS tweak" mode.
   * v0 is the only supported provider, per the subscription-only policy.
   * Per-token vendors (OpenRouter, Mistral, and any other pay-as-you-go key)
   * were removed by instruction and must not be added back.
   */
  V0_API_KEY: z.string().optional(),
  V0_MODEL: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

/** Marker that must never be accepted as a real secret (legacy dev default). */
export const DEV_SECRET_PLACEHOLDER = 'dev-insecure-secret-change-me';

const MIN_SECRET_LEN = 8;

let cached: ServerEnv | null = null;

export function isRealProduction(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return process.env.NODE_ENV === 'production';
}

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.parse(process.env);
  if (isRealProduction()) {
    const problems: string[] = [];
    const secret = (parsed.DASHBOARD_AUTH_SECRET || '').trim();
    if (!secret) problems.push('DASHBOARD_AUTH_SECRET is required');
    else if (secret === DEV_SECRET_PLACEHOLDER) problems.push('DASHBOARD_AUTH_SECRET must not be the known dev default');
    else if (secret.length < MIN_SECRET_LEN) problems.push(`DASHBOARD_AUTH_SECRET must be at least ${MIN_SECRET_LEN} chars`);
    else if (secret.length < 32) {
      // Advisory only — never block boot on strength alone.
      console.warn('[fleet-ideas-lab] WARNING: DASHBOARD_AUTH_SECRET is short (<32 chars); consider rotating to a longer random value.');
    }
    if (!(parsed.DASHBOARD_AUTH_PASSWORD || '').trim()) problems.push('DASHBOARD_AUTH_PASSWORD is required');
    // A missing Turnstile secret only warns: the captcha is recommended, not required
    // (OPERATIONS.md §2, src/lib/turnstile.ts). Making it fatal here would lock the
    // web login out of a deployment that has not set the variable yet.
    if (!(parsed.TURNSTILE_SECRET_KEY || '').trim()) console.warn('[fleet-ideas-lab] WARNING: TURNSTILE_SECRET_KEY not set — captcha disabled until configured.');
    if (problems.length) {
      throw new Error(`[fleet-ideas-lab] Invalid production configuration: ${problems.join('; ')}`);
    }
  }
  cached = parsed;
  return parsed;
}

/**
 * Auth signing secrets, current first, then optional previous (rotation).
 * In non-production, generates a random per-boot secret when unset.
 */
export function authSecrets(): string[] {
  const env = serverEnv();
  const list: string[] = [];
  const cur = (env.DASHBOARD_AUTH_SECRET || '').trim();
  if (cur && cur !== DEV_SECRET_PLACEHOLDER) list.push(cur);
  const prev = (env.DASHBOARD_AUTH_SECRET_PREVIOUS || '').trim();
  if (prev && prev !== DEV_SECRET_PLACEHOLDER && prev !== cur) list.push(prev);
  if (list.length) return list;
  if (isRealProduction()) {
    // serverEnv() above already throws in this case; belt-and-suspenders:
    throw new Error('[fleet-ideas-lab] No valid DASHBOARD_AUTH_SECRET configured');
  }
  if (!process.env.__DL_DEV_SESSION_SECRET) {
    // Per-boot random secret for dev/preview only — never a repo-known constant.
    process.env.__DL_DEV_SESSION_SECRET = `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    console.warn('[fleet-ideas-lab] WARNING: DASHBOARD_AUTH_SECRET unset — using a random per-boot secret (sessions reset on restart).');
  }
  return [process.env.__DL_DEV_SESSION_SECRET];
}

/**
 * Session-invalidation tags for the current login password: one per signing secret
 * (current first, then the rotation-window previous one), so a token minted under
 * the previous secret stays valid while that secret is still accepted.
 *
 * Each tag is an HMAC of the password keyed by a signing secret. It used to be a
 * 32-bit rolling hash of the password alone, and the tag travels in the session
 * token body, which is readable base64: anyone holding a token could test password
 * guesses offline against 2^32 values. Without the secret this tag is no oracle.
 */
export function passwordVersions(): string[] {
  const p = (serverEnv().DASHBOARD_AUTH_PASSWORD || '').trim();
  if (!p) return [];
  return authSecrets().map((secret) => 'v2.' + createHmac('sha256', secret).update('pv|' + p).digest('base64url').slice(0, 16));
}

/** The tag new tokens carry (null when no password is configured). */
export function passwordVersion(): string | null {
  return passwordVersions()[0] ?? null;
}

/** Reset cached env (tests only). */
export function __resetEnvCache() {
  cached = null;
}
