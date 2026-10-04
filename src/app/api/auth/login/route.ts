import { NextResponse } from 'next/server';
import { authCookieOptions, createSessionToken, sessionUsername, validateCredentials } from '@/lib/auth';
import { appChannelRateLimit, checkThrottle, clientKey, recordFailure, recordSuccess } from '@/lib/rateLimit';
import { appTokenMatches } from '@/lib/appToken';
import { verifyTurnstile } from '@/lib/turnstile';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/**
 * Never log the typed username verbatim: a mistyped password in the username field
 * would land in the logs. A short hash still lets repeated attempts be correlated.
 */
function userTag(username: string): string {
  return createHash('sha256').update(username.trim().toLowerCase()).digest('hex').slice(0, 12);
}

function audit(event: string, fields: Record<string, unknown>) {
  // Structured auth audit event — never logs credentials.
  const line = JSON.stringify({ event, ...fields, ts: new Date().toISOString() });
  if (event.endsWith('failure') || event.endsWith('throttled')) console.warn(line);
  else console.info(line);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || body.email || '').trim();
    const password = String(body.password || '').trim();
    const turnstileToken = String(body.turnstileToken || '');
    const key = clientKey(req, username);

    const lockedSec = await checkThrottle(key);
    if (lockedSec > 0) {
      audit('auth.login.throttled', { user: userTag(username), key });
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
    const isTrustedApp = appTokenMatches(appToken);

    // The app channel skips the captcha, so it gets its own global ceiling —
    // see appChannelRateLimit(). Without it, a token lifted out of the public
    // APK buys unlimited password guesses from rotating IPs.
    if (isTrustedApp) {
      const appLimit = await appChannelRateLimit();
      if (!appLimit.allowed) {
        audit('auth.login.appchannel_throttled', { user: userTag(username), key });
        return noStore(
          NextResponse.json(
            { error: 'Too many attempts. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(appLimit.retryAfter) } },
          ),
        );
      }
    }

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
      const lockSec = await recordFailure(key);
      audit('auth.login.failure', { user: userTag(username), key });
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

    await recordSuccess(key);
    const user = sessionUsername(username);
    audit('auth.login.success', { user: userTag(username), key });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(authCookieOptions(createSessionToken(user)));
    return noStore(res);
  } catch (e) {
    console.error('[login] error:', e);
    return noStore(NextResponse.json({ error: 'Login failed' }, { status: 500 }));
  }
}
