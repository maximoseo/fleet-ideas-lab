"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import TrustLine from "@/components/TrustLine";
import { STYLES } from "@/lib/styles";

const VIOLET = STYLES.violet;

type PipelineStatus = "backlog" | "planned" | "building" | "shipped" | "archived";

interface PipelineEvent {
  slug: string;
  event: string;
  from_status: PipelineStatus | null;
  to_status: PipelineStatus;
  note: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  backlog: "bg-white/10 text-white/60 border-white/15",
  planned: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  building: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  shipped: "bg-violet-500/20 text-violet-200 border-violet-500/40",
  archived: "bg-white/5 text-white/40 border-white/10",
};

function StatusBadge({ s }: { s: string | null }) {
  if (!s) return <span className="text-white/30">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[s] || STATUS_STYLE.backlog}`}>
      {s}
    </span>
  );
}

function formatTs(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ChangelogPage() {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [persisted, setPersisted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fleet/ideas/events");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as { events?: PipelineEvent[]; persisted?: boolean };
      // Newest first (API already orders desc — sort defensively)
      const list = [...(data.events || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setEvents(list);
      setPersisted(data.persisted !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load changelog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle="Pipeline changelog · every status transition" />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>
              Changelog
            </h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>
              Every idea pipeline transition, newest first. Shipped transitions are highlighted — that is the number
              that matters.
            </p>
          </div>
          <Link
            href="/ideas"
            className="inline-flex min-h-[44px] items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Open pipeline board →
          </Link>
        </div>

        {!persisted && !loading ? (
          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] font-semibold text-amber-200">
            Pipeline persistence offline — no events are being recorded.
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">Changelog could not load ({error}).</p>
            <button
              onClick={load}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">
              No transitions recorded yet. Move an idea on the{" "}
              <Link href="/ideas" className="text-violet-300 underline">
                pipeline board
              </Link>{" "}
              and it will show up here.
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-2" aria-label="Pipeline events, newest first">
            {events.map((ev, i) => {
              const shipped = ev.to_status === "shipped";
              return (
                <li
                  key={`${ev.slug}-${ev.created_at}-${i}`}
                  className={`rounded-xl border px-4 py-3 ${
                    shipped
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {shipped ? (
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                        Shipped ✓
                      </span>
                    ) : null}
                    <span className="font-mono text-[13px] font-bold text-white">{ev.slug}</span>
                    <span className="flex items-center gap-1.5">
                      <StatusBadge s={ev.from_status} />
                      <span className="text-white/40" aria-hidden>
                        →
                      </span>
                      <StatusBadge s={ev.to_status} />
                    </span>
                    <time className="ml-auto font-mono text-[11px] text-white/40" dateTime={ev.created_at}>
                      {formatTs(ev.created_at)}
                    </time>
                  </div>
                  {ev.note ? <p className="mt-1.5 text-[12px] leading-5 text-white/60">{ev.note}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
        <TrustLine />
      </main>
    </div>
  );
}
