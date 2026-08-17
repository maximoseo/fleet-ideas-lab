"use client";

import { useState } from "react";

type AskResult = {
  answer: string;
  model: string;
  grounded: { dashboards: number; liveHealth: number };
};

/**
 * Ask-AI over the fleet — collapsible panel on the home page.
 * Honest states: 503 = no sanctioned provider configured; answer renders
 * verbatim (pre-wrap) with the grounding counts as a caption.
 */
export default function AskFleetCard() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setResult(j as AskResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[48px] w-full items-center justify-between px-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <span aria-hidden>✨</span> Ask AI about the fleet
        </span>
        <span className="text-white/65" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-white/10 p-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Ask about the fleet… / שאל על הצי…"
            className="w-full rounded-lg border border-white/15 bg-black/30 p-3 text-sm text-white placeholder:text-white/60 focus:border-violet-400/60 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask();
            }}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => void ask()}
              disabled={busy || !question.trim()}
              className="min-h-[40px] rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
            >
              {busy ? "Thinking…" : "Ask"}
            </button>
            <span className="text-[12px] text-white/65">Grounded in live fleet data · v0 · no per-token vendors</span>
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>
          ) : null}
          {result ? (
            <div className="mt-3">
              <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-white/85">
                {result.answer}
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-white/65">
                grounded: {result.grounded.dashboards} dashboards · {result.grounded.liveHealth} live health rows · {result.model}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
