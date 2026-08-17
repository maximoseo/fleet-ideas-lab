import type { Metadata } from "next";
import { Heebo, Rubik, JetBrains_Mono } from "next/font/google";
import MobileTabBar from "@/components/MobileTabBar";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew"], variable: "--font-heebo" });
const rubik = Rubik({ subsets: ["hebrew"], variable: "--font-rubik" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Fleet Ideas Lab — MaximoSEO",
  description: "Fleet gap radar & idea engine — 38 verified dashboards, 29 ideas (11 curated + 18 pooled), plain-English explainers, BUILD vs IMPROVE briefs and one-click scaffold.",
  keywords: ["fleet", "idea engine", "gap radar", "dashboard scaffold", "build brief", "improve brief", "MaximoSEO"],
  themeColor: "#7C3AED",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Fleet Ideas Lab — MaximoSEO",
    description: "Fleet gap radar & idea engine — 38 verified dashboards, 29 ideas, plain-English explainers, BUILD vs IMPROVE briefs and one-click scaffold.",
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
      </body>
    </html>
  );
}
