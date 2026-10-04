import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  // after() needs a request scope; run the callback inline for tests.
  after: (fn: () => unknown) => {
    void fn();
  },
}));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) }));

const requireUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUser: () => requireUser(),
  unauthorized: () => Response.json({ error: "Authentication required" }, { status: 401 }),
}));
const recordInjection = vi.fn<(r: unknown) => Promise<void>>(async () => {});
const markInjectionsRemoved = vi.fn<(site: string, id: number) => Promise<void>>(async () => {});
vi.mock("@/lib/injection-registry", () => ({
  recordInjection: (r: unknown) => recordInjection(r),
  markInjectionsRemoved: (site: string, id: number) => markInjectionsRemoved(site, id),
}));

import * as batch from "./batch/route";
import * as connect from "./connect/route";
import * as inject from "./inject/route";
import * as injections from "./injections/route";
import * as revisions from "./revisions/route";
import * as themeCss from "./theme-css/route";
import { __resetThrottle } from "@/lib/rateLimit";
import { __resetWpSafeCache } from "@/lib/wp-safe";

const CREDS = { url: "https://client.example.com", username: "admin", appPassword: "abcd efgh ijkl mnop" };

function post(path: string, body: unknown, method = "POST", headers: Record<string, string> = {}) {
  return new NextRequest(`https://lab.example.com/api/wp/${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
let calls: { url: string; init: RequestInit }[] = [];
function stubWp(handler: Handler) {
  calls = [];
  vi.stubGlobal("fetch", async (input: URL | string, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  });
}
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
const page = (over: Record<string, unknown> = {}) => ({
  id: 7,
  slug: "about",
  title: { raw: "About" },
  link: "https://client.example.com/about/",
  content: { raw: "<p>orig</p>" },
  ...over,
});

beforeEach(() => {
  vi.unstubAllGlobals();
  requireUser.mockReset();
  requireUser.mockResolvedValue({ username: "op" });
  recordInjection.mockClear();
  markInjectionsRemoved.mockClear();
  __resetThrottle();
  __resetWpSafeCache();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("authentication", () => {
  it("every handler answers 401 without a session and never touches the network", async () => {
    requireUser.mockRejectedValue(new Error("no"));
    stubWp(() => json({}));
    const get = new NextRequest("https://lab.example.com/api/wp/x?url=a");
    const results = await Promise.all([
      batch.POST(post("batch", {})),
      connect.POST(post("connect", {})),
      inject.POST(post("inject", {})),
      inject.DELETE(post("inject", {}, "DELETE")),
      revisions.GET(get),
      revisions.POST(post("revisions", {})),
      themeCss.POST(post("theme-css", {})),
      themeCss.DELETE(post("theme-css", {}, "DELETE")),
      injections.GET(get),
      injections.PATCH(post("injections", {}, "PATCH")),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(10).fill(401));
    expect(calls).toHaveLength(0);
  });
});

describe("target validation (SSRF)", () => {
  const bad = ["http://169.254.169.254", "http://localhost:3000", "http://10.0.0.1", "file:///etc/passwd", "http://[::1]"];
  it.each(bad)("inject, batch, connect, theme-css and revisions refuse %s", async (url) => {
    stubWp(() => json(page()));
    const c = { ...CREDS, url };
    const rs = await Promise.all([
      inject.POST(post("inject", { ...c, pageId: 7, css: "a{}", mode: "draft" })),
      inject.DELETE(post("inject", { ...c, pageId: 7 }, "DELETE")),
      batch.POST(post("batch", { ...c, pageIds: [7], css: "a{}", mode: "draft" })),
      connect.POST(post("connect", c)),
      themeCss.POST(post("theme-css", { ...c, css: "a{}" })),
      themeCss.DELETE(post("theme-css", c, "DELETE")),
      revisions.POST(post("revisions", { ...c, pageId: 7, revisionId: 9 })),
      revisions.GET(new NextRequest(`https://lab.example.com/api/wp/revisions?${new URLSearchParams({ ...c, pageId: "7" })}`)),
    ]);
    expect(rs.map((r) => r.status)).toEqual(Array(8).fill(400));
    expect(calls).toHaveLength(0);
  });

  it("does not echo the application password in any response", async () => {
    stubWp(() => json(page()));
    const r = await inject.POST(post("inject", { ...CREDS, url: "http://127.0.0.1", pageId: 7, css: "a{}", mode: "draft" }));
    expect(JSON.stringify(await r.json())).not.toContain("abcd");
  });
});

