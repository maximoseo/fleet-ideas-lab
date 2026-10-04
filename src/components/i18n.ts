"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Interface i18n. English is the PRIMARY language (default on first visit, on the
 * server render and whenever nothing is stored); Hebrew is a switchable option
 * that also flips the document to dir=rtl.
 *
 * Two ways to translate, both reactive to the toggle:
 *   t("nav.ideas")                      shared chrome strings (the DICT below)
 *   tr("Save changes", "שמירת שינויים")  inline English/Hebrew pair for page copy
 * Usage: const { lang, t, tr, setLang } = useLang();
 *
 * Text that lives outside a component (module-level arrays of labels) is stored as
 * a Bi pair and resolved at render with pick(bi, lang).
 *
 * What is NOT translated, on purpose: dashboard names and slugs, probe data, URLs,
 * and content produced by AI or by clients' sites. Everything the interface itself
 * says is translated.
 * Persistence: localStorage "fil-lang", applied before paint by the inline script in
 * layout.tsx (sets <html lang> and dir=rtl).
 */

export type Lang = "en" | "he";

const DICT = {
  "nav.inventory": { en: "Inventory", he: "מלאי" },
  "nav.ideas": { en: "Ideas", he: "רעיונות" },
  "nav.favorites": { en: "Favorites", he: "מועדפים" },
  "nav.gaps": { en: "Gaps", he: "פערים" },
  "nav.create": { en: "Create", he: "יצירה" },
  "nav.changelog": { en: "Changelog", he: "יומן שינויים" },
  "nav.audit": { en: "Site Audit", he: "ביקורת אתר" },
  "nav.generate": { en: "Design System", he: "מערכת עיצוב" },
  "nav.redesign": { en: "Redesign", he: "עיצוב מחדש" },
  "nav.mockup": { en: "Mockups", he: "מוקאפים" },
  "nav.history": { en: "History", he: "היסטוריה" },
  "nav.prototypes": { en: "Prototypes", he: "אב-טיפוסים" },
  "nav.experiments": { en: "Experiments", he: "ניסויים" },
  "nav.more": { en: "More", he: "עוד" },
  "action.newScaffold": { en: "+ New Scaffold", he: "+ שלד חדש" },
  "action.jump": { en: "Jump", he: "קפיצה" },
  "action.commandPalette": { en: "Command palette", he: "לוח פקודות" },
  "action.search": { en: "Search", he: "חיפוש" },
  "action.close": { en: "Close", he: "סגירה" },
  "action.retry": { en: "Retry", he: "ניסוי חוזר" },
  "action.openSite": { en: "Open site", he: "פתיחת האתר" },
  "action.rerunProbe": { en: "Re-run probe", he: "הרצת בדיקה מחדש" },
  "action.copyImprove": { en: "Copy improve prompt", he: "העתקת פרומפט שיפור" },
  "section.fleetStrip": { en: "Fleet strip", he: "רצועת הצי" },
  "section.live": { en: "Live", he: "חי" },
  "section.probeHistory": { en: "Probe history", he: "היסטוריית בדיקות" },
  "section.askAi": { en: "Ask AI", he: "שאלו את ה-AI" },
  "sort.worst": { en: "Worst-first", he: "הגרוע קודם" },
  "sort.name": { en: "Name", he: "שם" },
  "sort.domain": { en: "Domain", he: "תחום" },
} as const;

export type I18nKey = keyof typeof DICT;

/** An English/Hebrew pair for text defined outside a component. */
export type Bi = { en: string; he: string };

export function pick(b: Bi, lang: Lang): string {
  return lang === "he" ? b.he : b.en;
}

/** BCP-47 locale for Intl / toLocale*String calls. */
export function localeFor(lang: Lang): string {
  return lang === "he" ? "he-IL" : "en-GB";
}

export function translate(lang: Lang, key: I18nKey): string {
  const entry = DICT[key];
  return entry ? entry[lang] : key;
}

export function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  try {
    localStorage.setItem("fil-lang", lang);
  } catch {}
  window.dispatchEvent(new Event("fil-lang"));
}

export function currentLang(): Lang {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang === "he" ? "he" : "en";
}

function subscribeLang(onChange: () => void) {
  window.addEventListener("fil-lang", onChange);
  return () => window.removeEventListener("fil-lang", onChange);
}

/**
 * Reactive lang hook — re-renders subscribed components on toggle.
 *
 * useSyncExternalStore rather than useState + useEffect: the language is
 * browser state written by the before-paint bootstrap in layout.tsx, and
 * setting it from an effect meant one render at the wrong language before the
 * correct one, visible as an LTR flash on a Hebrew page load.
 */
export function useLang() {
  const lang = useSyncExternalStore<Lang>(subscribeLang, currentLang, () => "en");
  const t = useCallback((key: I18nKey) => translate(lang, key), [lang]);
  const tr = useCallback((en: string, he: string) => (lang === "he" ? he : en), [lang]);
  const locale = localeFor(lang);
  return { lang, t, tr, locale, setLang: applyLang };
}
