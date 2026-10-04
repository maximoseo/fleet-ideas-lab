import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const ok = (success: boolean) => vi.fn(async () => ({ json: async () => ({ success }) }) as unknown as Response);

afterEach(() => vi.restoreAllMocks());

describe("verifyTurnstile policy", () => {
  it("skips the check when no secret is configured (documented fail-open)", async () => {
    const f = ok(false);
    expect(await verifyTurnstile(undefined, null, { env: {}, fetchImpl: f })).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it("warns in production when it skips, so the gap is visible in logs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifyTurnstile("t", null, { env: { VERCEL_ENV: "production" }, fetchImpl: ok(true) });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("stays quiet outside production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifyTurnstile("t", null, { env: { NODE_ENV: "test" }, fetchImpl: ok(true) });
    expect(warn).not.toHaveBeenCalled();
  });

  it("fails closed with a secret and no token", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = ok(true);
    expect(await verifyTurnstile("", null, { env: { TURNSTILE_SECRET_KEY: "s" }, fetchImpl: f })).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("accepts only an explicit success from the verifier", async () => {
    expect(await verifyTurnstile("t", "1.2.3.4", { env: { TURNSTILE_SECRET_KEY: "s" }, fetchImpl: ok(true) })).toBe(true);
    expect(await verifyTurnstile("t", null, { env: { TURNSTILE_SECRET_KEY: "s" }, fetchImpl: ok(false) })).toBe(false);
  });

  it("fails closed when the verifier is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = vi.fn(async () => { throw new Error("network"); });
    expect(await verifyTurnstile("t", null, { env: { TURNSTILE_SECRET_KEY: "s" }, fetchImpl: boom as unknown as typeof fetch })).toBe(false);
  });
});
