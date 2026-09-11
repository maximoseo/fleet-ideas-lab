/**
 * Token bucket per key id: 60 requests / minute, refilled continuously.
 *
 * In-memory, per serverless instance — Vercel may run several instances, so
 * the effective ceiling is 60/min per warm instance, not per key globally.
 * That is acceptable for a single-tenant dashboard key; swap the Map for the
 * repo's Upstash/Redis client when an app gets real agent traffic (tracked in
 * Linear, see the fleet agent surface report).
 */

const CAPACITY = 60;
const REFILL_PER_MS = CAPACITY / 60_000;
/** failed-auth attempts allowed per client IP per minute (brute-force brake) */
const AUTH_FAIL_CAPACITY = 20;
const AUTH_FAIL_REFILL_PER_MS = AUTH_FAIL_CAPACITY / 60_000;
/** bounded map: evict the oldest entries once this many buckets exist */
const MAX_BUCKETS = 5000;

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

export type RateResult = { allowed: boolean; remaining: number; retryAfterSec: number; limit: number };

function take(id: string, capacity: number, refillPerMs: number, now: number): RateResult {
  let b = buckets.get(id);
  if (!b) {
    if (buckets.size >= MAX_BUCKETS) {
      // evict the least recently touched tenth
      const victims = [...buckets.entries()].sort((x, y) => x[1].updated - y[1].updated).slice(0, Math.ceil(MAX_BUCKETS / 10));
      for (const [k] of victims) buckets.delete(k);
    }
    b = { tokens: capacity, updated: now };
    buckets.set(id, b);
  }
  const elapsed = Math.max(0, now - b.updated);
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  b.updated = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true, remaining: Math.floor(b.tokens), retryAfterSec: 0, limit: capacity };
  }
  return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((1 - b.tokens) / refillPerMs / 1000), limit: capacity };
}

/** Authenticated calls: 60/min per key id. */
export function takeToken(keyId: string, now = Date.now()): RateResult {
  return take(`key:${keyId}`, CAPACITY, REFILL_PER_MS, now);
}

/** Vercel sets x-forwarded-for from the edge; the first hop is the client. */
export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

/** Failed-auth attempts: 20/min per client IP, so a key cannot be brute-forced against one instance. */
export function takeAuthFailure(req: Request, now = Date.now()): RateResult {
  return take(`ipfail:${clientIp(req)}`, AUTH_FAIL_CAPACITY, AUTH_FAIL_REFILL_PER_MS, now);
}

export function rateLimitResponse(r: RateResult): Response {
  return new Response(JSON.stringify({ error: "rate_limited", retry_after_seconds: r.retryAfterSec }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(r.retryAfterSec),
      "x-ratelimit-limit": String(r.limit),
      "x-ratelimit-remaining": "0",
      "cache-control": "no-store",
    },
  });
}

/** Test/ops helper — drops every bucket. */
export function resetRateLimits(): void {
  buckets.clear();
}
