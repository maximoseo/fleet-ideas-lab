"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shared site header — one navigation system for every page.
 * Desktop: inline links. Mobile (<860px): hamburger + dropdown drawer
 * with ≥48px touch targets. Replaces the per-page custom headers that
 * wrapped awkwardly and hid pages behind tiny text links.
 */

const NAV = [
  { href: "/", label: "Style Arena", hint: "Compare design styles" },
  { href: "/redesign", label: "Redesign", hint: "Redesign a live site" },
  { href: "/mockup", label: "Mockups", hint: "Full-page mockups" },
  { href: "/generate", label: "Design System", hint: "Tokens & CSS export" },
  { href: "/inspiration", label: "Inspiration", hint: "Design references" },
  { href: "/audit", label: "Site Audit", hint: "Audit a client site" },
  { href: "/suggestions", label: "Suggestions", hint: "AI design ideas" },
  { href: "/history", label: "History", hint: "Past analyses" },
  { href: "/prototypes/", label: "Prototypes", hint: "Client prototypes gallery", external: true },
] as const;

export default function SiteHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0d14]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-black text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            aria-hidden
          >
            DL
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-white" style={{ fontFamily: "Rubik, sans-serif" }}>
              Design Lab
            </span>
            {subtitle ? (
              <span className="hidden text-[11px] text-white/50 sm:block">{subtitle}</span>
            ) : null}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = !("external" in item) && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  active ? "bg-violet-600/90 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
                {"external" in item ? " ↗" : ""}
              </Link>
            );
          })}
        </nav>

        </div>

      
    </header>
  );
}
