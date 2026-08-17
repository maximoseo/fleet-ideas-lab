"use client";

import { useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, FLEET_GENERATED_POOL, DOMAIN_LABEL, DOMAIN_COLOR, type FleetIdea } from "@/lib/fleet";

const VIOLET = STYLES.violet;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Map FleetIdea -> canvas shape (keep real fleet truth, not mock)
type ViewIdea = FleetIdea & { level: string; categoryLabel: string };
function toViewIdea(it: FleetIdea): ViewIdea {
  const level = it.effort; // S/M/L/XL maps to canvas level
  const categoryLabel = DOMAIN_LABEL[it.domain] || it.domain;
  return { ...it, level, categoryLabel };
}

export default function CreatePage() {
  const ALL: ViewIdea[] = useMemo(() => [...FLEET_IDEAS, ...FLEET_GENERATED_POOL].map(toViewIdea), []);
  // Default to Anomaly Explain Engine if present, else first
  const defaultId = useMemo(() => (ALL.find((x) => x.slug === "anomaly-explain-engine") || ALL[0])?.id || ALL[0].id, [ALL]);
  const [selected, setSelected] = useState<string>(defaultId);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "high" | "fresh">("all");
  const [slug, setSlug] = useState(() => (ALL.find((x) => x.id === defaultId) || ALL[0]).slug);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMsg, setTerminalMsg] = useState("Ready · no terminal output yet.");

  const idea = useMemo(() => ALL.find((x) => x.id === selected) || ALL[0], [ALL, selected]);
  const valid = SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 48;
  const slugError = !slug ? "Required" : !valid ? "Lowercase kebab-case, 3–48 chars" : null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ALL.filter((it) => {
      const matchesQuery = !query || `${it.title} ${it.categoryLabel} ${it.domain} ${it.description} ${it.whyNow} ${it.slug}`.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || (filter === "high" && it.impact === "high") || (filter === "fresh" && (it.id.startsWith("idea-research") || it.id.startsWith("idea-gen")));
      return matchesQuery && matchesFilter;
    });
  }, [ALL, q, filter]);

  const counts = useMemo(() => {
    const high = ALL.filter((x) => x.impact === "high").length;
    const fresh = ALL.filter((x) => x.id.startsWith("idea-research") || x.id.startsWith("idea-gen")).length;
    return { all: ALL.length, high, fresh, visible: filtered.length };
  }, [ALL, filtered.length]);

  function selectIdea(id: string) {
    const it = ALL.find((x) => x.id === id);
    if (!it) return;
    setSelected(id);
    setSlug(it.slug);
    setResult(null);
    setTerminalMsg(`Ready · ${it.title} selected for scaffolding.`);
  }

  async function copyPrompt() {
    try { await navigator.clipboard.writeText(idea.prompt); } catch {}
    setResult({ ok: true, msg: "Prompt copied" });
    setTerminalMsg(`Prompt copied — ${idea.slug}`);
    setTerminalOpen(true);
    setTimeout(() => setResult(null), 1500);
  }

  async function scaffold() {
    if (!valid || busy) {
      setTerminalMsg(!valid ? "Enter a valid slug before scaffolding." : terminalMsg);
      setTerminalOpen(true);
      return;
    }
    setBusy(true);
    setResult(null);
    setTerminalMsg(`Queued · scaffold stub request prepared for /root/projects/${slug}…`);
    setTerminalOpen(true);
    try {
      const res = await fetch("/api/fleet/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ideaId: idea.id, kind: idea.kind, targetSlug: idea.targetSlug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const modeNote = data.mode === "vercel-tmp" ? " (Vercel /tmp — ephemeral, clone to /root/projects/" + data.slug + " on dev server)" : "";
      const kindNote = data.kind === "enhancement" && data.targetSlug ? " — feature branch for " + data.targetSlug : " — new dashboard";
      setResult({ ok: true, msg: `✓ Created ${data.slug} at ${data.dir}${modeNote}${kindNote}` });
      setTerminalMsg(`✓ Scaffolded ${data.slug} at ${data.dir}${modeNote}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setResult({ ok: false, msg: `✗ ${msg}` });
      setTerminalMsg(`✗ Scaffold failed — ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle="Create · scaffold from idea" />
      {/* Three-pane on xl, Bento on lg, single column on mobile — no duplicated header */}
      <div className="mx-auto flex max-w-[1280px] flex-col lg:flex-row min-h-[calc(100vh-56px)]">
        {/* Rail — visible only on xl to echo Three-Pane 68px rail without duplicating SiteHeader nav */}
        <aside className="hidden xl:flex w-[68px] shrink-0 flex-col border-r border-white/5 bg-[#0b101b]">
          <div className="flex flex-col items-center px-2 pt-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#8e99ff]/70 bg-[#5965dc] text-[11px] font-black tracking-[-0.12em] text-white">FL</div>
            <button className="mt-3 flex h-[54px] w-[52px] flex-col items-center justify-center rounded-md border border-[#7580f1] bg-[#5965dc26] text-[10px] font-semibold leading-3 text-[#e0e3ff]">+<span>New</span><span>Scaffold</span></button>
          </div>
          <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
            {[
              ["◈", "Inventory"],
              ["⌁", "Ideas"],
              ["☆", "Favorites"],
              ["⊘", "Gaps"],
              ["＋", "Create"],
            ].map(([icon, label]) => (
              <span key={label} className={`flex h-[43px] w-full flex-col items-center justify-center rounded-md text-[9px] ${label === "Create" ? "bg-[#5965dc] font-bold text-white" : "text-white/65"}`}>
                <span className="text-[15px] leading-3">{icon}</span>
                <span>{label}</span>
              </span>
            ))}
          </nav>
          <div className="border-t border-white/5 px-2 py-3 flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold text-white/65">EN</span>
            <span className="h-8 w-8 rounded-full border border-white/10 bg-[#172236] grid place-items-center text-[10px] font-bold text-[#dce5ff]">OP</span>
          </div>
        </aside>

        {/* Inbox / Inventory — 300px on xl, 324px on lg, full width on mobile */}
        <aside className="flex w-full shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0e1421] lg:w-[324px] xl:w-[300px]">
          <div className="border-b border-white/5 px-4 pb-3 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Idea inbox</p>
            <h2 className="mt-1 flex items-center gap-2 text-[18px] font-bold tracking-[-0.03em] text-white">Ideas <span className="rounded-full bg-[#1c2943] px-2 py-0.5 text-[11px] font-semibold text-[#b9c6df]">{counts.all}</span><span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-[#61d7e8]"><span className="h-1.5 w-1.5 rounded-full bg-[#61d7e8]" />Synced</span></h2>
            <label className="mt-3 flex h-8 items-center rounded-md border border-white/10 bg-[#0a0f19] px-3 text-[12px] text-white/65 focus-within:border-[#7580f1]">
              <span className="mr-2 text-[16px] leading-none">⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ideas…" className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/25" />
              <kbd className="rounded border border-white/10 px-1 py-0.5 text-[9px] text-white/25">/</kbd>
            </label>
            <div className="mt-2 flex gap-1.5">
              {[
                ["all", `All ${counts.all}`],
                ["high", `High ${counts.high}`],
                ["fresh", `Fresh ${counts.fresh}`],
              ].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k as typeof filter)} className={`rounded border px-2 py-1 text-[10px] font-semibold ${filter === k ? "border-[#7580f1] bg-[#5965dc26] text-white" : "border-white/10 text-white/65"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 max-h-[360px] lg:max-h-none">
            {filtered.map((it) => (
              <button key={it.id} onClick={() => selectIdea(it.id)} aria-selected={selected === it.id} className={`mb-1.5 flex min-h-[58px] w-full items-start rounded-md border p-3 text-left ${selected === it.id ? "bg-[#5965dc] border-[#7580f1] text-white" : "bg-[#121a2a] border-white/10 text-white hover:bg-[#172135] hover:border-[#42537a]"}`}>
                <span className="mt-1.5 mr-2.5 h-2 w-2 shrink-0 rounded-full" style={{ background: DOMAIN_COLOR[it.domain] || "#5965dc" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold leading-4">{it.title}</span>
                  <span className={`mt-1 block text-[10px] leading-3 ${selected === it.id ? "text-[#d9ddff]" : "text-white/65"}`}>{DOMAIN_LABEL[it.domain]} · {it.effort} · {it.priority} · {it.impact}</span>
                </span>
                <span className={`ml-2 text-[15px] leading-4 ${selected === it.id ? "opacity-100 text-white" : "opacity-0"}`}>✓</span>
              </button>
            ))}
            {filtered.length === 0 ? <p className="px-3 py-6 text-center text-[11px] text-white/60">No ideas match this search.</p> : null}
          </div>
          <div className="border-t border-white/5 px-4 py-2">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25"><span>Queue signal</span><span className="text-[#61d7e8]">stable</span></div>
            <p className="mt-2 text-[11px] leading-4 text-white/65">{counts.high} high-priority ideas · {counts.fresh} fresh</p>
          </div>
        </aside>

        {/* Detail workspace */}
        <section className="flex min-w-0 flex-1 flex-col bg-[#080b14]">
          <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/5 px-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-white/60"><span className="font-semibold text-white/50">Create</span><span className="text-[#3d4b63]">/</span><span>Scaffold from idea</span></div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#61d7e8]"><span className="h-1.5 w-1.5 rounded-full bg-[#61d7e8]" />Workspace ready</span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col px-6 pb-4 pt-6">
              <main className="flex w-full flex-1 flex-col">
                {/* Workflow 01→06 */}
                <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/5 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  <span className="rounded border border-[#3d8d9b] bg-[#61d7e81c] px-1.5 py-0.5 text-[#61d7e8]">01</span><span className="text-white/65">Choose idea</span><span className="px-1 text-[#42506a]">→</span>
                  <span className="rounded border border-[#5965dc] bg-[#5965dc26] px-1.5 py-0.5 text-[#dce0ff]">02</span><span className="text-white">Review context</span><span className="px-1 text-[#42506a]">→</span>
                  <span className="text-white/25">03 Copy prompt</span><span className="px-1 text-[#42506a]">→</span><span className="text-white/25">04 Confirm slug</span><span className="px-1 text-[#42506a]">→</span><span className="text-white/25">05 Scaffold stub</span><span className="px-1 text-[#42506a]">→</span><span className="text-white/25">06 Open dashboard</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7f8cff]">
                  <span className="rounded border border-[#46529c] bg-[#171d49] px-1.5 py-0.5 text-[#aeb5ff]">{DOMAIN_LABEL[idea.domain]}</span>
                  <span className="rounded border border-white/10 px-1.5 py-0.5 font-semibold tracking-normal text-white/65">{idea.effort}</span>
                  <span className="rounded border border-[#8f6b3d] bg-[#241d17] px-1.5 py-0.5 font-semibold tracking-normal text-[#edbd6e]">{idea.priority}</span>
                  <span className="rounded bg-[#5965dc]/20 border border-[#5965dc]/30 px-1.5 py-0.5 text-[#aeb5ff] capitalize">{idea.impact}</span>
                </div>
                <h1 className="mt-3 max-w-[820px] text-[26px] font-bold leading-tight tracking-[-0.035em] text-white">{idea.title}</h1>
                <p className="mt-2 max-w-[780px] text-[13px] leading-5 text-white/65">{idea.description}</p>

                <div className="mt-5 flex items-center gap-3 rounded-md border border-[#6e5235] bg-[#2b211a] px-4 py-3 text-[12px] leading-5 text-[#f0d09a]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d99a4a] text-[12px] font-bold text-[#f0c779]">!</span>
                  <span><strong className="font-bold text-[#ffe0a8]">Why now:</strong> {idea.whyNow}</span>
                </div>

                <section className="mt-5 overflow-hidden rounded-md border border-white/10 bg-[#0a0f19]">
                  <div className="flex h-9 items-center justify-between border-b border-white/10 bg-[#121a2a] px-4">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d88482]" /><span className="h-2 w-2 rounded-full bg-[#d9ad57]" /><span className="h-2 w-2 rounded-full bg-[#65c79a]" /></span>
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">Prompt payload</h2>
                    <button onClick={copyPrompt} className="text-[11px] font-semibold text-[#b7c0ff] hover:text-white">Copy prompt</button>
                  </div>
                  <pre className="m-0 whitespace-pre-wrap break-words px-4 py-4 text-[12px] leading-5 text-[#d5dceb]">{idea.prompt}</pre>
                </section>

                <section className="mt-5 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-[14px] font-bold text-white">Slug</h2>
                      <p className="mt-1 text-[11px] leading-4 text-white/60">Kebab-case · 3–48 chars · will create <code className="rounded bg-[#171f31] px-1.5 py-0.5 text-[10px] text-[#aebbd4]">/root/projects/{slug || "<slug>"}</code></p>
                    </div>
                    <span className={`text-[11px] font-semibold ${valid ? "text-[#5ed6a4]" : "text-[#d99a4a]"}`}>{valid ? "✓ Valid slug" : slugError}</span>
                  </div>
                  <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-"))} placeholder="my-new-dashboard" className={`mt-3 h-12 w-full rounded-md border bg-[#121a2a] px-4 text-[13px] text-white placeholder:text-white/25 focus:outline-none ${valid ? "border-[#3a4a63] focus:border-[#7580f1]" : "border-[#d99a4a]/60 focus:border-[#d99a4a]"}`} />
                  <p className="mt-2 text-[10px] text-white/20">Lowercase letters, numbers, and hyphens only.</p>
                </section>

                <section className="mt-4 rounded-md border border-white/10 bg-[#0e1421] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/65">
                    <span className="font-semibold text-white">Next steps after scaffold</span>
                    <code className="rounded bg-[#171f31] px-1.5 py-0.5 text-[10px] text-[#c2cce2]">cd /root/projects/{slug || "<slug>"} && npm install</code>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-white/20">Add to <code className="text-[#9eacc7]">src/lib/fleet.ts</code> when deployed via Vercel · wire vault data sources (no invented values). {idea.targetSlug ? <span className="text-white/60">→ target: {idea.targetSlug}</span> : null}</p>
                </section>

                {result ? <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>{result.msg}</div> : null}
              </main>

              <div className="sticky bottom-0 -mx-6 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#080b14] px-6 py-4">
                <p className="text-[11px] leading-4 text-white/60">
                  Auth: requires valid <code className="text-[#bbc6dd]">dl_session</code>.<br />
                  <span className="text-white/20">If 401, log in at <code>/login</code> (Turnstile check).</span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={scaffold} disabled={busy} className="rounded-md border border-[#7782ef] bg-[#5965dc] px-6 py-3 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(22,28,80,0.28)] hover:bg-[#7580f1] disabled:opacity-50"> {busy ? "Scaffolding…" : "Scaffold stub"} </button>
                  <a href={idea.dashboardUrl || "#"} target={idea.dashboardUrl ? "_blank" : undefined} rel="noopener noreferrer" className={`rounded-md border px-5 py-3 text-[13px] font-semibold ${idea.dashboardUrl ? "border-white/10 bg-[#121a2a] text-white/65 hover:border-[#42537a] hover:text-white" : "border-white/5 bg-white/5 text-white/20 pointer-events-none"}`}>Open dashboard ↗</a>
                </div>
              </div>
            </div>
          </div>
          <footer className="shrink-0 border-t border-white/5 bg-[#0a0f19] px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] leading-4 text-white/65">
              <button onClick={() => setTerminalOpen((v) => !v)} className="flex items-center gap-1.5 font-semibold text-white hover:text-[#c4caff]"><span>{terminalOpen ? "⌄" : "›"}</span> Terminal output</button>
              <span className="text-[#35425a]">·</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#e9962f]" />Protected by Cloudflare Turnstile</span>
              <span className="text-[#35425a]">·</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#5ed6a4]" />Encrypted <code>dl_session</code></span>
              <span className="text-[#35425a]">·</span>
              <span className="text-white/20">Versions via /api/app/version</span>
              <span className="ml-auto text-white/20">MaximoSEO · Fleet Ideas Lab</span>
            </div>
            {terminalOpen ? <p className="mt-1.5 border-l-2 border-[#61d7e8] pl-2 text-[10px] text-[#61d7e8]">{terminalMsg}</p> : null}
          </footer>
        </section>
      </div>
    </div>
  );
}
