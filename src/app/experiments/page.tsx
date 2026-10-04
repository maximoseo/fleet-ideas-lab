"use client";

import { useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useLang, pick, type Bi } from "@/components/i18n";

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

const FILTER_LABEL: Record<Filter, Bi> = {
  all: { en: "all", he: "הכול" },
  live: { en: "live", he: "פעיל" },
  draft: { en: "draft", he: "טיוטה" },
  removed: { en: "removed", he: "הוסר" },
  replaced: { en: "replaced", he: "הוחלף" },
};

const MODE_LABEL: Record<string, Bi> = {
  draft: { en: "draft", he: "טיוטה" },
  inject: { en: "inject", he: "הזרקה" },
};

const STATUS_STYLE: Record<string, string> = {
  live: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  draft: "border-white/15 bg-white/5 text-white/75",
  removed: "border-white/10 bg-white/5 text-white/65",
  replaced: "border-amber-400/40 bg-amber-500/10 text-amber-100",
};

export default function ExperimentsPage() {
  const { lang, tr, locale } = useLang();
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
      tr(
        `Mark this injection as removed in the REGISTRY only?\n\n${row.site_url} · page ${row.page_id} · ${row.style_name || row.marker_id}\n\nThis does NOT change the WordPress page. Actual rollback goes through the injector (Fleet Ideas Lab → Remove styles).`,
        `לסמן את ההזרקה הזו כמוסרת ב-REGISTRY בלבד?\n\n${row.site_url} · עמוד ${row.page_id} · ${row.style_name || row.marker_id}\n\nהפעולה לא משנה את עמוד ה-WordPress. שחזור בפועל מתבצע דרך המזריק (Fleet Ideas Lab → Remove styles).`,
      ),
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
        <h1 className="text-2xl font-extrabold tracking-tight">{tr("Experiments Registry", "מאגר ניסויים")}</h1>
        <p className="mt-1 text-sm text-white/50">
          {tr(
            "Every WordPress injection Fleet Ideas Lab has made — what is live where, and what was rolled back. Registry state only; actual rollback runs through the injector.",
            "כל הזרקות ה-WordPress ש-Fleet Ideas Lab ביצע — מה פעיל ואיפה, ומה שוחזר. מצב המאגר בלבד; שחזור בפועל מתבצע דרך המזריק.",
          )}
        </p>

        {!persisted && (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            {tr("Registry persistence offline — showing nothing. This is honest emptiness, not zero experiments.", "שמירת המאגר אינה זמינה — לא מוצג דבר. זו ריקנות אמיתית, לא אפס ניסויים.")}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={tr("Status filter", "סינון לפי סטטוס")}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-[36px] rounded-full border px-3 text-[13px] font-medium capitalize transition ${
                filter === f ? "border-violet-400/60 bg-violet-600 text-white" : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              {pick(FILTER_LABEL[f], lang)} {f !== "all" && counts[f] ? <span className="font-mono">· {counts[f]}</span> : null}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/65">
                <th className="px-4 py-3 font-semibold">{tr("Site", "אתר")}</th>
                <th className="px-4 py-3 font-semibold">{tr("Page", "עמוד")}</th>
                <th className="px-4 py-3 font-semibold">{tr("Style", "סגנון")}</th>
                <th className="px-4 py-3 font-semibold">{tr("Mode", "מצב")}</th>
                <th className="px-4 py-3 font-semibold">{tr("Status", "סטטוס")}</th>
                <th className="px-4 py-3 font-semibold">{tr("Created", "נוצר")}</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-[13px] text-white/80">{r.site_url.replace(/^https?:\/\//, "")}</td>
                  <td className="px-4 py-3 text-white/75">
                    <span className="font-mono">{r.page_id}</span>
                    {r.page_slug ? <span className="ms-1 text-white/65">/{r.page_slug}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.style_name || <span className="font-mono text-white/65">{r.marker_id}</span>}</td>
                  <td className="px-4 py-3 text-white/75">{r.mode ? (MODE_LABEL[r.mode] ? pick(MODE_LABEL[r.mode], lang) : r.mode) : r.mode}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] || STATUS_STYLE.draft}`}>
                      {FILTER_LABEL[r.status] ? pick(FILTER_LABEL[r.status], lang) : r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-white/45">{new Date(r.created_at).toLocaleString(locale)}</td>
                  <td className="px-4 py-3 text-end">
                    {r.status === "live" ? (
                      <button
                        onClick={() => void markRemoved(r)}
                        disabled={busyId === r.id}
                        className="min-h-[32px] rounded border border-white/15 bg-white/5 px-2.5 text-[12px] text-white/75 hover:bg-white/10 disabled:opacity-40"
                      >
                        {busyId === r.id ? "…" : tr("Mark removed", "סימון כהוסר")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows && visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/65">
                    {rows.length === 0
                      ? tr("No injections recorded yet. The registry fills in the next time Fleet Ideas Lab injects into WordPress.", "עדיין לא תועדו הזרקות. המאגר יתמלא בפעם הבאה ש-Fleet Ideas Lab יזריק ל-WordPress.")
                      : tr(`No ${filter} injections.`, `אין הזרקות בסטטוס "${pick(FILTER_LABEL[filter], lang)}".`)}
                  </td>
                </tr>
              ) : null}
              {!rows && !error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/65">{tr("Loading…", "טוען…")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