describe("POST /api/wp/inject", () => {
  it("rejects path-traversal page ids before any fetch", async () => {
    stubWp(() => json(page()));
    for (const pageId of ["../posts/5", "7/../../users/me", "7?x=1", -1, 0, 1.5]) {
      const r = await inject.POST(post("inject", { ...CREDS, pageId, css: "a{}", mode: "draft" }));
      expect(r.status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("rejects CSS that would close the style block, and oversized payloads", async () => {
    stubWp(() => json(page()));
    const r1 = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}</style><script>x()</script>", mode: "draft" }));
    expect(r1.status).toBe(400);
    const r2 = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a".repeat(300_001), mode: "draft" }));
    expect(r2.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it("refuses foreign Origin (403), non-JSON (415) and malformed JSON (400)", async () => {
    stubWp(() => json(page()));
    const body = { ...CREDS, pageId: 7, css: "a{}", mode: "draft" };
    expect((await inject.POST(post("inject", body, "POST", { origin: "https://evil.example.org" }))).status).toBe(403);
    expect((await inject.POST(post("inject", body, "POST", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await inject.POST(post("inject", "{not json"))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("creates a draft, registers it, and leaves the live page alone", async () => {
    stubWp((url, init) => (init.method === "POST" ? json({ id: 99 }) : json(page())));
    const r = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "h1{color:red}", mode: "draft", styleName: "Bold" }));
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data).toMatchObject({ ok: true, mode: "draft", draftId: 99, backup: null });
    expect(calls.filter((c) => c.init.method === "POST").map((c) => c.url)).toEqual(["https://client.example.com/wp-json/wp/v2/pages"]);
    expect(recordInjection).toHaveBeenCalledWith(expect.objectContaining({ page_id: 99, mode: "draft", status: "draft" }));
  });

  it("requires the typed slug for a live overwrite, then writes, snapshots and registers", async () => {
    stubWp((url, init) => {
      if (init.method === "POST") return json({ link: "https://client.example.com/about/" });
      if (url.includes("/revisions")) return json([{ id: 55 }]);
      return json(page());
    });
    const miss = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}", mode: "inject", confirmSlug: "nope" }));
    expect(miss.status).toBe(428);
    expect(calls.some((c) => c.init.method === "POST")).toBe(false);

    const ok = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}", mode: "inject", confirmSlug: "About" }));
    expect(ok.status).toBe(200);
    const data = await ok.json();
    expect(data).toMatchObject({ ok: true, mode: "inject", pageId: 7, revisionIdBefore: 55 });
    expect(data.backup.originalContent).toBe("<p>orig</p>");
    const write = calls.find((c) => c.init.method === "POST")!;
    expect(JSON.parse(String(write.init.body)).content).toContain("<p>orig</p>");
    expect(JSON.parse(String(write.init.body)).content).toContain("design-lab-style:");
    expect(recordInjection).toHaveBeenCalledWith(expect.objectContaining({ page_id: 7, mode: "inject", status: "live" }));
  });

  it("does not leak upstream error bodies", async () => {
    stubWp(() => new Response("<html>INTERNAL SERVICE SECRET admin panel</html>", { status: 500 }));
    const r = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}", mode: "draft" }));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toMatch(/SECRET|html/i);
  });

  it("surfaces WordPress's own error code and message", async () => {
    stubWp(() => json({ code: "rest_post_invalid_id", message: "Invalid post ID." }, 404));
    const r = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}", mode: "draft" }));
    expect(r.status).toBe(404);
    expect((await r.json()).error).toContain("rest_post_invalid_id");
  });

  it("reports a redirected write as an error instead of a silent success", async () => {
    stubWp((url, init) =>
      init.method === "POST"
        ? new Response(null, { status: 301, headers: { location: "https://www.client.example.com/wp-json/wp/v2/pages/7" } })
        : url.includes("/revisions")
          ? json([])
          : json(page()),
    );
    const r = await inject.POST(post("inject", { ...CREDS, pageId: 7, css: "a{}", mode: "inject", confirmSlug: "about" }));
    expect(r.status).toBe(502);
    expect(recordInjection).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/wp/inject (rollback)", () => {
  it("removes a style block", async () => {
    const marked = "<p>orig</p>\n<!-- design-lab-style:abc:start -->\n<style>a{}</style>\n<!-- design-lab-style:abc:end -->\n";
    stubWp((url, init) => (init.method === "POST" ? json({}) : json(page({ content: { raw: marked } }))));
    const r = await inject.DELETE(post("inject", { ...CREDS, pageId: 7 }, "DELETE"));
    expect(await r.json()).toMatchObject({ ok: true, removed: true });
    expect(JSON.parse(String(calls.find((c) => c.init.method === "POST")!.init.body)).content).toBe("<p>orig</p>\n");
    expect(markInjectionsRemoved).toHaveBeenCalledWith("https://client.example.com", 7);
  });

  it("refuses to blank a page whose body was a prototype", async () => {
    const proto = "<!-- design-lab-style:abc:start -->\n<div>proto</div>\n<!-- design-lab-style:abc:end -->";
    stubWp(() => json(page({ content: { raw: proto } })));
    const r = await inject.DELETE(post("inject", { ...CREDS, pageId: 7 }, "DELETE"));
    expect(r.status).toBe(409);
    expect(calls.some((c) => c.init.method === "POST")).toBe(false);
    expect(markInjectionsRemoved).not.toHaveBeenCalled();
  });

  it("does not claim success when only an orphan marker is present", async () => {
    stubWp(() => json(page({ content: { raw: "<p>x</p><!-- design-lab-style:abc:start -->" } })));
    const r = await inject.DELETE(post("inject", { ...CREDS, pageId: 7 }, "DELETE"));
    expect(r.status).toBe(409);
    expect(calls.some((c) => c.init.method === "POST")).toBe(false);
  });
});

describe("POST /api/wp/batch", () => {
  const body = { ...CREDS, css: "a{}", mode: "inject", confirmSlug: "__batch__" };

  it("validates pageIds: array of positive integers, de-duplicated, max 100", async () => {
    stubWp(() => json(page()));
    expect((await batch.POST(post("batch", { ...body, pageIds: "1,2,3" }))).status).toBe(400);
    expect((await batch.POST(post("batch", { ...body, pageIds: [1, "../x"] }))).status).toBe(400);
    expect((await batch.POST(post("batch", { ...body, pageIds: Array.from({ length: 101 }, (_, i) => i + 1) }))).status).toBe(400);
    expect(calls).toHaveLength(0);

    stubWp((url, init) => (init.method === "POST" ? json({ link: "l" }) : json(page())));
    const r = await batch.POST(post("batch", { ...body, pageIds: [7, 7, "7"] }));
    expect((await r.json()).total).toBe(1);
    expect(calls.filter((c) => c.init.method === "POST")).toHaveLength(1);
  });

  it("one page failing at the network level does not discard the others (no 500)", async () => {
    stubWp((url, init) => {
      if (url.includes("/pages/2")) throw new TypeError("fetch failed");
      return init.method === "POST" ? json({ link: "l" }) : json(page({ id: 1 }));
    });
    const r = await batch.POST(post("batch", { ...body, pageIds: [1, 2, 3] }));
    expect(r.status).toBe(200);
    const data = await r.json();
    expect(data).toMatchObject({ ok: false, total: 3, okCount: 2, failCount: 1 });
    expect(data.results.find((x: { pageId: number }) => x.pageId === 2)).toMatchObject({ ok: false });
    expect(recordInjection).toHaveBeenCalledTimes(2);
    expect(recordInjection).toHaveBeenCalledWith(expect.objectContaining({ page_id: 1, mode: "inject", status: "live" }));
  });

  it("checks the slug per page unless the UI wildcard is sent", async () => {
    stubWp((url, init) => (init.method === "POST" ? json({ link: "l" }) : json(page())));
    const r = await batch.POST(post("batch", { ...body, confirmSlug: "wrong", pageIds: [7] }));
    const data = await r.json();
    expect(data.failCount).toBe(1);
    expect(data.results[0].error).toMatch(/Slug mismatch/);
    expect(calls.some((c) => c.init.method === "POST")).toBe(false);
  });

  it("registers drafts too, and keeps the response shape", async () => {
    stubWp((url, init) => (init.method === "POST" ? json({ id: 123 }) : json(page())));
    const r = await batch.POST(post("batch", { ...CREDS, css: "a{}", mode: "draft", pageIds: [7] }));
    expect(await r.json()).toMatchObject({
      ok: true,
      mode: "draft",
      total: 1,
      okCount: 1,
      failCount: 0,
      results: [{ pageId: 7, ok: true, draftId: 123, draftEditUrl: "https://client.example.com/wp-admin/post.php?post=123&action=edit" }],
    });
    expect(recordInjection).toHaveBeenCalledWith(expect.objectContaining({ page_id: 123, status: "draft" }));
  });
});

describe("POST /api/wp/theme-css", () => {
  it("does not treat a 200 from /settings that ignores the field as success", async () => {
    stubWp((url) => {
      if (url.endsWith("/wp/v2/settings")) return json({ title: "Site" });
      if (url.includes("/custom-css")) return json({ code: "rest_no_route", message: "No route" }, 404);
      return json("0");
    });
    const r = await themeCss.POST(post("theme-css", { ...CREDS, css: "a{}", mode: "theme" }));
    expect(r.status).toBe(502);
    expect((await r.json()).error).toMatch(/nothing was written/);
  });

  it("succeeds when the setting is echoed back, and returns the backup", async () => {
    stubWp((url, init) =>
      init.method === "POST"
        ? json({ custom_css_additional_css: "written" })
        : json({ custom_css_additional_css: "body{margin:0}" }),
    );
    const r = await themeCss.POST(post("theme-css", { ...CREDS, css: "a{}", mode: "theme" }));
    expect(await r.json()).toMatchObject({ ok: true, mode: "theme", via: "customize_save:settings", backup: "body{margin:0}" });
  });

  it("does not accept admin-ajax '-1' or {success:false} as success", async () => {
    for (const reply of [new Response("-1"), json({ success: false })]) {
      stubWp((url) => {
        if (url.endsWith("/wp/v2/settings")) return json({});
        if (url.includes("/custom-css")) return json({}, 404);
        return reply.clone();
      });
      const r = await themeCss.POST(post("theme-css", { ...CREDS, css: "a{}" }));
      expect(r.status).toBe(502);
    }
  });

  it("cannot be used to break out of the marker comment via `mode`", async () => {
    stubWp((url, init) => (init.method === "POST" ? json({ custom_css_additional_css: "x" }) : json({})));
    await themeCss.POST(post("theme-css", { ...CREDS, css: "a{}", mode: "*/ body{display:none} /*" }));
    const write = calls.find((c) => c.init.method === "POST")!;
    const sent = JSON.parse(String(write.init.body)).custom_css_additional_css as string;
    expect(sent).toContain("/* Mode: theme */");
    expect(sent).not.toContain("display:none");
  });
});

describe("/api/wp/revisions", () => {
  it("accepts credentials via headers as well as the legacy query string", async () => {
    stubWp(() => json([{ id: 1, date: "d", content: { rendered: "<p>x</p>" }, title: { rendered: "t" } }]));
    const q = new URLSearchParams({ url: CREDS.url, pageId: "7" });
    const r = await revisions.GET(
      new NextRequest(`https://lab.example.com/api/wp/revisions?${q}`, {
        headers: { "x-wp-username": "admin", "x-wp-app-password": "secret pass" },
      }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).revisions[0]).toMatchObject({ id: 1, excerpt: "x" });
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Basic " + Buffer.from("admin:secret pass").toString("base64"));
  });

  it("restores from the RAW revision (context=edit) and clears the registry when the injection is gone", async () => {
    stubWp((url, init) =>
      init.method === "POST"
        ? json({})
        : json({ parent: 7, content: { raw: "<!-- wp:paragraph --><p>orig</p><!-- /wp:paragraph -->", rendered: "<p>orig</p>" }, title: { raw: "About" } }),
    );
    const r = await revisions.POST(post("revisions", { ...CREDS, pageId: 7, revisionId: 55 }));
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe("https://client.example.com/wp-json/wp/v2/pages/7/revisions/55?context=edit");
    expect(JSON.parse(String(calls[1].init.body)).content).toContain("wp:paragraph");
    expect(markInjectionsRemoved).toHaveBeenCalledWith("https://client.example.com", 7);
  });

  it("refuses to blank a page from an empty/unreadable revision, and a revision of another page", async () => {
    stubWp(() => json({ parent: 7, content: { rendered: "<p>only rendered</p>" } }));
    const r1 = await revisions.POST(post("revisions", { ...CREDS, pageId: 7, revisionId: 55 }));
    expect(r1.status).toBe(409);
    stubWp(() => json({ parent: 8, content: { raw: "<p>x</p>" } }));
    const r2 = await revisions.POST(post("revisions", { ...CREDS, pageId: 7, revisionId: 55 }));
    expect(r2.status).toBe(404);
    expect(calls.some((c) => c.init.method === "POST")).toBe(false);
  });

  it("rejects traversal in revisionId", async () => {
    stubWp(() => json({}));
    const r = await revisions.POST(post("revisions", { ...CREDS, pageId: 7, revisionId: "1/../../users/me" }));
    expect(r.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("/api/wp/connect", () => {
  it("returns the same shape for a reachable WordPress site", async () => {
    stubWp((url) =>
      url.endsWith("/wp/v2/types")
        ? json({})
        : url.includes("users/me")
          ? json({ capabilities: { edit_pages: true } })
          : url.includes("/pages")
            ? json([{ id: 7, title: { rendered: "About" }, link: "l" }])
            : new Response('<title>Client</title><meta name="generator" content="WordPress 6.5.2">'),
    );
    const r = await connect.POST(post("connect", CREDS));
    expect(await r.json()).toEqual({
      ok: true, isWordPress: true, siteName: "Client", wpVersion: "6.5.2", restEnabled: true,
      authenticated: true, canEdit: true, pages: [{ id: 7, title: "About", link: "l" }],
    });
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the per-user write budget is spent", async () => {
    stubWp(() => json(page()));
    let last: Response | undefined;
    for (let i = 0; i < 61; i++) last = await inject.POST(post("inject", { ...CREDS, pageId: 7 })); // 400s still count
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("/api/wp/injections", () => {
  it("rejects a cross-origin PATCH before touching the registry", async () => {
    const r = await injections.PATCH(post("injections", { id: "1", status: "removed" }, "PATCH", { origin: "https://evil.example.org" }));
    expect(r.status).toBe(403);
  });
});
