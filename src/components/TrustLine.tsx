"use client";

import { useLang } from "@/components/i18n";

export default function TrustLine({ compact = false }: { compact?: boolean }) {
  const { tr } = useLang();
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 text-center ${compact ? "py-3" : "py-4"}`}
      style={{ fontSize: compact ? 11 : 12 }}
      aria-label={tr("Trust and security", "אמון ואבטחה")}
    >
      <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/55">
        {/* Cloudflare-style shield */}
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F38020] text-[9px] font-black text-white" aria-hidden>☁</span>
        <span className="hidden sm:inline">{tr("Protected by", "מוגן על ידי")}</span>
        <span className="font-semibold text-white/70">Cloudflare Turnstile</span>
        <span className="text-white/25">·</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          {tr("Encrypted", "מוצפן")} <span className="font-mono text-[11px]">dl_session</span>
        </span>
        <span className="text-white/25">·</span>
        <span className="text-white/45">{tr("Versions via", "גרסאות דרך")} <span className="font-mono text-[11px] text-white/75">/api/app/version</span></span>
      </span>
      {!compact ? <span className="text-[11px] text-white/60">MaximoSEO · Fleet Ideas Lab</span> : null}
    </div>
  );
}
