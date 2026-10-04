"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang, pick, localeFor } from "@/components/i18n";
import { isPublicRoute } from "@/lib/publicRoute";
import { RELEASE_NOTES, WEB_VERSION, WHATS_NEW_STORAGE_KEY, unseenNotes, type ReleaseNote } from "@/lib/releaseNotes";

/** Event that reopens the window on demand (the version badge in the header fires it). */
export const WHATS_NEW_OPEN_EVENT = "fil-whatsnew-open";

/**
 * "What's new" window. Opens once per browser per release when a signed-in
 * visitor lands on an app page, listing the version number and what changed.
 * Public pages (/login, /share) never show it. Closing records WEB_VERSION in
 * localStorage; a failure to read or write storage just means it may show again.
 */
export default function WhatsNew() {
  const pathname = usePathname();
  const { lang, tr } = useLang();
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const publicPage = isPublicRoute(pathname || "/");

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, WEB_VERSION);
    } catch {}
    setNotes([]);
  }, []);

  useEffect(() => {
    if (publicPage) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
    } catch {}
    const fresh = unseenNotes(seen);
    // Browser storage is external state read after mount; the window is closed on the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fresh.length) setNotes(fresh);
  }, [publicPage]);

  useEffect(() => {
    const open = () => setNotes(RELEASE_NOTES.slice(0, 1));
    window.addEventListener(WHATS_NEW_OPEN_EVENT, open);
    return () => window.removeEventListener(WHATS_NEW_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!notes.length) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notes.length, dismiss]);

  if (publicPage || !notes.length) return null;

  const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(localeFor(lang), { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={dismiss} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsnew-title"
        className="fil-panel relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {tr("What's new", "מה חדש")}
            </p>
            <h2 id="whatsnew-title" className="mt-1 text-lg font-bold" style={{ color: "var(--text)" }}>
              {tr("Update", "עדכון")} <span dir="ltr">v{WEB_VERSION}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={tr("Close", "סגירה")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ color: "var(--muted)" }}
          >
            ×
          </button>
        </div>

        <div className="mt-3 space-y-5">
          {notes.map((n) => (
            <section key={n.version} aria-label={`v${n.version}`}>
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                <span dir="ltr">v{n.version}</span> · {pick(n.title, lang)}
              </h3>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>{fmt(n.date)}</p>
              <ul className="mt-2 list-disc space-y-1.5 ps-5 text-[13px] leading-5" style={{ color: "var(--text)" }}>
                {n.changes.map((c, i) => (
                  <li key={i}>{pick(c, lang)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {tr("Got it", "הבנתי")}
        </button>
      </div>
    </div>
  );
}
