"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {useState} from "react";
import { useLang, pick, type Bi, type I18nKey } from "@/components/i18n";
import { isPublicRoute } from "@/lib/publicRoute";

const TABS: ReadonlyArray<{ href: string; key: I18nKey; icon: (a: boolean) => React.ReactNode }> = [
  {
    href: "/", key: "nav.inventory",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/ideas", key: "nav.ideas",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0-6 6c0 2.2 1.2 3.8 2.4 5 .7.7 1.1 1.6 1.1 2.5V19h5v-2.5c0-.9.4-1.8 1.1-2.5 1.2-1.2 2.4-2.8 2.4-5a6 6 0 0 0-6-6Z" /><path d="M9 19h6" />
      </svg>
    ),
  },
  {
    href: "/favorites", key: "nav.favorites",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19L5 12a4 4 0 0 1 5.5-5.5L12 8l1.5-1.5A4 4 0 0 1 19 12l-7 7Z" />
      </svg>
    ),
  },
  {
    href: "/gaps", key: "nav.gaps",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 12 19 5" /><path d="M12 12 12 3" /><path d="M12 12 5 12" />
      </svg>
    ),
  },
  {
    href: "/create", key: "nav.create",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" /><path d="M5 12h14" />
      </svg>
    ),
  },
] as const;

const MORE: ReadonlyArray<{ href: string; key: I18nKey; hint: Bi; external?: boolean }> = [
  { href: "/changelog", key: "nav.changelog", hint: { en: "Pipeline transitions", he: "מעברי צנרת" } },
  { href: "/experiments", key: "nav.experiments", hint: { en: "WP injection registry", he: "רישום הזרקות WordPress" } },
  { href: "/audit", key: "nav.audit", hint: { en: "Audit a client site", he: "ביקורת לאתר לקוח" } },
  { href: "/generate", key: "nav.generate", hint: { en: "Tokens & CSS", he: "טוקנים ו-CSS" } },
  { href: "/redesign", key: "nav.redesign", hint: { en: "Redesign a live site", he: "עיצוב מחדש לאתר חי" } },
  { href: "/mockup", key: "nav.mockup", hint: { en: "Full-page mockups", he: "מוקאפים לעמוד מלא" } },
  { href: "/history", key: "nav.history", hint: { en: "Past analyses", he: "ניתוחים קודמים" } },
  { href: "/prototypes/", key: "nav.prototypes", hint: { en: "Client gallery", he: "גלריית לקוחות" }, external: true },
  // Fleet Ideas Lab extras — notifications + update are native routes exposed via deep links; keep web header fallback
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t, tr, lang } = useLang();
  // Derived, not reset from an effect: the sheet belongs to the route it was
  // opened on, so a navigation closes it without a second render pass.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const moreOpen = openedOn === pathname;
  // Navigating away clears the marker outright. Keeping it meant that coming
  // back to the same route with the browser Back button re-opened the sheet.
  if (openedOn !== null && openedOn !== pathname) setOpenedOn(null);
  const setMoreOpen = (open: boolean | ((v: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(moreOpen) : open;
    setOpenedOn(next ? pathname : null);
  };
  // App chrome must not render on a route reachable without a session. `/login`
  // was the only such route until `/share` and `/prototypes` went public, and on
  // those the bar rendered tabs to gated routes that Next then prefetched — five
  // 307s to login for a visitor who never signed in.
  //
  // The predicate reads the same `publicRoutes.json` the middleware uses, but it
  // is NOT the middleware's matcher: `/api/v1` is an API namespace, so the
  // component drops it while the middleware keeps it. Shared data, two callers,
  // a deliberate asymmetry — do not collapse them.
  if (isPublicRoute(pathname)) return null;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.more")}>
          <button aria-label={t("action.close")} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fil-panel absolute inset-x-0 bottom-0 rounded-t-2xl border-t px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{t("nav.more")}</p>
            <div className="grid grid-cols-1 gap-1">
              {MORE.map((m) => (
                <Link key={m.href} href={m.href} {...(m.external ? { target: "_blank" as const, rel: "noopener noreferrer" as const } : {})} className={`flex min-h-[48px] items-center justify-between rounded-xl px-4 text-[15px] font-medium transition ${isActive(m.href) ? "bg-violet-600 text-white" : "text-white/80 hover:bg-white/10"}`}>
                  <span>{t(m.key)} {m.external ? "↗" : ""}</span>
                  <span className={`text-[11px] ${isActive(m.href) ? "text-white/80" : "text-white/65"}`}>{pick(m.hint, lang)}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 text-center text-[11px] text-white/60">{tr("Protected by Cloudflare Turnstile · Encrypted dl_session", "מוגן על ידי Cloudflare Turnstile · dl_session מוצפן")}</div>
          </div>
        </div>
      ) : null}
      <nav className="fil-chrome fixed inset-x-0 bottom-0 z-[60] border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden" aria-label={tr("Primary mobile", "ראשי לנייד")}>
        <div className="grid grid-cols-6">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${active ? "text-violet-200" : "text-white/45"}`} aria-current={active ? "page" : undefined}>
                {tab.icon(active)}
                <span>{t(tab.key)}</span>
                <span className={`h-0.5 w-6 rounded-full ${active ? "bg-violet-400" : "bg-transparent"}`} />
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${moreActive || moreOpen ? "text-violet-200" : "text-white/45"}`} aria-expanded={moreOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={moreActive || moreOpen ? 2.2 : 1.7} strokeLinecap="round">
              <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
            </svg>
            <span>{t("nav.more")}</span>
            <span className={`h-0.5 w-6 rounded-full ${moreActive ? "bg-violet-400" : "bg-transparent"}`} />
          </button>
        </div>
      </nav>
    </>
  );
}
