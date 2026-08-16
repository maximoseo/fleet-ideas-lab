import type { Metadata } from "next";
import { Heebo, Rubik, JetBrains_Mono } from "next/font/google";
import MobileTabBar from "@/components/MobileTabBar";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew"], variable: "--font-heebo" });
const rubik = Rubik({ subsets: ["hebrew"], variable: "--font-rubik" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Design Lab — MaximoSEO",
  description: "Analyze any website, generate design systems, detect AI slop, and inject premium designs into WordPress. Style Arena, Mockup Generator, Slop Detector, and more.",
  keywords: ["design", "AI", "slop detector", "design system", "WordPress", "UI/UX"],
  openGraph: {
    title: "Design Lab — MaximoSEO",
    description: "Analyze any website and generate premium design improvements.",
    type: "website",
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
