import type { Metadata } from "next";
import { Heebo, Rubik, JetBrains_Mono } from "next/font/google";
import MobileTabBar from "@/components/MobileTabBar";
import WhatsNew from "@/components/WhatsNew";
import { FLEET_COUNT } from "@/lib/fleet";
import "./globals.css";

const heebo = Heebo({ subsets: ["latin", "hebrew"], variable: "--font-heebo" });
const rubik = Rubik({ subsets: ["latin", "hebrew"], variable: "--font-rubik" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Fleet Ideas Lab — MaximoSEO",
  description: `Fleet gap radar & idea engine — ${FLEET_COUNT} dashboards in the inventory, 29 ideas (11 curated + 18 pooled), plain-English explainers, BUILD vs IMPROVE briefs and one-click scaffold.`,
  keywords: ["fleet", "idea engine", "gap radar", "dashboard scaffold", "build brief", "improve brief", "MaximoSEO"],
  themeColor: "#7C3AED",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Fleet Ideas Lab — MaximoSEO",
    description: `Fleet gap radar & idea engine — ${FLEET_COUNT} dashboards, 29 ideas, plain-English explainers, BUILD vs IMPROVE briefs and one-click scaffold.`,
    type: "website",
    url: "https://fleet-ideas-lab.maximo-seo.ai",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Before-paint theme bootstrap: localStorage "fil-theme" wins, else prefers-color-scheme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("fil-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
        {/* Before-paint lang bootstrap: localStorage "fil-lang"; he → dir=rtl. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("fil-lang");if(l==="he"){document.documentElement.lang="he";document.documentElement.dir="rtl";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${heebo.variable} ${rubik.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <MobileTabBar />
        <WhatsNew />
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(new URLSearchParams(location.search).get("embed")==="1")document.documentElement.dataset.embed="1";}catch(e){}})();` }} />
        <style dangerouslySetInnerHTML={{ __html: `
/* ── Panel embed mode (data-embed="1") — suppress app chrome inside dashboards-panel ── */
[data-embed="1"] body { background: transparent; }
[data-embed="1"] header,
[data-embed="1"] [role="banner"],
[data-embed="1"] .app-sidebar,
[data-embed="1"] [class*="topbar" i],
[data-embed="1"] [class*="dock" i],
[data-embed="1"] [class*="mobile-nav" i],
[data-embed="1"] [id*="mobile-nav" i],
[data-embed="1"] nav[aria-label*="main" i],
[data-embed="1"] nav[aria-label*="primary" i] { display: none !important; }
[data-embed="1"] main { padding-top: 0 !important; }
` }} />
      </body>
    </html>
  );
}
