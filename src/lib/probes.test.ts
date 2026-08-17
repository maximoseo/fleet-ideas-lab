import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { probeUrl, runFleetProbes } from "./probes";

/**
 * probeUrl decides whether a dashboard is up. Two behaviours matter and neither
 * was covered: a 405/403/501 on HEAD must be retried as GET before the site is
 * called broken (several fleet apps answer exactly that way), and a network
 * error must become a result rather than an exception.
 */
const realFetch = globalThis.fetch;

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; method: string }[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit = {}) => {
    calls.push({ url: String(url), method: String(init.method || "GET") });
    return handler(String(url), init);
  }) as typeof fetch;
  return calls;
}

describe("probeUrl", () => {
  it("treats 2xx as healthy", async () => {
    mockFetch(() => new Response(null, { status: 200 }));
    const r = await probeUrl("https://example.test");
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
    expect(r.error).toBeNull();
  });

  it("treats a 3xx redirect as healthy", async () => {
    mockFetch(() => new Response(null, { status: 307 }));
    expect((await probeUrl("https://example.test")).ok).toBe(true);
  });

  it("treats 4xx and 5xx as a failure with an http_ reason", async () => {
    mockFetch(() => new Response(null, { status: 500 }));
    const r = await probeUrl("https://example.test");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("http_500");
  });

  it.each([405, 403, 501])("retries %i on HEAD as a GET before judging", async (status) => {
    const calls = mockFetch((_url, init) =>
      init.method === "HEAD" ? new Response(null, { status }) : new Response(null, { status: 200 }),
    );
    const r = await probeUrl("https://example.test");
    expect(calls.map((c) => c.method)).toEqual(["HEAD", "GET"]);
    expect(r.ok).toBe(true);
  });

  it("does not retry a 404", async () => {
    const calls = mockFetch(() => new Response(null, { status: 404 }));
    await probeUrl("https://example.test");
    expect(calls).toHaveLength(1);
  });

  it("returns a result instead of throwing on a network error", async () => {
    mockFetch(() => {
      throw new Error("getaddrinfo ENOTFOUND example.test");
    });
    const r = await probeUrl("https://example.test");
    expect(r.ok).toBe(false);
    expect(r.status).toBeNull();
    expect(r.error).toContain("ENOTFOUND");
  });

  it("reports an abort as a timeout", async () => {
    mockFetch(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    expect((await probeUrl("https://example.test")).error).toBe("timeout");
  });
});

describe("runFleetProbes without persistence", () => {
  it("claims nothing when there is nothing to probe", async () => {
    const out = await runFleetProbes([]);
    expect(out).toEqual({ probed: 0, transitions: [], states: {}, persisted: false });
  });

  it("reports per-target state and never claims a transition it cannot know", async () => {
    mockFetch((url) =>
      url.includes("bad") ? new Response(null, { status: 500 }) : new Response(null, { status: 200 }),
    );
    const out = await runFleetProbes([
      { slug: "good", name: "Good", url: "https://good.test" },
      { slug: "bad", name: "Bad", url: "https://bad.test" },
    ]);
    expect(out.probed).toBe(2);
    expect(out.states).toEqual({ good: "healthy", bad: "degraded" });
    // No database, so no previous state — a transition claim would be a lie.
    expect(out.transitions).toEqual([]);
    expect(out.persisted).toBe(false);
  });
});
