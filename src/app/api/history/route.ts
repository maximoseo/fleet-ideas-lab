import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * /api/history — Supabase fallback for History 20
 *
 * - GET: returns persisted analyses for the logged-in user (if Supabase configured)
 * - POST: persists a single entry (if Supabase configured)
 *
 * If Supabase env vars are not set or @supabase/supabase-js is not installed,
 * both handlers gracefully fall back to noop (no crash) — caller keeps localStorage.
 */

function supabaseEnv(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  // basic sanity — must look like https://
  if (!url.startsWith("http")) return null;
  return { url: url.trim(), key: key.trim() };
}

async function getSupabaseClient(): Promise<unknown | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    // Dynamic import — package is optional; if not installed, fallback to noop
    const mod = await import("@supabase/supabase-js" as string);
    const createClient = (mod as unknown as { createClient: (u: string, k: string) => unknown }).createClient;
    if (typeof createClient !== "function") return null;
    return createClient(env.url, env.key);
  } catch {
    return null;
  }
}

export async function GET() {
  // Require auth for Supabase read — anonymous users stay localStorage-only
  let client: unknown = null;
  try {
    await requireUser();
    client = await getSupabaseClient();
  } catch {
    // not logged in or no supabase — return empty, let client use localStorage
    return NextResponse.json({ entries: [], supabase: false });
  }

  if (!client) {
    return NextResponse.json({ entries: [], supabase: false });
  }

  try {
    const supa = client as {
      from: (t: string) => {
        select: (s: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };
    const { data, error } = await supa
      .from("design_analyses")
      .select("id, url, title, screenshot, tokens, score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ entries: [], supabase: true, error: String(error) });
    }
    const entries = (data as unknown[]) ?? [];
    // Map DB rows to HistoryEntry shape (tokens already JSONB)
    const mapped = (entries as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id ?? ""),
      url: String(r.url ?? ""),
      title: String(r.title ?? r.url ?? ""),
      screenshot: (r.screenshot as string | null) ?? null,
      tokens: (r.tokens as Record<string, unknown>) ?? null,
      score: (r.score as number | null) ?? null,
      created_at: String(r.created_at ?? new Date().toISOString()),
      // denormalized for UI
      platform: (r.tokens as Record<string, unknown>)?.platform as string | undefined,
      colors: ((r.tokens as Record<string, unknown>)?.colors as string[]) ?? [],
      fonts: ((r.tokens as Record<string, unknown>)?.fonts as string[]) ?? [],
    }));
    return NextResponse.json({ entries: mapped, supabase: true });
  } catch (e) {
    return NextResponse.json({ entries: [], supabase: true, error: String(e) });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Require auth to write — otherwise localStorage-only, but still return ok
  let user: { username: string } | null = null;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: true, supabase: false, reason: "not_logged_in" });
  }

  const client = await getSupabaseClient();
  if (!client || !user) {
    return NextResponse.json({ ok: true, supabase: false, reason: "not_configured" });
  }

  // Minimal validation — id, url required
  const id = String(body.id || "").slice(0, 100) || Math.random().toString(36).slice(2, 10);
  const url = String(body.url || "").slice(0, 2000);
  if (!url) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });

  const row = {
    id,
    url,
    title: String(body.title || url).slice(0, 500),
    screenshot: (body.screenshot as string | null) ?? null,
    tokens: (body.tokens as Record<string, unknown>) ?? (body.profile as Record<string, unknown>) ?? {},
    score: (body.score as number | null) ?? (body.slopScore as number | null) ?? null,
    created_at: (body.created_at as string) || new Date().toISOString(),
    user: user.username,
  };

  try {
    const supa = client as {
      from: (t: string) => {
        upsert: (r: unknown) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await supa.from("design_analyses").upsert(row);
    if (error) {
      return NextResponse.json({ ok: false, supabase: true, error: String(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, supabase: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, supabase: true, error: String(e) }, { status: 500 });
  }
}
