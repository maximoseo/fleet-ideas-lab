import { createHash } from 'crypto';

/**
 * In-memory login throttling.
 *
 * NOTE: state is per serverless instance. That still blocks sustained
 * single-source attacks against an instance; a global store (Supabase/Redis)
 * can replace the Map later without changing the API.
 */

type Entry = {
  fails: number;
  firstFailAt: number;
  lockedUntil: number;
};

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILS = 10; // per window
const BASE_LOCK_MS = 30 * 1000; // 30s, then exponential
const MAX_LOCK_MS = 15 * 60 * 1000; // 15 minutes cap

const store = new Map<string, Entry>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = 0;
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60 * 1000) return;
  lastSweep = now;
  for (const [k, e] of store) {
    if (e.lockedUntil < now && now - e.firstFailAt > WINDOW_MS * 2) store.delete(k);
  }
}

export function clientKey(req: Request, identifier: string): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = (fwd.split(',')[0] || '').trim() || req.headers.get('x-real-ip') || 'unknown';
  const id = identifier.trim().toLowerCase() || 'anon';
  return createHash('sha256').update(`${ip}|${id}`).digest('hex').slice(0, 32);
}

/** Returns lock seconds remaining if currently throttled, else 0. */
export function checkThrottle(key: string): number {
  sweep();
  const e = store.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}

/** Record a failed attempt; returns lock seconds if this failure triggers a lock. */
export function recordFailure(key: string): number {
  sweep();
  const now = Date.now();
  let e = store.get(key);
  if (!e || now - e.firstFailAt > WINDOW_MS) {
    e = { fails: 0, firstFailAt: now, lockedUntil: 0 };
  }
  e.fails += 1;
  if (e.fails >= MAX_FAILS) {
    const factor = Math.pow(2, Math.floor((e.fails - MAX_FAILS) / 5));
    const lockMs = Math.min(BASE_LOCK_MS * factor, MAX_LOCK_MS);
    e.lockedUntil = now + lockMs;
  }
  store.set(key, e);
  return e.lockedUntil > now ? Math.ceil((e.lockedUntil - now) / 1000) : 0;
}

/** Reset after a successful login. */
export function recordSuccess(key: string) {
  store.delete(key);
}

/** Tests only. */
export function __resetThrottle() {
  store.clear();
}

/**
 * Cap on paid LLM prototype generation, per user per hour.
 * Each run generates 3 prototypes, so this is ~60 generations/hour worst case.
 * In-memory and per-instance; good enough to stop a runaway loop burning credit.
 */
const GEN_WINDOW_MS = 60 * 60 * 1000;
const GEN_MAX = 20;
const genBuckets = new Map<string, { count: number; resetAt: number }>();

export function generationRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  let b = genBuckets.get(userId);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + GEN_WINDOW_MS };
    genBuckets.set(userId, b);
  }
  b.count++;
  if (b.count > GEN_MAX) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: GEN_MAX - b.count, retryAfter: 0 };
}
