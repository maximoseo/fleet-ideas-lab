/**
 * History 20 — localStorage + Supabase fallback (P0.1.5)
 *
 * - Keeps max 20 entries (FIFO, newest first)
 * - Persists to localStorage synchronously (always)
 * - Attempts Supabase persistence via /api/history when logged in (fire-and-forget, no crash)
 * - Reopen: stores full entry under REOPEN_KEY and navigates to /redesign?reopen=<id>
 *
 * Hebrew summaries, English code (per spec).
 */

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  screenshot: string | null;
  tokens: Record<string, unknown> | null;
  score: number | null;
  created_at: string;
  // denormalized / UI convenience (kept for backward compat with existing page)
  platform?: string;
  colors?: string[];
  fonts?: string[];
  slopScore?: number | null;
  analyzedAt?: string;
  // full payload for reopen without re-fetch
  profile?: unknown;
  html?: string;
  screenshots?: { desktop: string | null; mobile: string | null } | null;
}

export const HISTORY_KEY = "design-lab-history";
export const REOPEN_KEY = "design-lab-last-analysis";
export const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// localStorage helpers (SSR-safe)
// ---------------------------------------------------------------------------

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // quota / private-mode — swallow, history is best-effort
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {}
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export function loadHistory(): HistoryEntry[] {
  const raw = safeGet(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  // FIFO 20 — newest first, slice
  const sliced = entries.slice(0, MAX_HISTORY);
  try {
    safeSet(HISTORY_KEY, JSON.stringify(sliced));
  } catch {}
}

export function clearHistory(): void {
  safeRemove(HISTORY_KEY);
  // also clear reopen pointer if it pointed to cleared data
  // leave REOPEN_KEY alone — it is per-entry, not the list
}

export function removeEntry(id: string): void {
  const next = loadHistory().filter((e) => e.id !== id);
  saveHistory(next);
  // if the removed entry was the reopen target, clear it
  try {
    const cur = safeGet(REOPEN_KEY);
    if (cur) {
      const parsed = JSON.parse(cur) as HistoryEntry;
      if (parsed.id === id) safeRemove(REOPEN_KEY);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Create + push (called after every successful /api/analyze)
// ---------------------------------------------------------------------------

export interface AnalyzePayload {
  url: string;
  title?: string;
  platform?: { platform: string; version?: string } | string;
  colors?: string[];
  fonts?: string[];
  screenshots?: { desktop: string | null; mobile: string | null } | null;
  profile?: unknown;
  html?: string;
  // slop score if already computed client-side may be passed separately
  slopScore?: number | null;
  score?: number | null;
}

function pickPlatform(p: AnalyzePayload["platform"]): string {
  if (!p) return "Unknown";
  if (typeof p === "string") return p;
  return p.platform || "Unknown";
}

export function createHistoryEntry(data: AnalyzePayload): HistoryEntry {
  const now = new Date().toISOString();
  const platform = pickPlatform(data.platform);
  // Try to derive screenshot from various shapes
  const screenshot =
    data.screenshots?.desktop ??
    (data as unknown as { screenshot?: string | null }).screenshot ??
    null;

  // score: explicit or slopScore
  const score =
    (data.score as number | null) ??
    (data.slopScore as number | null) ??
    null;

  // tokens: prefer full profile, else colors/fonts bundle
  const tokens =
    (data.profile as Record<string, unknown>) ??
    ({ colors: data.colors ?? [], fonts: data.fonts ?? [] } as Record<string, unknown>);

  const title = (data.title || data.url || "Untitled").toString().slice(0, 200);

  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    url: data.url,
    title,
    screenshot,
    tokens,
    score,
    created_at: now,
    // denormalized for UI
    platform,
    colors: data.colors ?? [],
    fonts: data.fonts ?? [],
    slopScore: score,
    analyzedAt: now,
    profile: data.profile ?? null,
    html: data.html ?? undefined,
    screenshots: data.screenshots ?? null,
  };
}

/**
 * Push a new analysis to history (localStorage first, then Supabase best-effort).
 * Returns the created entry.
 */
export function pushHistory(data: AnalyzePayload): HistoryEntry {
  const entry = createHistoryEntry(data);
  const existing = loadHistory();
  // deduplicate by URL — keep newest at top, remove older same-url entries
  const deduped = existing.filter((e) => e.url !== entry.url);
  const next = [entry, ...deduped].slice(0, MAX_HISTORY);
  saveHistory(next);
  // fire-and-forget Supabase persistence (no crash)
  void persistToSupabase(entry);
  return entry;
}

/**
 * Save an analyze response directly (alias for pushHistory, accepts the full
 * /api/analyze JSON). Computes slop score lazily if html is present but score missing.
 */
export function saveAnalyzeResult(data: AnalyzePayload): HistoryEntry {
  return pushHistory(data);
}

// ---------------------------------------------------------------------------
// Supabase fallback (via /api/history)
// ---------------------------------------------------------------------------

async function persistToSupabase(entry: HistoryEntry): Promise<void> {
  try {
    // Only attempt when fetch is available (browser) and we don't want to block
    if (typeof fetch === "undefined") return;
    // Fire to our own API — it decides whether Supabase is configured
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      // keepalive so it survives navigation
      keepalive: true,
    } as RequestInit);
  } catch {
    // swallow — localStorage already has it
  }
}

/**
 * Attempt to load merged history from Supabase (when logged in) + localStorage.
 * Falls back to localStorage only if Supabase is not configured or request fails.
 */
export async function loadHistoryMerged(): Promise<HistoryEntry[]> {
  const local = loadHistory();
  try {
    if (typeof fetch === "undefined") return local;
    const res = await fetch("/api/history", { method: "GET" });
    if (!res.ok) return local;
    const data = (await res.json()) as { entries?: HistoryEntry[]; supabase?: boolean };
    if (!data.entries || !Array.isArray(data.entries) || data.entries.length === 0) return local;
    // Merge: Supabase entries take precedence, dedup by id/url, cap 20
    const byUrl = new Map<string, HistoryEntry>();
    for (const e of [...data.entries, ...local]) {
      if (!byUrl.has(e.url)) byUrl.set(e.url, e);
    }
    const merged = Array.from(byUrl.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, MAX_HISTORY);
    // sync merged back to localStorage (best-effort)
    saveHistory(merged);
    return merged;
  } catch {
    return local;
  }
}

// ---------------------------------------------------------------------------
// Reopen helpers
// ---------------------------------------------------------------------------

export function setReopenEntry(entry: HistoryEntry): void {
  try {
    safeSet(REOPEN_KEY, JSON.stringify(entry));
  } catch {}
}

export function getReopenEntry(): HistoryEntry | null {
  const raw = safeGet(REOPEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HistoryEntry;
  } catch {
    return null;
  }
}

export function clearReopenEntry(): void {
  safeRemove(REOPEN_KEY);
}

/**
 * Reopen an entry: stores it as the current analysis and navigates.
 * Call from /history. The destination pages (/redesign, /audit, etc.) should
 * check REOPEN_KEY on mount and restore.
 */
export function reopenEntry(entry: HistoryEntry, dest: string = "/redesign"): void {
  setReopenEntry(entry);
  if (typeof window !== "undefined") {
    // use location to avoid Next router dependency in lib
    const id = encodeURIComponent(entry.id);
    window.location.href = `${dest}?reopen=${id}`;
  }
}
