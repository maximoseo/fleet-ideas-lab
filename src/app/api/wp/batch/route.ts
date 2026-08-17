import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { checkHonesty } from "@/lib/honesty";
import { adaptCssForBuilders, detectBuilders } from "@/lib/wp-detect";
import type { SiteProfile } from "@/lib/types";

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

const MARKER_PREFIX = "design-lab-style";

function buildStyleBlock(css: string, id: string): string {
  return `\n<!-- ${MARKER_PREFIX}:${id}:start -->\n<style id="${MARKER_PREFIX}-${id}">\n${css}\n</style>\n<!-- ${MARKER_PREFIX}:${id}:end -->\n`;
}

function stripPreviousInjections(content: string): string {
  return content.replace(/<!-- design-lab-style:[^:]+:start -->[\s\S]*?<!-- design-lab-style:[^:]+:end -->\n?/g, "");
}

function wrapPrototype(doc: string, id: string): string {
  const wrapper = `${MARKER_PREFIX}-proto-${id}`;
  const styles = [...doc.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const fontLinks = [...doc.matchAll(/<link[^>]+href="https:\/\/fonts\.[^"]+"[^>]*>/gi)].map((m) => m[0]).join("\n");
  const bodyMatch = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const dir = /dir\s*=\s*["']rtl["']/i.test(doc) ? ' dir="rtl"' : "";
  const inner = (bodyMatch ? bodyMatch[1] : doc).replace(/<script[\s\S]*?<\/script>/gi, "").trim();
  const scoped = styles
    .replace(/(^|\})\s*(:root|html|body)\s*(?=[,{])/g, `$1 .${wrapper} `)
    .replace(/(^|\})\s*(html|body)\s*,\s*/g, `$1 .${wrapper}, `);
  const langAttr = /lang\s*=\s*["']he["']/i.test(doc) ? ' lang="he"' : "";
  return `<!-- ${MARKER_PREFIX}:${id}:start -->\n${fontLinks}\n<style id="${MARKER_PREFIX}-${id}">\n.${wrapper}{all:initial;display:block;}\n.${wrapper} *{box-sizing:border-box;}\n${scoped}\n</style>\n<div class="${wrapper}"${dir}${langAttr}>\n${inner}\n</div>\n<!-- ${MARKER_PREFIX}:${id}:end -->`;
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
): Promise<{ pageId: number; ok: boolean; message?: string; error?: string; draftId?: number; draftEditUrl?: string; pageUrl?: string }> {
  // fetch page
  const pageRes = await fetch(`${apiBase}/pages/${pageId}?context=edit`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!pageRes.ok) {
    const err = await pageRes.text();
    return { pageId, ok: false, error: `Fetch failed ${pageRes.status}: ${err.slice(0, 150)}` };
  }
  const page = await pageRes.json();
  const originalContent: string = page.content?.raw || page.content?.rendered || "";
  const pageTitle: string = page.title?.raw || page.title?.rendered || "Untitled";
  const pageSlug: string = page.slug || "";

  const cleanContent = stripPreviousInjections(originalContent);
  const injectId = `${Date.now().toString(36)}-${pageId}`;
  const styledContent = html ? wrapPrototype(html, injectId) : cleanContent + buildStyleBlock(adaptedCss || "", injectId);

  if (mode === "draft") {
    const draftRes = await fetch(`${apiBase}/pages`, {
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
      const err = await draftRes.text();
      return { pageId, ok: false, error: `Draft failed ${draftRes.status}: ${err.slice(0, 150)}` };
    }
    const draft = await draftRes.json();
    return {
      pageId,
      ok: true,
      message: `Draft for "${pageTitle}"`,
      draftId: draft.id,
      draftEditUrl: `${baseOrigin}/wp-admin/post.php?post=${draft.id}&action=edit`,
    };
  }

  // inject mode needs slug confirmation if pageIds > 1 we still check per-page slug?
  // For batch inject, require confirmSlug to be empty or match each page's slug is impractical.
  // So batch inject requires confirmSlug === "__batch__" or we skip slug check and add warning.
  if (confirmSlug !== "__batch__" && (!confirmSlug || confirmSlug.trim().toLowerCase() !== pageSlug.trim().toLowerCase())) {
    // For batch, allow __batch__ as wildcard confirmation; otherwise fail this page
    if (confirmSlug === "__batch__") {
      // fall through
    } else {
      return { pageId, ok: false, error: `Slug mismatch for page #${pageId} ("${pageTitle}" slug is "${pageSlug}")` };
    }
  }

  const updateRes = await fetch(`${apiBase}/pages/${pageId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content: styledContent }),
    signal: AbortSignal.timeout(20000),
  });
  if (!updateRes.ok) {
    const err = await updateRes.text();
    return { pageId, ok: false, error: `Update failed ${updateRes.status}: ${err.slice(0, 150)}` };
  }
  const updated = await updateRes.json();
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
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const body = (await req.json()) as BatchBody;
    const { url, username, appPassword, pageIds, css, html, profile, mode, styleName, confirmSlug } = body;
    if (!url || !username || !appPassword || !pageIds?.length) {
      return NextResponse.json({ error: "Missing required fields (url, username, appPassword, pageIds)" }, { status: 400 });
    }
    if (!css && !html) return NextResponse.json({ error: "Either css or html is required" }, { status: 400 });
    if (mode !== "draft" && mode !== "inject") return NextResponse.json({ error: "Mode must be draft or inject" }, { status: 400 });
    if (pageIds.length > 100) return NextResponse.json({ error: "Too many pages (max 100)" }, { status: 400 });

    if (html) {
      if (!profile?.copy) return NextResponse.json({ error: "profile required with html" }, { status: 400 });
      const honesty = checkHonesty(html, profile);
      if (honesty.length) return NextResponse.json({ error: "Honesty check failed", code: "honesty_failed", problems: honesty }, { status: 422 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
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
        const sampleRes = await fetch(`${apiBase}/pages/${pageIds[0]}?context=edit`, { headers, signal: AbortSignal.timeout(10000) });
        if (sampleRes.ok) {
          const j = await sampleRes.json();
          sampleHtml = j.content?.raw || j.content?.rendered || "";
        }
      } catch {}
      const detection = detectBuilders(sampleHtml);
      adaptedCss = adaptCssForBuilders(css, detection);
    }

    const limit = pLimit<ReturnType<typeof processPage> extends Promise<infer U> ? U : never>(3);
    const tasks = pageIds.map((id) => limit(() => processPage(apiBase, headers, id, adaptedCss, html, profile, mode, styleName, base.origin, confirmSlug)));
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
