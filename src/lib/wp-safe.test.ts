import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

import { lookup } from "node:dns/promises";
import {
  __resetWpSafeCache,
  checkMutationRequest,
  checkWpTarget,
  isPrivateIp,
  parseId,
  parseWpTarget,
  statusFor,
  upstreamDetail,
  wpFetch,
  WpTargetError,
} from "./wp-safe";

const lookupMock = vi.mocked(lookup) as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  __resetWpSafeCache();
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => vi.unstubAllGlobals());

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254", "64:ff9b::a00:1", "2002:7f00:1::1",
  ])("blocks %s", (ip) => expect(isPrivateIp(ip)).toBe(true));

  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPrivateIp(ip)).toBe(false),
  );
});

describe("parseWpTarget", () => {
  it("adds https:// to a bare host and keeps http(s) URLs", () => {
    expect(parseWpTarget("example.com").origin).toBe("https://example.com");
    expect(parseWpTarget("http://example.com/some/path").origin).toBe("http://example.com");
    expect(parseWpTarget("  https://Example.com:8443 ").origin).toBe("https://example.com:8443");
  });

  it.each([
    "http://localhost", "https://localhost:8080", "http://127.0.0.1", "http://[::1]/", "http://169.254.169.254/latest/meta-data",
    "http://2130706433", "http://0x7f.1", "http://0177.0.0.1", "http://10.1.2.3", "http://[::ffff:127.0.0.1]",
    "http://metadata", "http://foo.internal", "http://printer.local", "http://a.localhost",
    "file:///etc/passwd", "ftp://example.com", "gopher://example.com", "javascript:alert(1)", "httpx://example.com",
    "", "   ", "http://", "https://exa mple.com",
  ])("rejects %j", (raw) => expect(() => parseWpTarget(raw)).toThrow(WpTargetError));

  it("rejects non-strings", () => {
    expect(() => parseWpTarget(undefined)).toThrow(WpTargetError);
    expect(() => parseWpTarget({ toString: () => "example.com" })).toThrow(WpTargetError);
    expect(() => parseWpTarget(["example.com"])).toThrow(WpTargetError);
  });
});

describe("checkWpTarget (DNS)", () => {
  it("blocks a public name that resolves to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]);
    const r = await checkWpTarget("evil.example.com");
    expect(r.ok).toBe(false);
  });
  it("blocks unresolvable hosts and accepts public ones", async () => {
    lookupMock.mockRejectedValueOnce(new Error("ENOTFOUND"));
    expect((await checkWpTarget("nope.example.com")).ok).toBe(false);
    expect((await checkWpTarget("example.com")).ok).toBe(true);
  });
});

describe("wpFetch redirects", () => {
  function stubFetch(responses: Response[]) {
    const fn = vi.fn(async () => responses.shift() as Response);
    vi.stubGlobal("fetch", fn);
    return fn;
  }
  const redirect = (to: string, status = 302) => new Response(null, { status, headers: { location: to } });

  it("never follows a redirect to a private host", async () => {
    stubFetch([redirect("http://169.254.169.254/latest/meta-data")]);
    await expect(wpFetch("https://example.com/wp-json")).rejects.toThrow(WpTargetError);
  });

  it("follows a public redirect and drops Authorization cross-origin", async () => {
    const fn = stubFetch([redirect("https://other.example.org/wp-json"), new Response("{}", { status: 200 })]);
    const res = await wpFetch("https://example.com/wp-json", { headers: { Authorization: "Basic abc" } });
    expect(res.status).toBe(200);
    const second = fn.mock.calls[1] as unknown as [URL, RequestInit];
    expect(new Headers(second[1].headers).has("authorization")).toBe(false);
    expect((fn.mock.calls[0] as unknown as [URL, RequestInit])[1].redirect).toBe("manual");
  });

  it("keeps Authorization on a same-origin redirect", async () => {
    const fn = stubFetch([redirect("/wp-json/v2"), new Response("{}", { status: 200 })]);
    await wpFetch("https://example.com/wp-json", { headers: { Authorization: "Basic abc" } });
    const second = fn.mock.calls[1] as unknown as [URL, RequestInit];
    expect(new Headers(second[1].headers).get("authorization")).toBe("Basic abc");
  });

  it("does not replay a write across a redirect", async () => {
    const fn = stubFetch([redirect("https://example.com/other", 301)]);
    const res = await wpFetch("https://example.com/wp-json/wp/v2/pages/1", { method: "POST", body: "{}" });
    expect(res.status).toBe(301);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("caps redirect hops", async () => {
    stubFetch(Array.from({ length: 6 }, () => redirect("https://example.com/again")));
    await expect(wpFetch("https://example.com/")).rejects.toThrow(/Too many redirects/);
  });
});

describe("upstreamDetail / statusFor", () => {
  it("surfaces only WordPress code + message, stripped of markup", async () => {
    const res = new Response(JSON.stringify({ code: "rest_forbidden", message: "Sorry <b>no</b>\n", data: { secret: "x" } }));
    expect(await upstreamDetail(res)).toBe("rest_forbidden Sorry no");
  });
  it("returns nothing for HTML or foreign bodies", async () => {
    expect(await upstreamDetail(new Response("<html>internal admin page</html>"))).toBe("");
    expect(await upstreamDetail(new Response(JSON.stringify({ secret: "AKIA..." })))).toBe("");
  });
  it("caps the length", async () => {
    const res = new Response(JSON.stringify({ code: "c", message: "m".repeat(5000) }));
    expect((await upstreamDetail(res)).length).toBeLessThanOrEqual(200);
  });
  it("maps non-error upstream statuses to 502", () => {
    expect(statusFor({ status: 404 })).toBe(404);
    expect(statusFor({ status: 301 })).toBe(502);
    expect(statusFor({ status: 200 })).toBe(502);
  });
});

describe("parseId", () => {
  it("accepts positive integers and digit strings", () => {
    expect(parseId(12)).toBe(12);
    expect(parseId("12")).toBe(12);
  });
  it.each(["../posts/5", "1/../users/me", "1?x=1", "1&status=eq.live", "0", "-3", 1.5, NaN, null, undefined, {}, [], "", "1e3", "99999999999999999999"])(
    "rejects %j",
    (v) => expect(parseId(v)).toBeNull(),
  );
});

describe("checkMutationRequest", () => {
  const mk = (headers: Record<string, string>) =>
    new Request("https://app.example.com/api/wp/inject", { method: "POST", headers });

  it("allows same-origin JSON and Origin-less callers", () => {
    expect(checkMutationRequest(mk({ "content-type": "application/json", origin: "https://app.example.com", host: "app.example.com" }))).toBeNull();
    expect(checkMutationRequest(mk({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });
  it("refuses a foreign Origin with 403", () => {
    const r = checkMutationRequest(mk({ "content-type": "application/json", origin: "https://evil.example.org", host: "app.example.com" }));
    expect(r?.status).toBe(403);
  });
  it("refuses non-JSON content types with 415", () => {
    expect(checkMutationRequest(mk({ "content-type": "text/plain" }))?.status).toBe(415);
    expect(checkMutationRequest(mk({ "content-type": "application/x-www-form-urlencoded" }))?.status).toBe(415);
    expect(checkMutationRequest(mk({}))?.status).toBe(415);
  });
});
