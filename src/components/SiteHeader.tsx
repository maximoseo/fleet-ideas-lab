"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette from "@/components/CommandPalette";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { useLang, type I18nKey } from "@/components/i18n";

const NAV: ReadonlyArray<{ href: string; key: I18nKey; hint: string }> = [
  { href: "/", key: "nav.inventory", hint: "Fleet overview" },
  { href: "/ideas", key: "nav.ideas", hint: "11 concepts" },
  { href: "/favorites", key: "nav.favorites", hint: "Saved ideas" },
  { href: "/gaps", key: "nav.gaps", hint: "Gap radar" },
  { href: "/create", key: "nav.create", hint: "Scaffold" },
];

const MORE: ReadonlyArray<{ href: string; key: I18nKey; hint: string; external?: boolean }> = [
  { href: "/changelog", key: "nav.changelog", hint: "Pipeline transitions" },
  { href: "/audit", key: "nav.audit", hint: "Audit a client site" },
  { href: "/generate", key: "nav.generate", hint: "Tokens & CSS" },
  { href: "/redesign", key: "nav.redesign", hint: "Redesign a live site" },
  { href: "/mockup", key: "nav.mockup", hint: "Full-page mockups" },
  { href: "/history", key: "nav.history", hint: "Past analyses" },
  { href: "/prototypes/", key: "nav.prototypes", hint: "Client gallery", external: true },
];

export default function SiteHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();
  const { t } = useLang();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v: boolean) => !v); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="fil-chrome sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            aria-hidden
          >
            ◈
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-white" style={{ fontFamily: "Rubik, sans-serif" }}>
              Fleet Ideas Lab
            </span>
            {subtitle ? <span className="hidden text-[11px] text-white/50 sm:block">{subtitle}</span> : null}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-[13px] font-medium transition ${active ? "bg-violet-600/90 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
              >
                {t(item.key)}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          {MORE.slice(0, 3).map((item) => {
            const active = !item.external && isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.external ? { target: "_blank" as const, rel: "noopener" } : {})}
                className={`rounded-lg px-2.5 py-2 text-[12px] font-medium transition ${active ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/10 hover:text-white/80"}`}
              >
                {t(item.key)}
                {item.external ? " ↗" : ""}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <button onClick={() => setPaletteOpen(true)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-[13px] font-medium text-white/70 hover:bg-white/10" aria-label={t("action.commandPalette")}>
            ⌘K <span className="hidden xl:inline text-white/40">{t("action.jump")}</span>
          </button>
          <Link
            href="/create"
            className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500 transition"
          >
            {t("action.newScaffold")}
          </Link>
        </div>

        <button onClick={() => setPaletteOpen(true)} className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60" aria-label={t("action.search")}>⌘</button>
        <span className="lg:hidden"><ThemeToggle /></span>
        <span className="lg:hidden"><LangToggle /></span>
        {/* mobile quick nav */}
        <nav className="flex items-center gap-1 lg:hidden" aria-label="Mobile primary">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition ${active ? "bg-violet-600 text-white" : "text-white/60 hover:text-white"}`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
