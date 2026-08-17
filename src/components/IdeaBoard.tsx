"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DOMAIN_LABEL, DOMAIN_COLOR, type FleetIdea } from "@/lib/fleet";

export type PipelineStatus = "backlog" | "planned" | "building" | "shipped" | "archived";

export const PIPELINE_COLUMNS: { id: PipelineStatus; label: string; hint: string }[] = [
  { id: "backlog", label: "Backlog", hint: "Not started" },
  { id: "planned", label: "Planned", hint: "Scoped, queued" },
  { id: "building", label: "Building", hint: "In progress" },
  { id: "shipped", label: "Shipped", hint: "Live" },
  { id: "archived", label: "Archived", hint: "Parked" },
];

const COLUMN_ACCENT: Record<PipelineStatus, string> = {
  backlog: "#8c82ab",
  planned: "#60a5fa",
  building: "#e8b14c",
  shipped: "#a78bfa",
  archived: "#5b5470",
};

export type BoardIdea = FleetIdea & { pipelineStatus: PipelineStatus };

interface IdeasResponse {
  curated?: BoardIdea[];
  pool?: BoardIdea[];
  persisted?: boolean;
}

const STATUS_ORDER: PipelineStatus[] = ["backlog", "planned", "building", "shipped", "archived"];

function normalizeStatus(s: unknown): PipelineStatus {
  return (STATUS_ORDER as string[]).includes(String(s)) ? (s as PipelineStatus) : "backlog";
}

export default function IdeaBoard() {
  const [ideas, setIdeas] = useState<BoardIdea[]>([]);
  const [persisted, setPersisted] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fleet/ideas");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as IdeasResponse;
      const all = [...(data.curated || []), ...(data.pool || [])].map((i) => ({
        ...i,
        pipelineStatus: normalizeStatus(i.pipelineStatus),
      }));
      setIdeas(all);
      setPersisted(data.persisted !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; load() sets its own loading flag
    load();
  }, [load]);

  const columns = useMemo(() => {
    const grouped: Record<PipelineStatus, BoardIdea[]> = {
      backlog: [],
      planned: [],
      building: [],
      shipped: [],
      archived: [],
    };
    for (const idea of ideas) grouped[idea.pipelineStatus].push(idea);
    // Gap-score ascending inside a column = biggest opportunity first
    for (const k of STATUS_ORDER) grouped[k].sort((a, b) => a.gapScore - b.gapScore);
    return grouped;
  }, [ideas]);

  async function transition(idea: BoardIdea, to: PipelineStatus) {
    if (!persisted || pending || to === idea.pipelineStatus) return;
    const from = idea.pipelineStatus;
    // Optimistic update — rollback on error
    setIdeas((prev) => prev.map((i) => (i.slug === idea.slug ? { ...i, pipelineStatus: to } : i)));
    setPending(idea.slug);
    try {
      const res = await fetch("/api/fleet/ideas/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: idea.slug, to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "HTTP " + res.status);
      }
      setToast(`${idea.slug}: ${from} → ${to}`);
    } catch (e) {
      setIdeas((prev) => prev.map((i) => (i.slug === idea.slug ? { ...i, pipelineStatus: from } : i)));
      setToast(`✗ ${idea.slug} stayed ${from} — ${e instanceof Error ? e.message : "transition failed"}`);
    } finally {
      setPending(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE_COLUMNS.map((c) => (
          <div key={c.id} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="text-sm text-white/60">Pipeline board could not load ({error}).</p>
        <button
          onClick={load}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {!persisted ? (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] font-semibold text-amber-200">
          Pipeline persistence offline — statuses are static
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE_COLUMNS.map((col) => {
          const cards = columns[col.id];
          return (
            <section
              key={col.id}
              aria-label={col.label + " column"}
              className="flex min-h-[120px] flex-col rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <header
                className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-white/10 px-3 py-2.5"
                style={{ background: `linear-gradient(90deg, ${COLUMN_ACCENT[col.id]}22, transparent)` }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLUMN_ACCENT[col.id] }} aria-hidden />
                  <h2 className="text-[12px] font-bold uppercase tracking-widest text-white/80">{col.label}</h2>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white/70">
                  {cards.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {cards.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11px] text-white/30">No ideas {col.hint.toLowerCase()}</p>
                ) : (
                  cards.map((idea) => (
                    <BoardCard
                      key={idea.slug}
                      idea={idea}
                      disabled={!persisted || pending === idea.slug}
                      onTransition={(to) => transition(idea, to)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0f0b1a] shadow-xl lg:bottom-6">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function BoardCard({
  idea,
  disabled,
  onTransition,
}: {
  idea: BoardIdea;
  disabled: boolean;
  onTransition: (to: PipelineStatus) => void;
}) {
  const idx = STATUS_ORDER.indexOf(idea.pipelineStatus);
  const prev = idx > 0 ? STATUS_ORDER[idx - 1] : null;
  const next = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  return (
    <article className="rounded-xl border border-white/10 bg-[#1a1428] p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: DOMAIN_COLOR[idea.domain],
            borderColor: DOMAIN_COLOR[idea.domain] + "44",
            background: DOMAIN_COLOR[idea.domain] + "14",
          }}
        >
          {DOMAIN_LABEL[idea.domain]}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
          {idea.priority} · {idea.effort}
        </span>
        <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-200">
          Gap {idea.gapScore}%
        </span>
      </div>
      <h3 className="mt-1.5 text-[13px] font-bold leading-tight text-white">{idea.title}</h3>
      {/* Desktop: status select */}
      <label className="mt-2 hidden sm:block">
        <span className="sr-only">Pipeline status for {idea.title}</span>
        <select
          value={idea.pipelineStatus}
          disabled={disabled}
          onChange={(e) => onTransition(e.target.value as PipelineStatus)}
          className="min-h-[36px] w-full rounded-lg border border-white/15 bg-white/5 px-2 text-[12px] font-semibold text-white/80 focus:border-violet-500 focus:outline-none disabled:opacity-50"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} className="bg-[#151120] text-white">
              {s}
            </option>
          ))}
        </select>
      </label>
      {/* Mobile: prev / next steppers (≥44px touch targets) */}
      <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          disabled={disabled || !prev}
          onClick={() => prev && onTransition(prev)}
          aria-label={`Move ${idea.title} to ${prev || "previous"}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">{idea.pipelineStatus}</span>
        <button
          type="button"
          disabled={disabled || !next}
          onClick={() => next && onTransition(next)}
          aria-label={`Move ${idea.title} to ${next || "next"}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 disabled:opacity-30"
        >
          →
        </button>
      </div>
    </article>
  );
}
