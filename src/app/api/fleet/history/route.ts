import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function baseDir(): string {
  return process.env.VERCEL === "1" ? "/tmp" : "/root/projects";
}
function historyPath(): string {
  return path.join(baseDir(), "fleet-history.json");
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key || !url.startsWith("http")) return null;
  return { url: url.trim(), key: key.trim() };
}
async function getSupabaseClient(): Promise<unknown | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const mod = await import("@supabase/supabase-js" as string);
    const createClient = (mod as unknown as { createClient: (u: string, k: string) => unknown }).createClient;
    if (typeof createClient !== "function") return null;
    return createClient(env.url, env.key);
  } catch { return null; }
}

type Entry = {
  id: string;
  kind: "scaffold" | "copy" | "idea_status" | "note";
  slug: string;
  ideaId?: string;
  title?: string;
  dir?: string;
  mode?: string;
  targetSlug?: string;
  gapScore?: number;
  user?: string;
  created_at: string;
  meta?: Record<string, unknown>;
};

function readFileEntries(): Entry[] {
  try {
    const fp = historyPath();
    if (!fs.existsSync(fp)) return [];
    const raw = fs.readFileSync(fp, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Entry[]) : [];
  } catch { return []; }
}
function writeFileEntries(entries: Entry[]): void {
  const fp = historyPath();
  try { fs.mkdirSync(path.dirname(fp), { recursive: true }); } catch {}
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

export async function GET() {
  let user: { username: string } | null = null;
  try { user = await requireUser(); } catch { return NextResponse.json({ entries: [], supabase: false, reason: "not_logged_in" }); }

  const client = await getSupabaseClient();
  if (client) {
    try {
      const supa = client as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: unknown }> } } } };
      const { data, error } = await supa.from("fleet_history").select("*").order("created_at", { ascending: false }).limit(50);
      if (!error && Array.isArray(data)) {
        const mapped = (data as Entry[]).map((r) => ({ ...r }));
        return NextResponse.json({ entries: mapped, supabase: true, mode: "supabase" });
      }
    } catch {}
  }
  // file fallback — filter to this user when possible
  const all = readFileEntries();
  const mine = user ? all.filter((e) => !e.user || e.user === user.username) : all;
  return NextResponse.json({ entries: mine.slice(-50).reverse(), supabase: false, mode: process.env.VERCEL === "1" ? "vercel-tmp" : "hostinger-json", path: historyPath() });
}

export async function POST(req: NextRequest) {
  let user: { username: string } | null = null;
  try { user = await requireUser(); } catch { return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 }); }
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const kind = String(body.kind || "note").slice(0, 20) as Entry["kind"];
  const slug = String(body.slug || body.ideaSlug || "").slice(0, 48);
  if (!slug) return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });

  const entry: Entry = {
    id: String(body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
    kind: (["scaffold","copy","idea_status","note"] as const).includes(kind as unknown as typeof kind) ? kind : "note",
    slug,
    ideaId: body.ideaId ? String(body.ideaId).slice(0, 48) : undefined,
    title: body.title ? String(body.title).slice(0, 200) : undefined,
    dir: body.dir ? String(body.dir).slice(0, 500) : undefined,
    mode: body.mode ? String(body.mode).slice(0, 30) : undefined,
    targetSlug: body.targetSlug ? String(body.targetSlug).slice(0, 48) : undefined,
    gapScore: typeof body.gapScore === "number" ? body.gapScore : undefined,
    user: user.username,
    created_at: new Date().toISOString(),
    meta: (body.meta as Record<string, unknown>) || undefined,
  };

  const client = await getSupabaseClient();
  if (client) {
    try {
      const supa = client as { from: (t: string) => { upsert: (r: unknown) => Promise<{ error: unknown }> } };
      const { error } = await supa.from("fleet_history").upsert(entry);
      if (!error) return NextResponse.json({ ok: true, supabase: true, id: entry.id });
    } catch {}
  }
  const all = readFileEntries();
  all.push(entry);
  // keep last 200
  const trimmed = all.slice(-200);
  try { writeFileEntries(trimmed); } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 500 }); }
  return NextResponse.json({ ok: true, supabase: false, id: entry.id, mode: process.env.VERCEL === "1" ? "vercel-tmp" : "hostinger-json", path: historyPath() });
}
