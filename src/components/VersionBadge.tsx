"use client";

import { useLang } from "@/components/i18n";
import { WEB_VERSION } from "@/lib/releaseNotes";
import { WHATS_NEW_OPEN_EVENT } from "@/components/WhatsNew";

/** Shows the running web version; click to reopen the "What's new" window. */
export default function VersionBadge({ inline = false }: { inline?: boolean }) {
  const { tr } = useLang();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(WHATS_NEW_OPEN_EVENT))}
      aria-label={tr(`Version ${WEB_VERSION} — see what's new`, `גרסה ${WEB_VERSION} — מה חדש`)}
      title={tr("What's new", "מה חדש")}
      className={inline ? "inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white" : "hidden min-h-[44px] items-center rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white xl:inline-flex"}
    >
      <span dir="ltr">v{WEB_VERSION}</span>{inline ? <span className="ms-1.5">{tr("What's new", "מה חדש")}</span> : null}
    </button>
  );
}
