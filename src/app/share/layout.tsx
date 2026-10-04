import type { Metadata } from "next";

/**
 * The shared analysis lives in the URL #fragment, which never reaches the server, so link previews
 * (Slack, WhatsApp, search bots) can only ever see this page's static metadata (diagnosis F18).
 * Say what the link is, and say nothing about its content.
 */
export const metadata: Metadata = {
  title: "Shared analysis — Fleet Ideas Lab",
  description: "A design analysis shared from Fleet Ideas Lab. Open the link to view it.",
  openGraph: {
    title: "Shared analysis — Fleet Ideas Lab",
    description: "A design analysis shared from Fleet Ideas Lab. Open the link to view it.",
    type: "website",
  },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
