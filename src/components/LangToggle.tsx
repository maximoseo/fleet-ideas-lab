"use client";

import { applyLang, useLang } from "@/components/i18n";

/**
 * EN/HE chrome-language toggle. Reads the before-paint value from
 * document.documentElement.lang (set by the inline script in layout.tsx),
 * persists via applyLang → localStorage "fil-lang". Hebrew switches the
 * document to dir=rtl; dashboard names and data stay English by design.
 *
 * The language now comes from the shared useLang() store instead of a local
 * copy hydrated in an effect — one source, no first-render flash.
 */
export default function LangToggle() {
  const { lang } = useLang();
  const he = lang === "he";

  return (
    <button
      type="button"
      onClick={() => applyLang(he ? "en" : "he")}
      aria-label={he ? "Switch to English" : "מעבר לעברית"}
      aria-pressed={he}
      title={he ? "English" : "עברית"}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 text-[12px] font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
    >
      {he ? "EN" : "עב"}
    </button>
  );
}
