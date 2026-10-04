import { NextRequest, NextResponse, after } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { checkHonesty } from "@/lib/honesty";
import { adaptCssForBuilders, detectBuilders } from "@/lib/wp-detect";
import type { SiteProfile } from "@/lib/types";
import { recordInjection } from "@/lib/injection-registry";
import {
  MAX_BATCH_PAGES,
  MAX_HTML_CHARS,
  buildStyleBlock,
  sanitizeCss,
  stripPreviousInjections,
  wrapPrototype,
} from "@/lib/wp-content";
import {
  badRequest,
  checkWpTarget,
  isShortString,
  parseId,
  readJsonBody,
  upstreamDetail,
  wpFetch,
  wpPreflight,
} from "@/lib/wp-safe";

export const maxDuration = 60;

interface BatchBody {
  url: string;
  username: string;
  appPassword: string;
  pageIds: number[];
  css?: string;
  html?: string;
  profile?: SiteProfile;
  mode: "draft" | "inject";
  styleName?: string;
  confirmSlug?: string;
}

async function processPage(
  apiBase: string,
  headers: Record<string, string>,
  pageId: number,
  adaptedCss: string | null,
  html: string | undefined,
  profile: SiteProfile | undefined,
  mode: "draft" | "inject",
  styleName: string | undefined,
  baseOrigin: string,
  confirmSlug: string | undefined,
  deadline: number,
): Promise<{ pageId: number; ok: boolean; message?: string; error?: string; draftId?: number; draftEditUrl?: string; pageUrl?: string }> {
  // The function is killed at maxDuration with no response; stop starting new
  // pages in time to report what happened instead.
  if (Date.now() > deadline) return { pageId, ok: false, error: "Skipped: batch time budget exhausted, nothing was written for this page" };
  // fetch page
  const pageRes = await wpFetch(`${apiBase}/pages/${pageId}?context=edit`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!pageRes.ok) {
    const err = await upstreamDetail(pageRes);
    return { pageId, ok: false, error: `Fetch failed ${pageRes.status}: ${err}`.trim() };
  }
  const page = await pageRes.json();
  const originalContent: string = page.content?.raw || page.content?.rendered || "";
  const pageTitle: string = page.title?.raw || page.title?.rendered || "Untitled";
  const pageSlug: string = page.slug || "";

  const cleanContent = stripPreviousInjections(originalContent);
  const injectId = `${Date.now().toString(36)}-${pageId}`;
  const styledContent = html ? wrapPrototype(html, injectId) : cleanContent + buildStyleBlock(adaptedCss || "", injectId);

  if (mode === "draft") {
    const draftRes = await wpFetch(`${apiBase}/pages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `[Fleet Ideas Lab] ${pageTitle} — ${styleName || "Styled"} (Draft)`,
        content: styledContent,
        status: "draft",
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!draftRes.ok) {
      const err = await upstreamDetail(draftRes);
      return { pageId, ok: false, error: `Draft failed ${draftRes.status}: ${err}`.trim() };
    }
    const draft = await draftRes.json();
    after(() => recordInjection({
      site_url: baseOrigin,
      page_id: draft.id,
      page_slug: pageSlug,
      marker_id: injectId,
      mode: "draft",
      style_name: styleName || null,
      status: "draft",
    }));
    return {
      pageId,
      ok: true,
      message: `Draft for "${pageTitle}"`,
      draftId: draft.id,
      draftEditUrl: `${baseOrigin}/wp-admin/post.php?post=${draft.id}&action=edit`,
    };
  }

  // Batch live-overwrite: the UI sends the literal "__batch__" as an explicit
  // wildcard acknowledgement; any other value must match this page's slug.
  if (confirmSlug !== "__batch__" && (!confirmSlug || confirmSlug.trim().toLowerCase() !== pageSlug.trim().toLowerCase())) {
    return { pageId, ok: false, error: `Slug mismatch for page #${pageId} ("${pageTitle}" slug is "${pageSlug}")` };
  }

  const updateRes = await wpFetch(`${apiBase}/pages/${pageId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: styledContent }),
    signal: AbortSignal.timeout(20000),
  });
  if (!updateRes.ok) {
    const err = await upstreamDetail(updateRes);
    return { pageId, ok: false, error: `Update failed ${updateRes.status}: ${err}`.trim() };
  }
  const updated = await updateRes.json();
  after(() => recordInjection({
    site_url: baseOrigin,
    page_id: pageId,
    page_slug: pageSlug,
    marker_id: injectId,
    mode: "inject",
    style_name: styleName || null,
    status: "live",
  }));
  return { pageId, ok: true, message: `Updated "${pageTitle}"`, pageUrl: updated.link || page.link };
}

function pLimit<T>(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    const fn = queue.shift();
    if (fn) fn();
  };
  return (fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn().then((v) => { next(); resolve(v); }, (e) => { next(); reject(e); });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

/**
 * POST /api/wp/batch
 * Applies the same CSS/HTML variation to N pages with concurrency 3.
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "write");
  if (blocked) return blocked;
  try {
    const startedAt = Date.now();
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const { url, username, appPassword, css, html, profile, mode, styleName, confirmSlug } = raw as unknown as BatchBody;
    if (!url || !username || !appPassword || !Array.isArray(raw.pageIds) || !raw.pageIds.length) {
      return NextResponse.json({ error: "Missing required fields (url, username, appPassword, pageIds)" }, { status: 400 });
    }
    if (!isShortString(username) || !isShortString(appPassword)) return badRequest("Invalid username or application password");
    if (!css && !html) return NextResponse.json({ error: "Either css or html is required" }, { status: 400 });
    if ((css !== undefined && typeof css !== "string") || (html !== undefined && typeof html !== "string")) {
      return badRequest("css and html must be strings");
    }
    if (mode !== "draft" && mode !== "inject") return NextResponse.json({ error: "Mode must be draft or inject" }, { status: 400 });
    if (raw.pageIds.length > MAX_BATCH_PAGES) return NextResponse.json({ error: `Too many pages (max ${MAX_BATCH_PAGES})` }, { status: 400 });

    // Integer ids only (they go into URL paths), de-duplicated so one page is
    // never written twice concurrently.
    const parsedIds = raw.pageIds.map(parseId);
    if (parsedIds.some((id) => id === null)) return badRequest("pageIds must be positive integers");
    const pageIds = [...new Set(parsedIds as number[])];

    if (html && html.length > MAX_HTML_CHARS) return badRequest(`HTML too large (max ${MAX_HTML_CHARS} characters)`, 413);
    let safeCss = "";
    if (css) {
      const checked = sanitizeCss(css);
      if (!checked.ok) return badRequest(checked.error, checked.error.startsWith("CSS too large") ? 413 : 400);
      safeCss = checked.css;
    }

    if (html) {
      if (!profile?.copy) return NextResponse.json({ error: "profile required with html" }, { status: 400 });
      const honesty = checkHonesty(html, profile);
      if (honesty.length) return NextResponse.json({ error: "Honesty check failed", code: "honesty_failed", problems: honesty }, { status: 422 });
    }

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    // Adapt CSS for builder if css mode
    let adaptedCss: string | null = null;
    if (css) {
      // Fetch one page's HTML to detect builder (best-effort)
      let sampleHtml = "";
      try {
        const sampleRes = await wpFetch(`${apiBase}/pages/${pageIds[0]}?context=edit`, { headers, signal: AbortSignal.timeout(10000) });
        if (sampleRes.ok) {
          const j = await sampleRes.json();
          sampleHtml = j.content?.raw || j.content?.rendered || "";
        }
      } catch {}
      const detection = detectBuilders(sampleHtml);
      adaptedCss = adaptCssForBuilders(safeCss, detection);
    }

    // maxDuration is 60s; leave headroom to serialise the response.
    const deadline = startedAt + 50_000;
    type PageResult = Awaited<ReturnType<typeof processPage>>;
    const limit = pLimit<PageResult>(3);
    const tasks = pageIds.map((id) =>
      limit(async (): Promise<PageResult> => {
        // One page's network error / timeout must not discard the results of
        // pages that were already written to the live site.
        try {
          return await processPage(apiBase, headers, id, adaptedCss, html, profile, mode, styleName, base.origin, confirmSlug, deadline);
        } catch (err) {
          return { pageId: id, ok: false, error: `Request failed: ${err instanceof Error ? err.message : "unknown"}` };
        }
      }),
    );
    const results = await Promise.all(tasks);

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;

    return NextResponse.json({
      ok: failCount === 0,
      mode,
      total: results.length,
      okCount,
      failCount,
      results,
      message: failCount === 0 ? `All ${okCount} pages ${mode === "draft" ? "drafted" : "updated"}.` : `${okCount} succeeded, ${failCount} failed.`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Batch failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
