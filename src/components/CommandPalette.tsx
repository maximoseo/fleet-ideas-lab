"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, type Lang } from "@/components/i18n";
import { FLEET_PROJECTS, FLEET_IDEAS, FLEET_COUNT, GAP_SCORES, DOMAIN_LABEL, type FleetDomain } from "@/lib/fleet";
import { localizeIdea } from "@/lib/fleet.he";
import { WHATS_NEW_OPEN_EVENT } from "@/components/WhatsNew";
import { WEB_VERSION } from "@/lib/releaseNotes";

type Entry = { id: string; kind: "dashboard" | "idea" | "gap"; label: string; sub: string; href: string; score?: number };

function buildEntries(tr: (en: string, he: string) => string, lang: Lang): Entry[] {
  const entries: Entry[] = [];
  for (const pr of FLEET_PROJECTS) {
    entries.push({ id: `dash-${pr.slug}`, kind: "dashboard", label: pr.name, sub: `${pr.slug} · ${DOMAIN_LABEL[pr.domain] || pr.domain} · ${pr.status} · ${tr("health", "בריאות")} ${pr.health}`, href: `/?q=${encodeURIComponent(pr.slug)}` });
  }
  for (const idea0 of FLEET_IDEAS) {
    const idea = localizeIdea(idea0, lang);
    entries.push({ id: `idea-${idea.slug}`, kind: "idea", label: idea.title, sub: `${idea.slug} · ${idea.domain} · ${idea.kind} · ${tr("Gap", "פער")} ${idea.gapScore}% · ${idea.effort}/${idea.priority}`, href: `/ideas#${idea.slug}` });
  }
  const caps = ["analytics","alerts","automation","reporting","visualization"] as const;
  for (const d of ["seo","content","local","analytics","automation","design","outreach","technical"] as FleetDomain[]) {
    for (const c of caps) {
      const s = (GAP_SCORES as unknown as Record<string, Record<string, number>>)[d]?.[c] ?? 8;
      entries.push({ id: `gap-${d}-${c}`, kind: "gap", label: `${DOMAIN_LABEL[d]} × ${c}`, sub: `${tr("Gap", "פער")} ${s}% — ${s<30?tr("white-space", "שטח לבן"):s<50?tr("gap", "פער"):s<70?tr("ok", "תקין"):tr("strong", "חזק")} · ${tr("coverage", "כיסוי")}`, href: `/gaps#${d}-${c}`, score: s });
    }
  }
  return entries;
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { lang, tr } = useLang();
  const [q, setQ] = useState("");
  const all = useMemo(() => buildEntries(tr, lang), [tr, lang]);
  const kindLabel = (k: Entry["kind"]) => (k === "dashboard" ? tr("dashboard", "דשבורד") : k === "idea" ? tr("idea", "רעיון") : tr("gap", "פער"));
  const counts = useMemo(() => ({ idea: all.filter((e) => e.kind === "idea").length, gap: all.filter((e) => e.kind === "gap").length }), [all]);
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
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[var(--bg)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="text-white/65">⌘K</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Jump to dashboard / idea / gap — e.g. site-intel, anomaly, outreach×automation", "קפיצה לדשבורד / רעיון / פער — למשל site-intel, anomaly, outreach×automation")} className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none" />
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75 hover:bg-white/10">Esc</button>
        </div>
        <div className="max-h-[56vh] overflow-auto p-2">
          {filtered.length === 0 ? <div className="p-6 text-center text-sm text-white/65">{tr("No matches — try “seo”, “gap”, or a slug", "אין התאמות — נסו “seo”, “gap” או slug")}</div> : (
            <div className="space-y-1">
              {filtered.map((e) => (
                <button key={e.id} onClick={() => { onClose(); router.push(e.href); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/[0.06] border border-transparent hover:border-white/10">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${e.kind==="dashboard" ? "bg-violet-500/20 text-violet-200 border border-violet-500/20" : e.kind==="idea" ? (e.sub.includes("kind: new") || e.label.startsWith("Anomaly") ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200") : "bg-white/10 text-white/75"}`}>{kindLabel(e.kind)}</span>
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
        <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/60">
          <span>{tr(`${FLEET_COUNT} dashboards · ${counts.idea} ideas · ${counts.gap} gaps · recent + search`, `${FLEET_COUNT} דשבורדים · ${counts.idea} רעיונות · ${counts.gap} פערים · אחרונים + חיפוש`)}</span>
          <button
            type="button"
            onClick={() => { onClose(); window.dispatchEvent(new Event(WHATS_NEW_OPEN_EVENT)); }}
            className="min-h-[32px] rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-semibold text-white/75 hover:bg-white/10"
          >
            {tr("What's new", "מה חדש")} · <span dir="ltr">v{WEB_VERSION}</span>
          </button>
          <span className="hidden sm:inline">{tr("Type to filter · Enter to jump", "הקלידו לסינון · Enter לקפיצה")}</span>
        </div>
      </div>
    </div>
  );
}
