import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Hardened vs the site-intel original.
 *
 * site-intel's matcher and allowlist both exclude `/api`, so its API surface is
 * protected only by each route remembering to call requireUser() — public by
 * default, one forgotten route away from an open endpoint. design-lab proxies
 * writes to customer WordPress sites, so here the middleware DOES cover `/api`
 * and only an explicit allowlist is public. Routes still self-guard as well;
 * this is deliberate defence in depth, not redundancy.
 */

const COOKIE_NAME = 'dl_session';

/**
 * The public surface lives in ONE shared file (src/lib/publicRoutes.json) that
 * both this middleware and the CI auth-matrix smoke import — adding a public
 * route is an explicit, test-covered decision, never an accident.
 */
import publicRoutes from '@/lib/publicRoutes.json';

/** Exact paths reachable without a session. */
const PUBLIC_EXACT = new Set<string>(publicRoutes.exact);

/** Path prefixes reachable without a session. */
const PUBLIC_PREFIX: string[] = publicRoutes.prefix;

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Vercel cron calls carry `Authorization: Bearer <CRON_SECRET>` and no session
 * cookie. The routes re-verify the secret themselves (defence in depth); the
 * middleware only needs to not swallow the call with a 401 first.
 */
const CRON_PATHS = new Set(['/api/fleet/probe', '/api/fleet/sync']);

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return CRON_PATHS.has(req.nextUrl.pathname) && req.headers.get('authorization') === `Bearer ${secret}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (cronAuthorized(req)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  if (!user) {
    // API callers get a status code, not an HTML redirect.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    const next = pathname + (req.nextUrl.search || '');
    loginUrl.pathname = '/login';
    loginUrl.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(loginUrl, 307);
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)',
  ],
};
