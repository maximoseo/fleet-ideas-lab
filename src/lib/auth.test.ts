import { beforeEach, describe, expect, it } from "vitest";

/**
 * Session tokens are the whole access-control story for this app: one HMAC
 * over a base64url body, no server-side session table. Every property below is
 * load-bearing, and none of them was covered by a test before.
 *
 * The module caches parsed env, so each test re-imports after setting the
 * environment it needs.
 */
async function freshAuth(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const envMod = await import("./env");
  envMod.__resetEnvCache();
  return import("./auth");
}

const BASE = {
  DASHBOARD_AUTH_SECRET: "unit-test-secret-0123456789abcdef",
  DASHBOARD_AUTH_SECRET_PREVIOUS: undefined,
  DASHBOARD_AUTH_USERNAME: "operator@example.com",
  DASHBOARD_AUTH_PASSWORD: "unit-test-password",
  VERCEL_ENV: undefined,
  NODE_ENV: "test",
};

beforeEach(() => {
  for (const k of Object.keys(BASE)) delete process.env[k];
});

describe("session tokens", () => {
  it("round-trips a token it just signed", async () => {
    const auth = await freshAuth(BASE);
    const token = auth.createSessionToken("operator@example.com");
    expect(auth.verifySessionToken(token)?.username).toBe("operator@example.com");
  });

  it("rejects a tampered signature", async () => {
    const auth = await freshAuth(BASE);
    const token = auth.createSessionToken("operator@example.com");
    const [body] = token.split(".");
    expect(auth.verifySessionToken(`${body}.notthesignature`)).toBeNull();
  });

  it("rejects a tampered body even with the original signature", async () => {
    const auth = await freshAuth(BASE);
    const token = auth.createSessionToken("operator@example.com");
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ u: "attacker", exp: Math.floor(Date.now() / 1000) + 999, pv: "x" }),
      "utf8",
    ).toString("base64url");
    expect(auth.verifySessionToken(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects garbage and empty input", async () => {
    const auth = await freshAuth(BASE);
    expect(auth.verifySessionToken(undefined)).toBeNull();
    expect(auth.verifySessionToken("")).toBeNull();
    expect(auth.verifySessionToken("nodothere")).toBeNull();
    expect(auth.verifySessionToken("...")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const auth = await freshAuth(BASE);
    // Hand-build an expired body and sign it the way the module would.
    const { createHmac } = await import("crypto");
    const body = Buffer.from(
      JSON.stringify({
        u: "operator@example.com",
        exp: Math.floor(Date.now() / 1000) - 60,
        pv: null,
      }),
      "utf8",
    ).toString("base64url");
    const sig = createHmac("sha256", BASE.DASHBOARD_AUTH_SECRET!)
      .update(body)
      .digest("base64url");
    expect(auth.verifySessionToken(`${body}.${sig}`)).toBeNull();
  });

  it("accepts a token signed with the PREVIOUS secret during rotation", async () => {
    const old = await freshAuth({ ...BASE, DASHBOARD_AUTH_SECRET: "old-secret-0123456789abcdef" });
    const oldToken = old.createSessionToken("operator@example.com");

    const rotated = await freshAuth({
      ...BASE,
      DASHBOARD_AUTH_SECRET: "new-secret-0123456789abcdef",
      DASHBOARD_AUTH_SECRET_PREVIOUS: "old-secret-0123456789abcdef",
    });
    expect(rotated.verifySessionToken(oldToken)?.username).toBe("operator@example.com");
  });

  it("invalidates every session when the password changes", async () => {
    const before = await freshAuth(BASE);
    const token = before.createSessionToken("operator@example.com");

    const after = await freshAuth({ ...BASE, DASHBOARD_AUTH_PASSWORD: "a-different-password" });
    expect(after.verifySessionToken(token)).toBeNull();
  });
});

describe("validateCredentials", () => {
  it("accepts the configured pair", async () => {
    const auth = await freshAuth(BASE);
    expect(auth.validateCredentials("operator@example.com", "unit-test-password")).toBe(true);
  });

  it("treats an email username as case-insensitive", async () => {
    const auth = await freshAuth(BASE);
    expect(auth.validateCredentials("Operator@Example.com", "unit-test-password")).toBe(true);
  });

  it("rejects a wrong password and a wrong username", async () => {
    const auth = await freshAuth(BASE);
    expect(auth.validateCredentials("operator@example.com", "wrong")).toBe(false);
    expect(auth.validateCredentials("someone@else.com", "unit-test-password")).toBe(false);
  });

  it("rejects an empty password even when the env password is empty", async () => {
    const auth = await freshAuth({ ...BASE, DASHBOARD_AUTH_PASSWORD: "" });
    expect(auth.validateCredentials("operator@example.com", "")).toBe(false);
    expect(auth.validateCredentials("operator@example.com", "anything")).toBe(false);
  });

  it("falls back to password-only when no username is configured", async () => {
    const auth = await freshAuth({ ...BASE, DASHBOARD_AUTH_USERNAME: "" });
    expect(auth.validateCredentials("", "unit-test-password")).toBe(true);
    expect(auth.validateCredentials("anyone", "unit-test-password")).toBe(true);
    expect(auth.validateCredentials("anyone", "wrong")).toBe(false);
  });
});
