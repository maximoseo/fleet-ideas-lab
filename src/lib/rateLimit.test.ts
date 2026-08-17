import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetThrottle,
  appChannelRateLimit,
  checkThrottle,
  clientKey,
  generationRateLimit,
  recordFailure,
  recordSuccess,
} from "./rateLimit";

/**
 * These exercise the in-memory fallback path — the one that runs when Supabase
 * is not configured, and the one every deployment falls back to if Postgres is
 * unreachable. The durable path is covered by the SQL functions themselves and
 * by a live end-to-end run against the database.
 */
beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  __resetThrottle();
});

function req(ip: string): Request {
  return new Request("https://example.test/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("clientKey", () => {
  it("separates different IPs and different usernames", () => {
    expect(clientKey(req("1.1.1.1"), "a")).not.toBe(clientKey(req("2.2.2.2"), "a"));
    expect(clientKey(req("1.1.1.1"), "a")).not.toBe(clientKey(req("1.1.1.1"), "b"));
  });

  it("is stable and case-insensitive on the username", () => {
    expect(clientKey(req("1.1.1.1"), "Operator")).toBe(clientKey(req("1.1.1.1"), "operator"));
  });

  it("uses only the first hop of x-forwarded-for", () => {
    const spoofed = new Request("https://example.test/", {
      headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" },
    });
    expect(clientKey(spoofed, "a")).toBe(clientKey(req("9.9.9.9"), "a"));
  });
});

describe("login throttle", () => {
  it("starts unlocked", async () => {
    expect(await checkThrottle("k1")).toBe(0);
  });

  it("locks on the tenth failure, not before", async () => {
    for (let i = 0; i < 9; i++) {
      expect(await recordFailure("k2")).toBe(0);
    }
    expect(await recordFailure("k2")).toBeGreaterThan(0);
    expect(await checkThrottle("k2")).toBeGreaterThan(0);
  });

  it("escalates the lock as failures pile up", async () => {
    let last = 0;
    for (let i = 0; i < 10; i++) last = await recordFailure("k3");
    const firstLock = last;
    for (let i = 0; i < 5; i++) last = await recordFailure("k3");
    expect(last).toBeGreaterThan(firstLock);
  });

  it("caps the lock at fifteen minutes", async () => {
    let last = 0;
    for (let i = 0; i < 80; i++) last = await recordFailure("k4");
    expect(last).toBeLessThanOrEqual(15 * 60);
  });

  it("clears the lock on a successful login", async () => {
    for (let i = 0; i < 10; i++) await recordFailure("k5");
    expect(await checkThrottle("k5")).toBeGreaterThan(0);
    await recordSuccess("k5");
    expect(await checkThrottle("k5")).toBe(0);
  });

  it("keeps keys independent", async () => {
    for (let i = 0; i < 10; i++) await recordFailure("k6");
    expect(await checkThrottle("k7")).toBe(0);
  });
});

describe("fixed-window buckets", () => {
  it("allows the generation quota then refuses", async () => {
    let last = await generationRateLimit("u1");
    for (let i = 1; i < 20; i++) last = await generationRateLimit("u1");
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
    const over = await generationRateLimit("u1");
    expect(over.allowed).toBe(false);
    expect(over.retryAfter).toBeGreaterThan(0);
  });

  it("counts generation quota per user", async () => {
    for (let i = 0; i < 21; i++) await generationRateLimit("u2");
    expect((await generationRateLimit("u3")).allowed).toBe(true);
  });

  it("caps the app login channel globally", async () => {
    let last = await appChannelRateLimit();
    for (let i = 1; i < 30; i++) last = await appChannelRateLimit();
    expect(last.allowed).toBe(true);
    expect((await appChannelRateLimit()).allowed).toBe(false);
  });
});
