"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import {
  loadHistory,
  loadHistoryMerged,
  pushHistory,
  removeEntry as removeFromHistory,
  clearHistory as clearHistoryLib,
  setReopenEntry,
  type HistoryEntry,
} from "@/lib/history";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load local + Supabase-merged (graceful fallback)
  useEffect(() => {
    let cancelled = false;
    // immediate local for snappy UI
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating history from localStorage — browser-only, runs once on mount
    setEntries(loadHistory());
    setHydrated(true);
    void loadHistoryMerged().then((merged) => {
      if (!cancelled) setEntries(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = useCallback((next: HistoryEntry[]) => {
    setEntries(next);
  }, []);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((d.error as string) || "Failed");
        setAnalyzing(false);
        return;
      }

      // slop score — server-supplied html (fixed cross-origin bug)
      let slopScore: number | null = null;
      const html = d.html as string | undefined;
      if (html) {
        try {
          const { detectSlop } = await import("@/lib/slop-detector");
          slopScore = detectSlop(html as string).score;
        } catch {
          /* leave null */
        }
      }

      // push via centralized helper (FIFO 20 + Supabase best-effort)
      const entry = pushHistory({
        url: d.url as string,
        title: (d.title as string) || (d.url as string),
        platform: d.platform as { platform: string },
        colors: d.colors as string[] | undefined,
        fonts: d.fonts as string[] | undefined,
        screenshots: d.screenshots as { desktop: string | null; mobile: string | null } | null,
        profile: d.profile as unknown,
        html: html,
        slopScore,
      });

      // refresh from storage (ensures FIFO trim + dedup applied)
      sync(loadHistory());
      // also keep the new entry as reopen target for convenience
      setReopenEntry(entry);
      setUrl("");
    } catch {
      setError("Network error");
    }
    setAnalyzing(false);
  }, [url, sync]);

  const handleRemove = useCallback((id: string) => {
    removeFromHistory(id);
    sync(loadHistory());
    setSelected((s) => s.filter((x) => x !== id));
  }, [sync]);

  const handleClear = useCallback(() => {
    clearHistoryLib();
    sync([]);
    setSelected([]);
  }, [sync]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  }, []);

  const handleReopen = useCallback((entry: HistoryEntry) => {
    setReopenEntry(entry);
    // restore analyze result — destination reads REOPEN_KEY on mount
    router.push(`/redesign?reopen=${encodeURIComponent(entry.id)}`);
  }, [router]);

  const compareEntries = entries.filter((e) => selected.includes(e.id));

  const shareEntry = useCallback((entry: HistoryEntry) => {
    const data = btoa(
      encodeURIComponent(
        JSON.stringify({
          url: entry.url,
          title: entry.title,
          colors: entry.colors,
          fonts: entry.fonts,
          platform: entry.platform,
        })
      )
    );
    const shareUrl = `${window.location.origin}/share#${data}`;
    void navigator.clipboard.writeText(shareUrl);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0c0a14] text-white">
        <SiteHeader subtitle="All analyzed sites · compare · share" />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="py-20 text-center text-sm text-white/40">Loading history…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <SiteHeader subtitle="All analyzed sites · compare · share · reopen" />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Analyze new */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void analyze()}
            placeholder="Analyze a new site…"
            dir="ltr"
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500"
          />
          <button
            onClick={() => void analyze()}
            disabled={analyzing}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <p className="mb-6 text-xs text-white/30">Keeps last 20 analyses (FIFO) · synced to your account when logged in.</p>

        {/* Toolbar — hidden when there is nothing to act on */}
        {entries.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setSelected([]);
              }}
              className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-medium transition ${compareMode ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}
            >
              {compareMode ? "✓ Compare mode" : "Compare"}
            </button>
            {compareMode && selected.length === 2 && (
              <span className="text-xs text-green-400">2 selected — see comparison below</span>
            )}
            {compareMode && selected.length < 2 && (
              <span className="text-xs text-white/40">Select 2 sites to compare</span>
            )}
            <button
              onClick={handleClear}
              className="ml-auto rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Comparison view */}
        {compareMode && compareEntries.length === 2 && (
          <div className="mb-8 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-violet-300">Side-by-side comparison</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {compareEntries.map((e) => (
                <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  {e.screenshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.screenshot} alt={e.title} className="mb-3 h-32 w-full rounded-lg object-cover object-top" />
                  ) : (
                    <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-white/5 text-xl">🌐</div>
                  )}
                  <div className="mb-1 truncate text-sm font-bold">{e.title}</div>
                  <div className="mb-2 truncate text-xs text-white/40" dir="ltr">
                    {e.url}
                  </div>
                  <div className="mb-2 flex items-center gap-1.5">
                    {(e.colors ?? []).slice(0, 6).map((c) => (
                      <span key={c} className="inline-block h-5 w-5 rounded border border-white/20" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">{e.platform}</span>
                    {e.slopScore !== null && e.slopScore !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-bold ${e.slopScore >= 80 ? "bg-green-500/15 text-green-400" : e.slopScore >= 60 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}
                      >
                        Slop: {e.slopScore}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-white/30">Fonts: {(e.fonts ?? []).slice(0, 3).join(", ") || "none"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History list */}
        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl">🕘</p>
            <p className="mt-3 text-sm font-medium text-white/60">No analyses yet</p>
            <p className="mt-1 text-[13px] text-white/40">Paste a URL above — or analyze from Redesign / Audit / Mockup. The report lands here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-4 rounded-xl border p-3 transition ${
                  compareMode && selected.includes(e.id) ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/5 hover:border-white/25"
                } ${compareMode ? "cursor-pointer" : ""}`}
                onClick={compareMode ? () => toggleSelect(e.id) : undefined}
              >
                {e.screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.screenshot} alt={e.title} className="h-16 w-24 shrink-0 rounded-lg object-cover object-top" />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xl">🌐</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{e.title}</div>
                  <div className="truncate text-xs text-white/40" dir="ltr">
                    {e.url}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">{e.platform}</span>
                    {e.slopScore !== null && e.slopScore !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.slopScore >= 80 ? "bg-green-500/15 text-green-400" : e.slopScore >= 60 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}
                      >
                        {e.slopScore}
                      </span>
                    )}
                    <span className="text-[10px] text-white/30">{timeAgo(e.created_at || e.analyzedAt || new Date().toISOString())}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleReopen(e);
                    }}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                    title="Reopen — restore this analysis"
                  >
                    Reopen
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      shareEntry(e);
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/20"
                    title="Copy share link"
                  >
                    🔗
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleRemove(e.id);
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                    title="Remove"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
