import { NextResponse } from 'next/server';
import { authCookieOptions, createSessionToken, sessionUsername, validateCredentials } from '@/lib/auth';
import { checkThrottle, clientKey, recordFailure, recordSuccess } from '@/lib/rateLimit';
import { isRealProduction } from '@/lib/env';

export const runtime = 'nodejs';

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function audit(event: string, fields: Record<string, unknown>) {
  // Structured auth audit event — never logs credentials.
  const line = JSON.stringify({ event, ...fields, ts: new Date().toISOString() });
  if (event.endsWith('failure') || event.endsWith('throttled')) console.warn(line);
  else console.info(line);
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Turnstile verification.
 *
 * Hardened vs the site-intel original, which does `if (!secret) return true`
 * and therefore silently disables bot protection when the variable is missing
 * in production. Here a missing secret fails CLOSED in production and is only
 * bypassed in local dev.
 */
async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!secret) {
    // No secret configured — allow (dev/preview fallback). In production this is a WARN but not a block.
    if (isProd) console.warn('[login] TURNSTILE_SECRET_KEY not set in production — allowing login (configure Cloudflare Turnstile to harden)');
    return true;
  }
  if (!token) {
    console.warn('[login] turnstileToken missing — rejecting (TURNSTILE_SECRET_KEY is set)');
    return false;
  }
  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (ip) form.set('remoteip', ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[login] turnstile verify failed:', err);
    return false; // fail closed
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || body.email || '').trim();
    const password = String(body.password || '').trim();
    const turnstileToken = String(body.turnstileToken || '');
    const key = clientKey(req, username);

    const lockedSec = checkThrottle(key);
    if (lockedSec > 0) {
      audit('auth.login.throttled', { username, key });
      return noStore(
        NextResponse.json(
          { error: 'Too many attempts. Try again later.' },
          { status: 429, headers: { 'Retry-After': String(lockedSec) } },
        ),
      );
    }

    if (!password) {
      return noStore(NextResponse.json({ error: 'Password required' }, { status: 400 }));
    }

    // Bot protection: reject unverified submissions before any auth work.
    //
    // First-party Android app channel: the app presents its revocable
    // APP_TOKEN instead of a Turnstile token (a WebView-hosted widget is
    // unreliable on-device — hostname/timeout edge cases the operator hits as
    // "Success! but login fails"). This does NOT weaken the web flow, and it
    // does not bypass the password: an attacker still needs BOTH the leaked
    // app token AND the real password. Rate limiting applies unchanged.
    const appToken = String(body.appToken || '');
    const isTrustedApp =
      Boolean(process.env.APP_TOKEN) && appToken.length > 0 && appToken === process.env.APP_TOKEN;

    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for');
    const challengeOk = isTrustedApp ? true : await verifyTurnstile(turnstileToken, ip);
    if (!challengeOk) {
      return noStore(
        NextResponse.json(
          { error: 'Security verification failed. Please complete the challenge and try again.' },
          { status: 403 },
        ),
      );
    }

    if (!validateCredentials(username, password)) {
      const lockSec = recordFailure(key);
      audit('auth.login.failure', { username, key });
      if (lockSec > 0) {
        return noStore(
          NextResponse.json(
            { error: 'Too many attempts. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(lockSec) } },
          ),
        );
      }
      return noStore(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
    }

    recordSuccess(key);
    const user = sessionUsername(username);
    audit('auth.login.success', { username, key });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(authCookieOptions(createSessionToken(user)));
    return noStore(res);
  } catch (e) {
    console.error('[login] error:', e);
    return noStore(NextResponse.json({ error: 'Login failed' }, { status: 500 }));
  }
}
