import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const ok = (success: boolean) => vi.fn(async () => ({ json: async () => ({ success }) }) as unknown as Response);

afterEach(() => vi.restoreAllMocks());

describe("verifyTurnstile policy", () => {
  it("skips the check outside production when no secret is configured", async () => {
    const f = ok(false);
    expect(await verifyTurnstile(undefined, null, { env: {}, fetchImpl: f })).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it("fails closed in production when the secret is missing", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = ok(true);
    expect(await verifyTurnstile("t", null, { env: { VERCEL_ENV: "production" }, fetchImpl: f })).toBe(false);
    expect(await verifyTurnstile("t", null, { env: { NODE_ENV: "production" }, fetchImpl: f })).toBe(false);
    expect(err).toHaveBeenCalledTimes(2);
    expect(f).not.toHaveBeenCalled();
  });

  it("stays quiet outside production", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyTurnstile("t", null, { env: { NODE_ENV: "test" }, fetchImpl: ok(true) })).toBe(true);
    expect(err).not.toHaveBeenCalled();
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
