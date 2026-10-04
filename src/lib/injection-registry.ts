/**
 * Injection experiment registry (fil_injections).
 *
 * Every WordPress injection/rollback gets recorded — turning the WP injector
 * from a stateless tool into an ops system with a "what is live where" view.
 * Recording is ALWAYS fire-and-forget: a registry failure must never fail,
 * delay, or roll back a WordPress operation that already succeeded.
 */

import { sbInsert, sbPatch, supabaseEnabled } from "@/lib/supabase";

export interface InjectionRecord {
  site_url: string;
  page_id: number;
  page_slug?: string | null;
  marker_id: string;
  mode: "draft" | "inject";
  style_name?: string | null;
  status: "draft" | "live" | "removed" | "replaced";
}

/** page ids are interpolated into PostgREST filters: integers only. */
function safePageId(id: unknown): number | null {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function recordInjection(rec: InjectionRecord): Promise<void> {
  if (!supabaseEnabled()) return;
  if (safePageId(rec.page_id) === null) {
    console.warn("[registry] record skipped: invalid page_id");
    return;
  }
  try {
    if (rec.mode === "inject") {
      // A new live injection replaces previous live ones on the same page.
      await sbPatch(
        "fil_injections",
        `site_url=eq.${encodeURIComponent(rec.site_url)}&page_id=eq.${rec.page_id}&status=eq.live`,
        { status: "replaced", removed_at: new Date().toISOString() },
      );
    }
    await sbInsert("fil_injections", rec);
  } catch (err) {
    console.warn("[registry] record failed:", (err as Error).message);
  }
}

export async function markInjectionsRemoved(siteUrl: string, pageId: number): Promise<void> {
  if (!supabaseEnabled()) return;
  if (safePageId(pageId) === null) {
    console.warn("[registry] mark-removed skipped: invalid page_id");
    return;
  }
  try {
    await sbPatch(
      "fil_injections",
      `site_url=eq.${encodeURIComponent(siteUrl)}&page_id=eq.${pageId}&status=in.(live,draft)`,
      { status: "removed", removed_at: new Date().toISOString() },
    );
  } catch (err) {
    console.warn("[registry] mark-removed failed:", (err as Error).message);
  }
}
