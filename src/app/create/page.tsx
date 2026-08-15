"use client";

import { useState, useMemo } from "react";
import SiteHeader from "@/components/SiteHeader";
import { STYLES } from "@/lib/styles";
import { FLEET_IDEAS, DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/fleet";

const VIOLET = STYLES.violet;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function CreatePage() {
  const [selected, setSelected] = useState<string>(FLEET_IDEAS[0].id);
  const [slug, setSlug] = useState(FLEET_IDEAS[0].slug);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const idea = useMemo(() => FLEET_IDEAS.find((x) => x.id === selected) || FLEET_IDEAS[0], [selected]);

  const valid = SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 48;
  const slugError = !slug ? "Required" : !valid ? "Lowercase kebab-case, 3-48 chars" : null;

  async function scaffold() {
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/fleet/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ideaId: idea.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({ ok: true, msg: `✓ Created ${data.slug} at ${data.dir}` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setResult({ ok: false, msg: `✗ ${msg}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: VIOLET.bg, color: VIOLET.textPrimary }}>
      <SiteHeader subtitle="Create · scaffold from idea" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: VIOLET.fontDisplay }}>Create</h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: VIOLET.textSecondary }}>Select an idea, confirm the slug, and scaffold a stub via <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">POST /api/fleet/scaffold</code>. Requires login (dl_session + Turnstile).</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Ideas list */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-white/40">Select idea</div>
              <div className="max-h-[520px] space-y-1 overflow-auto pr-1">
                {FLEET_IDEAS.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => { setSelected(it.id); setSlug(it.slug); setResult(null); }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition min-h-[64px] ${selected === it.id ? "border-violet-500 bg-violet-500/15" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"}`}
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: DOMAIN_COLOR[it.domain] }} />
                    <span className="flex-1">
                      <span className="block text-[13px] font-bold leading-tight text-white">{it.title}</span>
                      <span className="block text-[11px] text-white/50">{DOMAIN_LABEL[it.domain]} · {it.effort} · {it.priority} · {it.impact}</span>
                    </span>
                    {selected === it.id ? <span className="text-violet-300">✓</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border p-5 sm:p-6" style={{ background: VIOLET.surface, borderColor: VIOLET.border }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLOR[idea.domain] }}>{DOMAIN_LABEL[idea.domain]} · {idea.effort} · {idea.priority}</div>
                  <h2 className="mt-1 text-lg font-bold text-white">{idea.title}</h2>
                  <p className="mt-1 text-sm" style={{ color: VIOLET.textSecondary }}>{idea.description}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                <span className="font-bold">Why now:</span> {idea.whyNow}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {idea.widgets.map((w) => <span key={w} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60">{w}</span>)}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Prompt</div>
                <p className="mt-1 text-xs leading-5 text-white/70">{idea.prompt}</p>
                <button onClick={() => { navigator.clipboard.writeText(idea.prompt); setResult({ ok: true, msg: "Prompt copied" }); setTimeout(() => setResult(null), 1500); }} className="mt-2 inline-flex min-h-[32px] items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10">Copy prompt</button>
              </div>

              <div className="mt-6">
                <label htmlFor="slug" className="block text-sm font-semibold text-white">Slug</label>
                <p className="text-xs" style={{ color: VIOLET.textSecondary }}>Kebab-case, 3-48 chars. Will create <code className="rounded bg-white/10 px-1 py-0.5">/root/projects/&lt;slug&gt;</code></p>
                <input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-"))}
                  placeholder="my-dashboard"
                  className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none ${slugError ? "border-red-500/50 bg-red-500/5 focus:border-red-500" : "border-white/15 bg-white/[0.06] focus:border-violet-500"}`}
                />
                {slugError ? <p className="mt-1 text-xs text-red-300">{slugError}</p> : <p className="mt-1 text-xs text-emerald-300">✓ Valid slug</p>}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={scaffold}
                  disabled={!valid || busy}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "Scaffolding…" : "Scaffold stub"}
                </button>
                <a href={idea.dashboardUrl || "#"} target={idea.dashboardUrl ? "_blank" : undefined} rel="noopener" className={`inline-flex min-h-[44px] items-center justify-center rounded-full border px-5 text-sm font-semibold ${idea.dashboardUrl ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-white/10 bg-white/5 text-white/30 pointer-events-none"}`}>
                  Open dashboard ↗
                </a>
              </div>

              {result ? (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>
                  {result.msg}
                </div>
              ) : null}

              <p className="mt-3 text-[11px] text-white/30">Auth: requires valid dl_session. If 401, log in at /login (Turnstile check).</p>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white/50">
              <span className="font-bold text-white/70">Next steps after scaffold:</span> <code>cd /root/projects/{slug} && npm install</code> · add to <code>src/lib/fleet.ts</code> when deployed via Vercel · wire vault data sources (no invented values).
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
