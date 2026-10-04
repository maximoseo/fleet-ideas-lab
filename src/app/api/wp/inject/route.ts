import { NextRequest, NextResponse, after } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { checkHonesty } from "@/lib/honesty";
import { recordInjection, markInjectionsRemoved } from "@/lib/injection-registry";
import type { SiteProfile } from "@/lib/types";
import {
  MAX_HTML_CHARS,
  buildStyleBlock,
  sanitizeCss,
  stripPreviousInjections,
  wrapPrototype,
  MARKER_PREFIX,
} from "@/lib/wp-content";
import {
  badRequest,
  checkWpTarget,
  isShortString,
  parseId,
  readJsonBody,
  statusFor,
  upstreamDetail,
  wpFetch,
  wpPreflight,
} from "@/lib/wp-safe";

export const maxDuration = 30;

interface InjectBody {
  url: string;
  username: string;
  appPassword: string;
  pageId: number;
  /** Quick CSS tweak mode: a style block appended to the existing content. */
  css?: string;
  /** Prototype mode: a full generated page body replacing the content. */
  html?: string;
  /** Required alongside `html` so the honesty checks can re-run server-side. */
  profile?: SiteProfile;
  mode: "draft" | "inject";
  styleName?: string;
  /**
   * Live-overwrite guard. The operator must type the target page's slug; the
   * server compares it against the slug WordPress reports for that page ID.
   */
  confirmSlug?: string;
}

/**
 * POST /api/wp/inject
 *
 * Two modes:
 * - "draft":  Creates a DRAFT copy of the page with the design applied.
 *             Zero risk — the live page is never touched.
 * - "inject": Appends a scoped <style> block to the live page content.
 *             The original content is backed up and returned in the response.
 *             Previous design-lab injections are replaced (not stacked).
 */
