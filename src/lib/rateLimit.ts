import { createHash } from 'crypto';
import { sbRpc, sbSelect, sbDelete, supabaseEnabled } from './supabase';

/**
 * Login throttling and paid-generation caps.
 *
 * These used to live in per-instance `Map`s. On Vercel every lambda has its own
 * copy, so a brute-force attempt that landed on a cold instance started counting
 * from zero — the limiter looked present and did almost nothing.
 *
 * Storage is now Postgres, through two atomic RPCs (`fil_record_login_failure`,
 * `fil_bucket_hit`) that do the window and lock maths in SQL, so two concurrent
 * lambdas cannot both read "9 fails" and both write "10".
 *
 * The in-memory maps stay as a FALLBACK for when Supabase is not configured
 * (local dev, CI, preview) and as a FAIL-OPEN path when the database is
 * unreachable. Fail-open is deliberate: a Postgres outage must not lock the
 * operator out of the console that tells them Postgres is down. The password
 * check is unaffected either way.
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

function secondsUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/* ------------------------------------------------------------------ */
/* In-memory fallback                                                  */
/* ------------------------------------------------------------------ */

function memCheck(key: string): number {
  sweep();
  const e = store.get(key);
  if (!e) return 0;
  const now = Date.now();
  return e.lockedUntil > now ? Math.ceil((e.lockedUntil - now) / 1000) : 0;
}

function memFailure(key: string): number {
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

/* ------------------------------------------------------------------ */
/* Public API — async because the durable path is a network round trip  */
/* ------------------------------------------------------------------ */

/** Returns lock seconds remaining if currently throttled, else 0. */
export async function checkThrottle(key: string): Promise<number> {
  if (!supabaseEnabled()) return memCheck(key);
  try {
    const rows = await sbSelect<{ locked_until: string | null }>(
      'fil_login_throttle',
      `key=eq.${encodeURIComponent(key)}&select=locked_until`,
    );
    return secondsUntil(rows[0]?.locked_until);
  } catch (err) {
    console.warn('[rateLimit] checkThrottle fell back to memory:', (err as Error).message);
    return memCheck(key);
  }
}

/** Record a failed attempt; returns lock seconds if this failure triggers a lock. */
export async function recordFailure(key: string): Promise<number> {
  if (!supabaseEnabled()) return memFailure(key);
  try {
    const rows = await sbRpc<{ out_fails: number; out_locked_until: string | null }[]>(
      'fil_record_login_failure',
      {
        p_key: key,
        p_window_ms: WINDOW_MS,
        p_max_fails: MAX_FAILS,
        p_base_lock_ms: BASE_LOCK_MS,
        p_max_lock_ms: MAX_LOCK_MS,
      },
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    return secondsUntil(row?.out_locked_until);
  } catch (err) {
    console.warn('[rateLimit] recordFailure fell back to memory:', (err as Error).message);
    return memFailure(key);
  }
}

/** Reset after a successful login. */
export async function recordSuccess(key: string): Promise<void> {
  store.delete(key);
  if (!supabaseEnabled()) return;
  try {
    await sbDelete('fil_login_throttle', `key=eq.${encodeURIComponent(key)}`);
  } catch (err) {
    console.warn('[rateLimit] recordSuccess cleanup failed:', (err as Error).message);
  }
}

/** Tests only. */
export function __resetThrottle() {
  store.clear();
  genBuckets.clear();
}

/* ------------------------------------------------------------------ */
/* Fixed-window buckets                                                */
/* ------------------------------------------------------------------ */

const genBuckets = new Map<string, { count: number; resetAt: number }>();

function memBucket(key: string, windowMs: number, max: number) {
  const now = Date.now();
  let b = genBuckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    genBuckets.set(key, b);
  }
  b.count++;
  if (b.count > max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: max - b.count, retryAfter: 0 };
}

async function bucketHit(key: string, windowMs: number, max: number) {
  if (!supabaseEnabled()) return memBucket(key, windowMs, max);
  try {
    const rows = await sbRpc<{ out_count: number; out_reset_at: string }[]>('fil_bucket_hit', {
      p_key: key,
      p_window_ms: windowMs,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return memBucket(key, windowMs, max);
    if (row.out_count > max) {
      return { allowed: false, remaining: 0, retryAfter: secondsUntil(row.out_reset_at) };
    }
    return { allowed: true, remaining: max - row.out_count, retryAfter: 0 };
  } catch (err) {
    console.warn('[rateLimit] bucketHit fell back to memory:', (err as Error).message);
    return memBucket(key, windowMs, max);
  }
}

/**
 * Cap on paid LLM prototype generation, per user per hour.
 * Each run generates 3 prototypes, so this is ~60 generations/hour worst case.
 */
const GEN_WINDOW_MS = 60 * 60 * 1000;
const GEN_MAX = 20;

export async function generationRateLimit(userId: string) {
  return bucketHit(`gen:${userId}`, GEN_WINDOW_MS, GEN_MAX);
}

/**
 * Global cap on the first-party app login channel.
 *
 * That channel skips Turnstile on the strength of APP_TOKEN, and APP_TOKEN is
 * readable by anyone who unzips the public APK. The password still stands in
 * the way, but without this the extracted token would buy unlimited password
 * guesses from rotating IPs — the per-IP throttle alone does not see that.
 *
 * One global bucket, deliberately: the legitimate user of this channel is one
 * operator with one phone.
 */
const APP_CHANNEL_WINDOW_MS = 10 * 60 * 1000;
const APP_CHANNEL_MAX = 30;

export async function appChannelRateLimit() {
  return bucketHit('appchan:global', APP_CHANNEL_WINDOW_MS, APP_CHANNEL_MAX);
}
