"use client";

import { useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Injection = {
  id: string;
  site_url: string;
  page_id: number | null;
  page_slug: string | null;
  marker_id: string | null;
  mode: "draft" | "inject" | null;
  style_name: string | null;
  status: "live" | "draft" | "removed" | "replaced";
  created_at: string;
  removed_at: string | null;
};

const FILTERS = ["all", "live", "draft", "removed", "replaced"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<string, string> = {
  live: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  draft: "border-white/15 bg-white/5 text-white/60",
  removed: "border-white/10 bg-white/5 text-white/35",
  replaced: "border-amber-400/40 bg-amber-500/10 text-amber-200",
};

export default function ExperimentsPage() {
  const [rows, setRows] = useState<Injection[] | null>(null);
  const [persisted, setPersisted] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/wp/injections");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRows(j.injections || []);
      setPersisted(Boolean(j.persisted));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function markRemoved(row: Injection) {
    if (busyId) return;
    const ok = window.confirm(
      `Mark this injection as removed in the REGISTRY only?\n\n${row.site_url} · page ${row.page_id} · ${row.style_name || row.marker_id}\n\nThis does NOT change the WordPress page. Actual rollback goes through the injector (Fleet Ideas Lab → Remove styles).`,
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const r = await fetch("/api/wp/injections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: "removed" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const visible = (rows || []).filter((r) => filter === "all" || r.status === filter);
  const counts = (rows || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Experiments Registry</h1>
        <p className="mt-1 text-sm text-white/50">
          Every WordPress injection Fleet Ideas Lab has made — what is live where, and what was rolled back.
          Registry state only; actual rollback runs through the injector.
        </p>

        {!persisted && (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Registry persistence offline — showing nothing. This is honest emptiness, not zero experiments.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Status filter">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-[36px] rounded-full border px-3 text-[13px] font-medium capitalize transition ${
                filter === f ? "border-violet-400/60 bg-violet-600 text-white" : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {f} {f !== "all" && counts[f] ? <span className="font-mono">· {counts[f]}</span> : null}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-semibold">Site</th>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">Style</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-[13px] text-white/80">{r.site_url.replace(/^https?:\/\//, "")}</td>
                  <td className="px-4 py-3 text-white/60">
                    <span className="font-mono">{r.page_id}</span>
                    {r.page_slug ? <span className="ml-1 text-white/35">/{r.page_slug}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.style_name || <span className="font-mono text-white/40">{r.marker_id}</span>}</td>
                  <td className="px-4 py-3 text-white/60">{r.mode}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] || STATUS_STYLE.draft}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-white/45">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "live" ? (
                      <button
                        onClick={() => void markRemoved(r)}
                        disabled={busyId === r.id}
                        className="min-h-[32px] rounded border border-white/15 bg-white/5 px-2.5 text-[12px] text-white/60 hover:bg-white/10 disabled:opacity-40"
                      >
                        {busyId === r.id ? "…" : "Mark removed"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows && visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                    {rows.length === 0
                      ? "No injections recorded yet. The registry fills in the next time Fleet Ideas Lab injects into WordPress."
                      : `No ${filter} injections.`}
                  </td>
                </tr>
              ) : null}
              {!rows && !error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/40">Loading…</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