export async function POST(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "write");
  if (blocked) return blocked;
  try {
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const body = raw as unknown as InjectBody;
    const { url, username, appPassword, css, html, profile, mode, styleName, confirmSlug } = body;
    const pageId = parseId(body.pageId);

    if (!url || !username || !appPassword || !body.pageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isShortString(username) || !isShortString(appPassword) || pageId === null) {
      return badRequest("Invalid username, application password or page id");
    }
    if (!css && !html) {
      return NextResponse.json({ error: "Either css or html is required" }, { status: 400 });
    }
    if ((css !== undefined && typeof css !== "string") || (html !== undefined && typeof html !== "string")) {
      return badRequest("css and html must be strings");
    }
    if (mode !== "draft" && mode !== "inject") {
      return NextResponse.json({ error: "Mode must be 'draft' or 'inject'" }, { status: 400 });
    }
    if (html && html.length > MAX_HTML_CHARS) return badRequest(`HTML too large (max ${MAX_HTML_CHARS} characters)`, 413);
    let safeCss = "";
    if (css) {
      const checked = sanitizeCss(css);
      if (!checked.ok) return badRequest(checked.error, checked.error.startsWith("CSS too large") ? 413 : 400);
      safeCss = checked.css;
    }

    /**
     * Content-honesty gate.
     *
     * Re-run server-side rather than trusting a flag from the browser. A
     * prototype that fabricates testimonials, prices or product imagery must
     * never reach a client's site — not as a draft either, because drafts get
     * published. Refusing here is the whole point of the check.
     */
    if (html) {
      if (!profile?.copy) {
        return NextResponse.json(
          { error: "A site profile must accompany generated HTML so its content can be verified." },
          { status: 400 },
        );
      }
      const honesty = checkHonesty(html, profile);
      if (honesty.length) {
        return NextResponse.json(
          {
            error: "This prototype failed the content-honesty check and was not sent to WordPress.",
            code: "honesty_failed",
            problems: honesty,
            hint: "Regenerate this direction. Publishing fabricated testimonials, prices or stock imagery to a client's site is not recoverable by a revision restore.",
          },
          { status: 422 },
        );
      }
    }

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    // 1. Fetch the current page
    const pageRes = await wpFetch(`${apiBase}/pages/${pageId}?context=edit`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!pageRes.ok) {
      const err = await upstreamDetail(pageRes);
      return NextResponse.json({ error: `Could not fetch page: ${pageRes.status} ${err}`.trim() }, { status: statusFor(pageRes) });
    }
    const page = await pageRes.json();
    const originalContent: string = page.content?.raw || page.content?.rendered || "";
    const pageTitle: string = page.title?.raw || page.title?.rendered || "Untitled";
    const pageSlug: string = page.slug || "";

    // 2. Build the new content
    const cleanContent = stripPreviousInjections(originalContent);
    const injectId = `${Date.now().toString(36)}`;
    const styledContent = html
      ? wrapPrototype(html, injectId, { bodyAttrs: true })
      : cleanContent + buildStyleBlock(safeCss, injectId);

    if (mode === "draft") {
      // ── SAFE MODE: create a draft copy ──
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
        return NextResponse.json({ error: `Could not create draft: ${draftRes.status} ${err}`.trim() }, { status: statusFor(draftRes) });
      }
      const draft = await draftRes.json();
      // Registry after the response — never blocks the WP result
      after(() => recordInjection({
        site_url: base.origin,
        page_id: draft.id,
        page_slug: pageSlug,
        marker_id: injectId,
        mode: "draft",
        style_name: styleName || null,
        status: "draft",
      }));
      return NextResponse.json({
        ok: true,
        mode: "draft",
        draftId: draft.id,
        draftEditUrl: `${base.origin}/wp-admin/post.php?post=${draft.id}&action=edit`,
        message: "Draft created. The live page was NOT touched. Review the draft in WP admin and publish when ready.",
        backup: null,
      });
    }

    // ── INJECT MODE: update the live page ──
    //
    // Two-step gate. The operator must type the page's slug and the server
    // checks it against the slug WordPress reports for that ID, so a mis-clicked
    // dropdown cannot overwrite the wrong page. Draft mode is the default and
    // needs none of this.
    if (!confirmSlug || confirmSlug.trim().toLowerCase() !== pageSlug.trim().toLowerCase()) {
      return NextResponse.json(
        {
          error: "Live overwrite requires the page slug to be typed exactly.",
          code: "confirm_slug_required",
          expectedSlugLength: pageSlug.length,
          pageTitle,
          pageId,
          hint: "Draft mode publishes nothing and needs no confirmation. Use it unless the live page must change now.",
        },
        { status: 428 },
      );
    }

    // Snapshot the current revision before overwriting, so a rollback target is
    // known to exist rather than assumed.
    let revisionIdBefore: number | null = null;
    try {
      const revRes = await wpFetch(`${apiBase}/pages/${pageId}/revisions?per_page=1`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (revRes.ok) {
        const revs = await revRes.json();
        revisionIdBefore = Array.isArray(revs) && revs[0]?.id ? revs[0].id : null;
      }
    } catch {
      // Non-fatal: the inline backup below is still returned.
    }

    const updateRes = await wpFetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: styledContent }),
      signal: AbortSignal.timeout(20000),
    });
    if (!updateRes.ok) {
      const err = await upstreamDetail(updateRes);
      return NextResponse.json({ error: `Could not update page: ${updateRes.status} ${err}`.trim() }, { status: statusFor(updateRes) });
    }
    const updated = await updateRes.json();

    // Registry after the response — never blocks the WP result
    after(() => recordInjection({
      site_url: base.origin,
      page_id: pageId,
      page_slug: pageSlug,
      marker_id: injectId,
      mode: "inject",
      style_name: styleName || null,
      status: "live",
    }));

    return NextResponse.json({
      ok: true,
      mode: "inject",
      pageId,
      pageUrl: updated.link || page.link,
      injectId,
      revisionIdBefore,
      message: "Live page updated. The original content is backed up below and a WordPress revision was recorded before the change.",
      backup: {
        originalContent,
        strippedContent: cleanContent,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Injection failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}

/**
 * DELETE /api/wp/inject
 * Removes a design-lab style block from a page (rollback).
 */
export async function DELETE(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "write");
  if (blocked) return blocked;
  try {
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const { url, username, appPassword } = raw;
    const pageId = parseId(raw.pageId);
    if (!url || !username || !appPassword || !raw.pageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isShortString(username) || !isShortString(appPassword) || pageId === null) {
      return badRequest("Invalid username, application password or page id");
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

    const pageRes = await wpFetch(`${apiBase}/pages/${pageId}?context=edit`, { headers, signal: AbortSignal.timeout(15000) });
    if (!pageRes.ok) return NextResponse.json({ error: "Could not fetch page" }, { status: statusFor(pageRes) });
    const page = await pageRes.json();
    const content: string = page.content?.raw || "";

    if (!content.includes(MARKER_PREFIX)) {
      return NextResponse.json({ ok: true, removed: false, message: "No Fleet Ideas Lab styles found on this page." });
    }

    const cleaned = stripPreviousInjections(content);
    if (cleaned === content) {
      return NextResponse.json(
        { ok: false, removed: false, error: "Found a Fleet Ideas Lab marker but no complete block to remove. Restore a WordPress revision instead." },
        { status: 409 },
      );
    }
    // A full-page prototype injection REPLACES the page body, so stripping its
    // block leaves nothing. Writing an empty page is data loss, not a rollback.
    if (!cleaned.trim()) {
      return NextResponse.json(
        {
          ok: false,
          removed: false,
          error: "This page body was replaced by a prototype; removing the block would leave it empty. Restore a WordPress revision instead (GET/POST /api/wp/revisions).",
        },
        { status: 409 },
      );
    }
    const updateRes = await wpFetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: cleaned }),
      signal: AbortSignal.timeout(20000),
    });
    if (!updateRes.ok) return NextResponse.json({ error: "Could not update page" }, { status: statusFor(updateRes) });

    // Registry after the response
    after(() => markInjectionsRemoved(base.origin, pageId));

    return NextResponse.json({ ok: true, removed: true, message: "Fleet Ideas Lab styles removed. Page restored to its original styling." });
  } catch (err) {
    return NextResponse.json({ error: "Rollback failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
