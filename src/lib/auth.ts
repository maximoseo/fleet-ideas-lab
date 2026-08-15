import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { authSecrets, passwordVersion, serverEnv } from './env';

/**
 * Stateless session auth, ported from site-intel-dashboard.
 *
 * Differences from the source app, deliberate:
 *  - No `requirePermission` / RBAC: design-lab has no user table and no roles.
 *  - No shared-password family login: this app can write to customer WordPress
 *    sites, so it takes one explicit username+password pair and nothing else.
 */

const COOKIE = 'dl_session';
/** Short session TTL: 7 days. */
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function signWith(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(username: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const pv = passwordVersion();
  const body = Buffer.from(JSON.stringify({ u: username, exp, pv }), 'utf8').toString('base64url');
  // Always sign with the current (first) secret.
  return `${body}.${signWith(body, authSecrets()[0])}`;
}

export interface SessionUser {
  username: string;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  // Accept tokens signed with the current secret or the previous one (rotation window).
  let ok = false;
  for (const secret of authSecrets()) {
    const expected = signWith(body, secret);
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        ok = true;
        break;
      }
    } catch {
      // try next secret
    }
  }
  if (!ok) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      u: string;
      exp: number;
      pv?: string | null;
    };
    if (!data.u || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    // Forced logout after password rotation: the token's password version must match the live one.
    const pv = passwordVersion();
    if (pv && data.pv !== pv) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
  }
}

/**
 * Guard for API route handlers.
 *
 * IMPORTANT: `src/middleware.ts` does NOT run on `/api/*` — both its matcher and
 * its allowlist exclude it. Every API route must call this itself. Adding the
 * middleware alone leaves the API completely public.
 */
export async function requireUser(): Promise<SessionUser> {
  const jar = await cookies();
  const user = verifySessionToken(jar.get(COOKIE)?.value);
  if (!user) throw new AuthError('Authentication required');
  return user;
}

/** Standard 401 body for route handlers that catch AuthError. */
export function unauthorized() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export function authCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}

export function clearAuthCookieOptions() {
  return {
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Single username+password pair. No shared-password fallback. */
export function validateCredentials(username: string, password: string) {
  const env = serverEnv();
  const u = (env.DASHBOARD_AUTH_USERNAME || '').trim();
  const p = (env.DASHBOARD_AUTH_PASSWORD || '').trim();
  const userIn = username.trim();
  const passIn = password.trim();
  if (!passIn || !p) return false;

  // When no username is configured, password-only login is allowed.
  if (!u) return safeEq(passIn, p);

  // Email usernames are case-insensitive (Service@ == service@)
  const normUserIn = userIn.toLowerCase();
  const normU = u.toLowerCase();
  // If either looks like an email, compare case-insensitively
  const userOk = (u.includes('@') || userIn.includes('@')) ? safeEq(normUserIn, normU) : safeEq(userIn, u);
  return userOk && safeEq(passIn, p);
}

export function sessionUsername(username: string) {
  return username.trim() || process.env.DASHBOARD_AUTH_USERNAME || 'design-lab-operator';
}
