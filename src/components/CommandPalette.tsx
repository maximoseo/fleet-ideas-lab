"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FLEET_PROJECTS, FLEET_IDEAS, FLEET_COUNT, GAP_SCORES, DOMAIN_LABEL, type FleetDomain } from "@/lib/fleet";

type Entry = { id: string; kind: "dashboard" | "idea" | "gap"; label: string; sub: string; href: string; score?: number };

function buildEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const pr of FLEET_PROJECTS) {
    entries.push({ id: `dash-${pr.slug}`, kind: "dashboard", label: pr.name, sub: `${pr.slug} · ${DOMAIN_LABEL[pr.domain] || pr.domain} · ${pr.status} · health ${pr.health}`, href: `/?q=${encodeURIComponent(pr.slug)}` });
  }
  for (const idea of FLEET_IDEAS) {
    entries.push({ id: `idea-${idea.slug}`, kind: "idea", label: idea.title, sub: `${idea.slug} · ${idea.domain} · ${idea.kind} · Gap ${idea.gapScore}% · ${idea.effort}/${idea.priority}`, href: `/ideas#${idea.slug}` });
  }
  const caps = ["analytics","alerts","automation","reporting","visualization"] as const;
  for (const d of ["seo","content","local","analytics","automation","design","outreach","technical"] as FleetDomain[]) {
    for (const c of caps) {
      const s = (GAP_SCORES as unknown as Record<string, Record<string, number>>)[d]?.[c] ?? 8;
      entries.push({ id: `gap-${d}-${c}`, kind: "gap", label: `${DOMAIN_LABEL[d]} × ${c}`, sub: `Gap ${s}% — ${s<30?"white-space":s<50?"gap":s<70?"ok":"strong"} · coverage`, href: `/gaps#${d}-${c}`, score: s });
    }
  }
  return entries;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const all = useMemo(() => buildEntries(), []);
  const filtered = useMemo(() => {
    if (!q.trim()) return all.slice(0, 24);
    const low = q.toLowerCase();
    return all.filter((e) => `${e.label} ${e.sub} ${e.id}`.toLowerCase().includes(low)).slice(0, 24);
  }, [q, all]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0f0b1a] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="text-white/40">⌘K</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to dashboard / idea / gap — e.g. site-intel, anomaly, outreach×automation" className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10">Esc</button>
        </div>
        <div className="max-h-[56vh] overflow-auto p-2">
          {filtered.length === 0 ? <div className="p-6 text-center text-sm text-white/40">No matches — try “seo”, “gap”, or a slug</div> : (
            <div className="space-y-1">
              {filtered.map((e) => (
                <button key={e.id} onClick={() => { onClose(); router.push(e.href); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06] border border-transparent hover:border-white/10">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${e.kind==="dashboard" ? "bg-violet-500/20 text-violet-200 border border-violet-500/20" : e.kind==="idea" ? (e.sub.includes("kind: new") || e.label.startsWith("Anomaly") ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300") : "bg-white/10 text-white/60"}`}>{e.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-white">{e.label}</span>
                    <span className="block truncate text-[11px] text-white/45">{e.sub}</span>
                  </span>
                  <span className="hidden text-[11px] text-white/20 sm:block">↵</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/30">
          <span>{FLEET_COUNT} dashboards · 11 ideas · 40 gaps · recent + search</span>
          <span className="hidden sm:inline">Type to filter · Enter to jump</span>
        </div>
      </div>
    </div>
  );
}
