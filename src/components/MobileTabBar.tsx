"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  {
    href: "/", label: "Inventory",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/ideas", label: "Ideas",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0-6 6c0 2.2 1.2 3.8 2.4 5 .7.7 1.1 1.6 1.1 2.5V19h5v-2.5c0-.9.4-1.8 1.1-2.5 1.2-1.2 2.4-2.8 2.4-5a6 6 0 0 0-6-6Z" /><path d="M9 19h6" />
      </svg>
    ),
  },
  {
    href: "/favorites", label: "Favorites",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19L5 12a4 4 0 0 1 5.5-5.5L12 8l1.5-1.5A4 4 0 0 1 19 12l-7 7Z" />
      </svg>
    ),
  },
  {
    href: "/gaps", label: "Gaps",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 12 19 5" /><path d="M12 12 12 3" /><path d="M12 12 5 12" />
      </svg>
    ),
  },
  {
    href: "/create", label: "Create",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" /><path d="M5 12h14" />
      </svg>
    ),
  },
] as const;

const MORE_FLEET = [
  { href: "/ideas", label: "Notifications", hint: "Channels & test" },
] as const;
const MORE = [
  { href: "/changelog", label: "Changelog", hint: "Pipeline transitions" },
  { href: "/audit", label: "Site Audit", hint: "Audit a client site" },
  { href: "/generate", label: "Design System", hint: "Tokens & CSS" },
  { href: "/redesign", label: "Redesign", hint: "Redesign a live site" },
  { href: "/mockup", label: "Mockups", hint: "Full-page mockups" },
  { href: "/history", label: "History", hint: "Past analyses" },
  { href: "/prototypes/", label: "Prototypes", hint: "Client gallery", external: true },
  // Fleet Ideas Lab extras — notifications + update are native routes exposed via deep links; keep web header fallback
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  if (pathname === "/login") return null;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="More pages">
          <button aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fil-panel absolute inset-x-0 bottom-0 rounded-t-2xl border-t px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">More</p>
            <div className="grid grid-cols-1 gap-1">
              {MORE.map((m) => (
                <Link key={m.href} href={m.href} {...("external" in m ? { target: "_blank" as const, rel: "noopener" as const } : {})} className={`flex min-h-[48px] items-center justify-between rounded-xl px-4 text-[15px] font-medium transition ${isActive(m.href) ? "bg-violet-600 text-white" : "text-white/80 hover:bg-white/10"}`}>
                  <span>{m.label} {"external" in m ? "↗" : ""}</span>
                  <span className={`text-[11px] ${isActive(m.href) ? "text-white/80" : "text-white/35"}`}>{m.hint}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 text-center text-[11px] text-white/30">Protected by Cloudflare Turnstile \u00b7 Encrypted dl_session</div>
          </div>
        </div>
      ) : null}
      <nav className="fil-chrome fixed inset-x-0 bottom-0 z-[60] border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden" aria-label="Primary mobile">
        <div className="grid grid-cols-6">
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <Link key={t.href} href={t.href} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${active ? "text-violet-300" : "text-white/45"}`} aria-current={active ? "page" : undefined}>
                {t.icon(active)}
                <span>{t.label}</span>
                <span className={`h-0.5 w-6 rounded-full ${active ? "bg-violet-400" : "bg-transparent"}`} />
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${moreActive || moreOpen ? "text-violet-300" : "text-white/45"}`} aria-expanded={moreOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={moreActive || moreOpen ? 2.2 : 1.7} strokeLinecap="round">
              <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
            </svg>
            <span>More</span>
            <span className={`h-0.5 w-6 rounded-full ${moreActive ? "bg-violet-400" : "bg-transparent"}`} />
          </button>
        </div>
      </nav>
    </>
  );
}
