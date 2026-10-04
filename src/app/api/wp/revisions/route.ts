import { NextRequest, NextResponse, after } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { markInjectionsRemoved } from "@/lib/injection-registry";
import { MARKER_PREFIX } from "@/lib/wp-content";
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

/**
 * GET /api/wp/revisions?url=...&username=...&appPassword=...&pageId=...
 * Lists WordPress revisions for a page (for rollback).
 *
 * The credentials are also accepted as `x-wp-username` / `x-wp-app-password`
 * headers, which is the preferred form: a query string ends up in access logs,
 * browser history and Referer headers, a header does not. The query form is
 * kept for the current UI.
 */
export async function GET(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "connect", false);
  if (blocked) return blocked;
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const username = req.headers.get("x-wp-username") || searchParams.get("username");
    const appPassword = req.headers.get("x-wp-app-password") || searchParams.get("appPassword");
    const pageParam = searchParams.get("pageId");

    if (!url || !username || !appPassword || !pageParam) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }
    const pageId = parseId(pageParam);
    if (pageId === null || !isShortString(username) || !isShortString(appPassword)) {
      return badRequest("Invalid username, application password or page id");
    }

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "User-Agent": "DesignLab/1.0",
    };

    const res = await wpFetch(`${apiBase}/pages/${pageId}/revisions?per_page=20`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await upstreamDetail(res);
      return NextResponse.json({ error: `Could not fetch revisions: ${res.status} ${body}`.trim() }, { status: statusFor(res) });
    }

    const revisions = await res.json();
    return NextResponse.json({
      ok: true,
      pageId,
      count: Array.isArray(revisions) ? revisions.length : 0,
      revisions: (Array.isArray(revisions) ? revisions : []).map(
        (r: { id: number; date: string; date_gmt?: string; title?: { rendered?: string }; author?: number; content?: { rendered?: string } }) => ({
          id: r.id,
          date: r.date,
          date_gmt: r.date_gmt || r.date,
          title: r.title?.rendered || "",
          author: r.author,
          excerpt: (r.content?.rendered || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120),
        }),
      ),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}

/**
 * POST /api/wp/revisions — Restore a specific revision
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
    const { url, username, appPassword } = raw;
    if (!url || !username || !appPassword || !raw.pageId || !raw.revisionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const pageId = parseId(raw.pageId);
    const revisionId = parseId(raw.revisionId);
    if (pageId === null || revisionId === null || !isShortString(username) || !isShortString(appPassword)) {
      return badRequest("Invalid username, application password, page id or revision id");
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

    // Get the revision content
    // context=edit: without it WordPress returns only content.rendered (shortcodes
    // expanded, block comments gone) and a "restore" would write that lossy HTML.
    const revRes = await wpFetch(`${apiBase}/pages/${pageId}/revisions/${revisionId}?context=edit`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!revRes.ok) return NextResponse.json({ error: "Revision not found" }, { status: 404 });

    const revision = await revRes.json();
    if (revision.parent !== undefined && Number(revision.parent) !== pageId) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }
    const restoredContent: string = typeof revision.content?.raw === "string" ? revision.content.raw : "";
    if (!restoredContent.trim()) {
      return NextResponse.json(
        { error: "That revision has no raw content (or the account cannot read it); refusing to blank the page." },
        { status: 409 },
      );
    }

    // Restore by updating the page with revision content
    const updateRes = await wpFetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: restoredContent,
        title: revision.title?.raw || undefined,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!updateRes.ok) return NextResponse.json({ error: "Could not restore revision" }, { status: statusFor(updateRes) });

    // The registry says "live" for this page; if the restored content carries no
    // design-lab block, that is no longer true.
    if (!restoredContent.includes(MARKER_PREFIX)) {
      after(() => markInjectionsRemoved(base.origin, pageId));
    }

    return NextResponse.json({ ok: true, message: `Restored revision #${revisionId}` });
  } catch (err) {
    return NextResponse.json({ error: "Restore failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
