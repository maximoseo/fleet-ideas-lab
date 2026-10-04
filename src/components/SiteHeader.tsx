"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette from "@/components/CommandPalette";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import VersionBadge from "@/components/VersionBadge";
import { useLang, pick, type Bi, type I18nKey } from "@/components/i18n";

const NAV: ReadonlyArray<{ href: string; key: I18nKey; hint: Bi }> = [
  { href: "/", key: "nav.inventory", hint: { en: "Fleet overview", he: "סקירת הצי" } },
  { href: "/ideas", key: "nav.ideas", hint: { en: "Ideas", he: "רעיונות" } },
  { href: "/favorites", key: "nav.favorites", hint: { en: "Saved ideas", he: "רעיונות שמורים" } },
  { href: "/gaps", key: "nav.gaps", hint: { en: "Gap radar", he: "מכ״ם פערים" } },
  { href: "/create", key: "nav.create", hint: { en: "Scaffold", he: "שלד" } },
];

const MORE: ReadonlyArray<{ href: string; key: I18nKey; hint: Bi; external?: boolean }> = [
  { href: "/changelog", key: "nav.changelog", hint: { en: "Pipeline transitions", he: "מעברי צנרת" } },
  { href: "/experiments", key: "nav.experiments", hint: { en: "WP injection registry", he: "רישום הזרקות WordPress" } },
  { href: "/audit", key: "nav.audit", hint: { en: "Audit a client site", he: "ביקורת לאתר לקוח" } },
  { href: "/generate", key: "nav.generate", hint: { en: "Tokens & CSS", he: "טוקנים ו-CSS" } },
  { href: "/redesign", key: "nav.redesign", hint: { en: "Redesign a live site", he: "עיצוב מחדש לאתר חי" } },
  { href: "/mockup", key: "nav.mockup", hint: { en: "Full-page mockups", he: "מוקאפים לעמוד מלא" } },
  { href: "/history", key: "nav.history", hint: { en: "Past analyses", he: "ניתוחים קודמים" } },
  { href: "/prototypes/", key: "nav.prototypes", hint: { en: "Client gallery", he: "גלריית לקוחות" }, external: true },
];

export default function SiteHeader({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();
  const { t, tr, lang } = useLang();
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
          <span className="hidden leading-tight min-[360px]:inline">
            <span className="block text-[15px] font-bold text-white" style={{ fontFamily: "Rubik, sans-serif" }}>
              Fleet Ideas Lab
            </span>
            {subtitle ? <span className="hidden max-w-[16rem] truncate text-[11px] text-white/50 sm:block lg:hidden 2xl:block">{subtitle}</span> : null}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={tr("Primary", "ראשי")}>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={pick(item.hint, lang)}
                className={`rounded-lg px-2 py-2 text-[13px] font-medium transition xl:px-3 ${active ? "bg-violet-600/90 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
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
                title={pick(item.hint, lang)}
                {...(item.external ? { target: "_blank" as const, rel: "noopener noreferrer" } : {})}
                className={`rounded-lg px-2 py-2 text-[12px] font-medium transition xl:px-2.5 ${active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/10 hover:text-white/80"}`}
              >
                {t(item.key)}
                {item.external ? " ↗" : ""}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <VersionBadge />
          <LangToggle />
          <ThemeToggle />
          <button onClick={() => setPaletteOpen(true)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-[13px] font-medium text-white/70 hover:bg-white/10" aria-label={t("action.commandPalette")}>
            ⌘K <span className="hidden xl:inline text-white/65">{t("action.jump")}</span>
          </button>
          <Link
            href="/create"
            className="inline-flex min-h-[36px] items-center rounded-full bg-violet-600 px-4 text-[13px] font-semibold text-white hover:bg-violet-500 transition"
          >
            {t("action.newScaffold")}
          </Link>
        </div>

        <button onClick={() => setPaletteOpen(true)} className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75" aria-label={t("action.search")}>⌘</button>
        <span className="lg:hidden"><ThemeToggle /></span>
        <span className="lg:hidden"><LangToggle /></span>
        {/* Below lg the bottom tab bar (MobileTabBar) is the primary navigation; a second row of pills here
            only made the header overflow on phones and tablets. */}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
