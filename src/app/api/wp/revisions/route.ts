import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";

export const maxDuration = 30;

/**
 * GET /api/wp/revisions?url=...&username=...&appPassword=...&pageId=...
 * Lists WordPress revisions for a page (for rollback).
 */
export async function GET(req: NextRequest) {
  // Auth guard: middleware also covers /api, this is defence in depth.
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const username = searchParams.get("username");
    const appPassword = searchParams.get("appPassword");
    const pageId = searchParams.get("pageId");

    if (!url || !username || !appPassword || !pageId) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "User-Agent": "DesignLab/1.0",
    };

    const res = await fetch(`${apiBase}/pages/${pageId}/revisions?per_page=20`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      return NextResponse.json({ error: `Could not fetch revisions: ${res.status} ${body}` }, { status: res.status });
    }

    const revisions = await res.json();
    return NextResponse.json({
      ok: true,
      pageId: Number(pageId),
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
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { url, username, appPassword, pageId, revisionId } = await req.json();
    if (!url || !username || !appPassword || !pageId || !revisionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json/wp/v2`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    // Get the revision content
    const revRes = await fetch(`${apiBase}/pages/${pageId}/revisions/${revisionId}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!revRes.ok) return NextResponse.json({ error: "Revision not found" }, { status: 404 });

    const revision = await revRes.json();

    // Restore by updating the page with revision content
    const updateRes = await fetch(`${apiBase}/pages/${pageId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: revision.content?.raw || revision.content?.rendered || "",
        title: revision.title?.raw || undefined,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!updateRes.ok) return NextResponse.json({ error: "Could not restore revision" }, { status: updateRes.status });

    return NextResponse.json({ ok: true, message: `Restored revision #${revisionId}` });
  } catch (err) {
    return NextResponse.json({ error: "Restore failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
