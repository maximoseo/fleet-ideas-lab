"use client";

import { applyLang, useLang, type Lang } from "@/components/i18n";

/**
 * EN / עב chrome-language switch, shown as a compact segmented control with the
 * active language highlighted. Reads the before-paint value from
 * document.documentElement.lang (set by the inline script in layout.tsx),
 * persists via applyLang → localStorage "fil-lang". Hebrew switches the
 * document to dir=rtl; dashboard names and data stay English by design.
 *
 * The language comes from the shared useLang() store instead of a local copy
 * hydrated in an effect — one source, no first-render flash. Each option is its
 * own button with aria-pressed, so the current state is announced and both
 * choices stay reachable. dir="ltr" keeps the EN | עב order identical in both
 * document directions.
 */
const OPTIONS: ReadonlyArray<{
  code: Lang;
  label: string;
  /** Names the language in that language, so each option is readable on its own. */
  aria: string;
  title: string;
}> = [
  {
    code: "en",
    label: "EN",
    aria: "English",
    title: "Switch the interface to English. Dashboard names and probe data stay English either way.",
  },
  {
    code: "he",
    label: "עב",
    aria: "עברית",
    title: "החלפת שפת הממשק לעברית. שמות הדשבורדים ונתוני הבדיקות נשארים באנגלית בכל מקרה.",
  },
];

export default function LangToggle() {
  const { lang, tr } = useLang();

  return (
    <div
      role="group"
      dir="ltr"
      aria-label={tr("Interface language", "שפת ממשק")}
      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            lang={o.code}
            onClick={() => {
              if (!active) applyLang(o.code);
            }}
            aria-pressed={active}
            aria-label={o.aria}
            title={o.title}
            className={`inline-flex min-h-[44px] min-w-[36px] items-center justify-center rounded-full px-2 text-[12px] font-bold transition ${
              active ? "bg-violet-600 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
