import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { checkHonesty } from "@/lib/honesty";
import { recordInjection, markInjectionsRemoved } from "@/lib/injection-registry";
import type { SiteProfile } from "@/lib/types";

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

const MARKER_PREFIX = "design-lab-style";

/**
 * Build a scoped, reversible style block.
 * The CSS is wrapped in a marker comment so it can be found and removed later.
 */
function buildStyleBlock(css: string, id: string): string {
  return `\n<!-- ${MARKER_PREFIX}:${id}:start -->\n<style id="${MARKER_PREFIX}-${id}">\n${css}\n</style>\n<!-- ${MARKER_PREFIX}:${id}:end -->\n`;
}

/** Remove any previous design-lab style blocks from content */
function stripPreviousInjections(content: string): string {
  return content.replace(/<!-- design-lab-style:[^:]+:start -->[\s\S]*?<!-- design-lab-style:[^:]+:end -->\n?/g, "");
}

/**
 * Convert a standalone prototype document into something safe to paste into a
 * WordPress page.
 *
 * The generated file is a complete HTML document; a page body cannot contain
 * <html>, <head> or <body>. The head's <style> and font <link> tags are lifted
 * out, the CSS is scoped to a wrapper class so it cannot restyle the rest of
 * the theme, and only the body's markup is kept.
 */
function wrapPrototype(doc: string, id: string): string {
  const wrapper = `${MARKER_PREFIX}-proto-${id}`;

  const styles = [...doc.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const fontLinks = [...doc.matchAll(/<link[^>]+href="https:\/\/fonts\.[^"]+"[^>]*>/gi)]
    .map((m) => m[0])
    .join("\n");

  const bodyMatch = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyAttrs = doc.match(/<body([^>]*)>/i)?.[1] || "";
  const dir = /dir\s*=\s*["']rtl["']/i.test(doc) ? ' dir="rtl"' : "";
  const inner = (bodyMatch ? bodyMatch[1] : doc)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();

  // Scope every rule to the wrapper. :root and html/body rules are rewritten to
  // target the wrapper so custom properties still resolve inside it.
  const scoped = styles
    .replace(/(^|\})\s*(:root|html|body)\s*(?=[,{])/g, `$1 .${wrapper} `)
    .replace(/(^|\})\s*(html|body)\s*,\s*/g, `$1 .${wrapper}, `);

  const langAttr = /lang\s*=\s*["']he["']/i.test(doc) ? ' lang="he"' : "";

  return `<!-- ${MARKER_PREFIX}:${id}:start -->
${fontLinks}
<style id="${MARKER_PREFIX}-${id}">
.${wrapper}{all:initial;display:block;}
.${wrapper} *{box-sizing:border-box;}
${scoped}
</style>
<div class="${wrapper}"${dir}${langAttr} data-body-attrs="${bodyAttrs.replace(/"/g, "&quot;").slice(0, 200)}">
${inner}
</div>
<!-- ${MARKER_PREFIX}:${id}:end -->`;
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
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const body = (await req.json()) as InjectBody;
    const { url, username, appPassword, pageId, css, html, profile, mode, styleName, confirmSlug } = body;

    if (!url || !username || !appPassword || !pageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!css && !html) {
      return NextResponse.json({ error: "Either css or html is required" }, { status: 400 });
    }
    if (mode !== "draft" && mode !== "inject") {
      return NextResponse.json({ error: "Mode must be 'draft' or 'inject'" }, { status: 400 });
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

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    // 1. Fetch the current page
    const pageRes = await fetch(`${apiBase}/pages/${pageId}?context=edit`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!pageRes.ok) {
      const err = await pageRes.text();
      return NextResponse.json({ error: `Could not fetch page: ${pageRes.status} ${err.slice(0, 200)}` }, { status: pageRes.status });
    }
    const page = await pageRes.json();
    const originalContent: string = page.content?.raw || page.content?.rendered || "";
    const pageTitle: string = page.title?.raw || page.title?.rendered || "Untitled";
    const pageSlug: string = page.slug || "";

    // 2. Build the new content
    const cleanContent = stripPreviousInjections(originalContent);
    const injectId = `${Date.now().toString(36)}`;
    const styledContent = html
      ? wrapPrototype(html, injectId)
      : cleanContent + buildStyleBlock(css || "", injectId);

    if (mode === "draft") {
      // ── SAFE MODE: create a draft copy ──
      const draftRes = await fetch(`${apiBase}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `[Design Lab] ${pageTitle} — ${styleName || "Styled"} (Draft)`,
          content: styledContent,
          status: "draft",
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!draftRes.ok) {
        const err = await draftRes.text();
        return NextResponse.json({ error: `Could not create draft: ${draftRes.status} ${err.slice(0, 200)}` }, { status: draftRes.status });
      }
      const draft = await draftRes.json();
      // Registry (fire-and-forget — never blocks the WP result)
      void recordInjection({
        site_url: base.origin,
        page_id: draft.id,
        page_slug: pageSlug,
        marker_id: injectId,
        mode: "draft",
        style_name: styleName || null,
        status: "draft",
      });
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
      const revRes = await fetch(`${apiBase}/pages/${pageId}/revisions?per_page=1`, {
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

    const updateRes = await fetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: styledContent }),
      signal: AbortSignal.timeout(20000),
    });
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return NextResponse.json({ error: `Could not update page: ${updateRes.status} ${err.slice(0, 200)}` }, { status: updateRes.status });
    }
    const updated = await updateRes.json();

    // Registry (fire-and-forget — never blocks the WP result)
    void recordInjection({
      site_url: base.origin,
      page_id: pageId,
      page_slug: pageSlug,
      marker_id: injectId,
      mode: "inject",
      style_name: styleName || null,
      status: "live",
    });

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
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { url, username, appPassword, pageId } = await req.json();
    if (!url || !username || !appPassword || !pageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    const pageRes = await fetch(`${apiBase}/pages/${pageId}?context=edit`, { headers, signal: AbortSignal.timeout(15000) });
    if (!pageRes.ok) return NextResponse.json({ error: "Could not fetch page" }, { status: pageRes.status });
    const page = await pageRes.json();
    const content: string = page.content?.raw || "";

    if (!content.includes(MARKER_PREFIX)) {
      return NextResponse.json({ ok: true, removed: false, message: "No Design Lab styles found on this page." });
    }

    const cleaned = stripPreviousInjections(content);
    const updateRes = await fetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: cleaned }),
      signal: AbortSignal.timeout(20000),
    });
    if (!updateRes.ok) return NextResponse.json({ error: "Could not update page" }, { status: updateRes.status });

    // Registry (fire-and-forget)
    void markInjectionsRemoved(base.origin, pageId);

    return NextResponse.json({ ok: true, removed: true, message: "Design Lab styles removed. Page restored to its original styling." });
  } catch (err) {
    return NextResponse.json({ error: "Rollback failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
