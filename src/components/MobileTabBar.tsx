"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Mobile-first bottom navigation. Shown on <1024px, hidden on /login.
 * 4 primary tabs + "More" bottom sheet for the rest.
 * Desktop keeps the header nav in SiteHeader.
 */

const TABS = [
  {
    href: "/", label: "Arena",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/redesign", label: "Redesign",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.6L19 9l-4.1 1.4L12 15l-1.9-4.6L6 9l4.1-1.4L12 3z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
      </svg>
    ),
  },
  {
    href: "/mockup", label: "Mockups",
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18" /><circle cx="6.5" cy="6.5" r=".6" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/prototypes/", label: "Prototypes", external: true,
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v11H4z" /><path d="M8 20h8" /><path d="M12 16v4" /><path d="M9 9l2 2 4-4" />
      </svg>
    ),
  },
] as const;

const MORE = [
  { href: "/generate", label: "Design System", hint: "Tokens & CSS export" },
  { href: "/inspiration", label: "Inspiration", hint: "Design references" },
  { href: "/audit", label: "Site Audit", hint: "Audit a client site" },
  { href: "/suggestions", label: "Suggestions", hint: "AI design ideas" },
  { href: "/history", label: "History", hint: "Past analyses" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (pathname === "/login") return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <>
      {/* More sheet */}
      {moreOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="More pages">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-[#14121f] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">More</p>
            <div className="grid grid-cols-1 gap-1">
              {MORE.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`flex min-h-[48px] items-center justify-between rounded-xl px-4 text-[15px] font-medium transition ${
                    isActive(m.href) ? "bg-violet-600 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`text-[11px] ${isActive(m.href) ? "text-white/80" : "text-white/35"}`}>{m.hint}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-[#0d0c16]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
        aria-label="Primary mobile"
      >
        <div className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = !("external" in t) && isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${
                  active ? "text-violet-300" : "text-white/45"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t.icon(active)}
                <span>{t.label}</span>
                <span className={`h-0.5 w-6 rounded-full ${active ? "bg-violet-400" : "bg-transparent"}`} />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition ${
              moreActive || moreOpen ? "text-violet-300" : "text-white/45"
            }`}
            aria-expanded={moreOpen}
          >
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
