"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SharedData {
  url: string;
  title: string;
  colors: string[];
  fonts: string[];
  platform: string;
}

/** Only http(s) may become a clickable href — the payload is attacker-writable. */
function isSafeHttpUrl(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SharePage() {
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the shared payload lives in location.hash, which the server never sees
      if (!hash) { setError("No shared data found"); return; }
      const parsed = JSON.parse(decodeURIComponent(atob(hash)));
      setData(parsed);
    } catch {
      setError("Could not decode shared data");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0a14] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>🔗 Shared Analysis</h1>
          <Link href="/" className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/20">← Fleet Ideas Lab</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
            <p className="text-4xl">😕</p>
            <p className="mt-3 text-sm text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-1 text-lg font-bold">{data.title}</h2>
            {/*
              The whole payload comes out of location.hash, which anyone can
              write. An unchecked href there means a javascript: URL one click
              away from running in this origin. Render a link only for http(s).
            */}
            {isSafeHttpUrl(data.url) ? (
              <a href={data.url} target="_blank" rel="noopener noreferrer" dir="ltr"
                className="text-sm text-violet-400 hover:text-violet-200">{data.url} ↗</a>
            ) : (
              <span dir="ltr" className="text-sm text-white/65">{data.url}</span>
            )}

            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/65">Color Palette</h3>
              <div className="flex flex-wrap gap-2">
                {data.colors.map(c => (
                  <div key={c} className="text-center">
                    <span className="inline-block h-12 w-12 rounded-lg border border-white/20" style={{ background: c }} />
                    <span className="mt-1 block text-[10px] text-white/60" dir="ltr">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/65">Fonts</h3>
              <p className="text-sm text-white/75">{data.fonts.join(", ") || "None detected"}</p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">{data.platform}</span>
            </div>

            <div className="mt-6 flex gap-2">
              <a href={`/redesign`} className="flex-1 rounded-lg bg-violet-600 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-violet-500">
                ✨ Redesign this site
              </a>
              <a href={`/audit`} className="flex-1 rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold text-white/70 transition hover:bg-white/20">
                🔍 Run slop audit
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
