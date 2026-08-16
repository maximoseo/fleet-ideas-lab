"use client";

import { useEffect, useState } from "react";
import { applyLang, currentLang, type Lang } from "@/components/i18n";

/**
 * EN/HE chrome-language toggle. Reads the before-paint value from
 * document.documentElement.lang (set by the inline script in layout.tsx),
 * persists via applyLang → localStorage "fil-lang". Hebrew switches the
 * document to dir=rtl; dashboard names and data stay English by design.
 */
export default function LangToggle() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(currentLang());
    const onChange = () => setLang(currentLang());
    window.addEventListener("fil-lang", onChange);
    return () => window.removeEventListener("fil-lang", onChange);
  }, []);

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
