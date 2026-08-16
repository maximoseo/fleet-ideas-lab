"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Chrome i18n — dictionary pattern. Translates CHROME strings only
 * (nav labels, section headers, buttons). Dashboard names, slugs and
 * data stay English by design.
 *
 * Usage: const { lang, t, setLang } = useLang();
 * Persistence: localStorage "fil-lang", applied before paint by the
 * inline script in layout.tsx (sets <html lang> and dir=rtl).
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

/** Reactive lang hook — re-renders subscribed components on toggle. */
export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    setLangState(currentLang());
    const onChange = () => setLangState(currentLang());
    window.addEventListener("fil-lang", onChange);
    return () => window.removeEventListener("fil-lang", onChange);
  }, []);
  const t = useCallback((key: I18nKey) => translate(lang, key), [lang]);
  return { lang, t, setLang: applyLang };
}
