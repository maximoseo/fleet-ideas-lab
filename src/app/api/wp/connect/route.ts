import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { badRequest, checkWpTarget, isShortString, readJsonBody, readTextCapped, wpFetch, wpPreflight } from "@/lib/wp-safe";

export const maxDuration = 30;

/**
 * POST /api/wp/connect
 * Body: { url, username?, appPassword? }
 * Tests WordPress REST API connectivity.
 * Works without auth (public info) or with Application Password (full access).
 */
export async function POST(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "connect");
  if (blocked) return blocked;
  try {
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const { url, username, appPassword } = raw;
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
    if ((username !== undefined && username !== "" && !isShortString(username)) || (appPassword !== undefined && appPassword !== "" && !isShortString(appPassword))) {
      return badRequest("Invalid username or application password");
    }

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
    const apiBase = `${base.origin}/wp-json`;

    // 1. Test public REST API
    let siteName = "";
    let wpVersion = "";
    let restEnabled = false;
    try {
      const res = await wpFetch(`${apiBase}/wp/v2/types`, {
        headers: { "User-Agent": "DesignLab/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      restEnabled = res.ok;
    } catch { /* continue */ }

    // 2. Get site info
    try {
      const res = await wpFetch(base.origin, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DesignLab/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      // Cap the homepage read: only <title> and the generator meta are used.
      const html = await readTextCapped(res, 512 * 1024);
      siteName = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
      wpVersion = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']WordPress\s*([\d.]+)["']/i)?.[1] || "";
      if (!restEnabled && (html.includes("wp-content") || html.includes("wp-includes"))) {
        return NextResponse.json({
          ok: false,
          isWordPress: true,
          siteName,
          wpVersion,
          error: "WordPress detected but REST API is disabled or blocked.",
        });
      }
    } catch { /* continue */ }

    if (!restEnabled) {
      return NextResponse.json({
        ok: false,
        isWordPress: false,
        error: "Could not reach the WordPress REST API. Make sure this is a WordPress site.",
      });
    }

    // 3. Test auth if credentials provided
    let authenticated = false;
    let canEdit = false;
    let pages: { id: number; title: string; link: string }[] = [];
    if (username && appPassword) {
      try {
        const authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
        const meRes = await wpFetch(`${apiBase}/wp/v2/users/me?context=edit`, {
          headers: { Authorization: authHeader, "User-Agent": "DesignLab/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        authenticated = meRes.ok;
        if (meRes.ok) {
          const me = await meRes.json();
          canEdit = (me.capabilities?.edit_pages || me.capabilities?.manage_options || false) as boolean;
        }

        // Get pages for injection target selection — full list for batch
        const pagesRes = await wpFetch(`${apiBase}/wp/v2/pages?per_page=100&status=publish`, {
          headers: { Authorization: authHeader, "User-Agent": "DesignLab/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        if (pagesRes.ok) {
          const raw = await pagesRes.json();
          pages = raw.map((p: { id: number; title?: { rendered?: string }; link?: string }) => ({
            id: p.id,
            title: p.title?.rendered || `Page #${p.id}`,
            link: p.link || "",
          }));
        }
      } catch { /* auth failed */ }
    }

    return NextResponse.json({
      ok: true,
      isWordPress: true,
      siteName,
      wpVersion,
      restEnabled,
      authenticated,
      canEdit,
      pages,
    });
  } catch (err) {
    return NextResponse.json({ error: "Connection failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
