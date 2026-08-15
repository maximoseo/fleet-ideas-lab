import type { FleetIdea } from "./fleet";

function gapLabel(n: number): string {
  if (n < 30) return "white-space";
  if (n < 50) return "gap";
  if (n < 70) return "ok";
  return "strong";
}

export function buildAgentPrompt(idea: FleetIdea): string {
  const isNew = idea.kind === "new";
  const target = idea.targetSlug ? "`" + idea.targetSlug + "`" : "\u2014";
  const dir = isNew
    ? "`/root/projects/" + idea.slug + "` (or `/tmp/" + idea.slug + "` on Vercel preview \u2014 ephemeral)"
    : "`/root/projects/" + idea.slug + "` as feature branch for " + target + " (merge as tab inside " + target + ")";
  const gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence;
  const widgets = idea.widgets.map((w) => "- " + w).join("\n");
  const screenName = idea.slug.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  const targetSlug = idea.targetSlug || "";
  // Use array join to avoid nested backtick escaping issues in template literal
  const lines: string[] = [];
  lines.push("# " + idea.title + " \u2014 Agent Build Brief");
  lines.push("> Slug: `" + idea.slug + "` \u00b7 Domain: " + idea.domain + " \u00b7 Kind: " + idea.kind + (idea.targetSlug ? " \u2192 " + target : "") + " \u00b7 Effort " + idea.effort + " \u00b7 Priority " + idea.priority + " \u00b7 Impact " + idea.impact + " \u00b7 Status " + idea.status);
  lines.push("> Why now: " + idea.whyNow);
  lines.push("> Gap: " + gapLine);
  lines.push("");
  lines.push("## 1) Idea Summary");
  lines.push("**Problem:** " + idea.problem);
  lines.push("**Solution:** " + idea.solution);
  lines.push("**Benefit:** " + idea.benefit);
  lines.push("**Description:** " + idea.description);
  lines.push("");
  lines.push("## 2) Where to Build");
  if (isNew) {
    lines.push("- **New standalone dashboard.** Scaffold at " + dir + ". Deploy to `https://" + idea.slug + ".maximo-seo.ai` (or `https://" + idea.slug + ".vercel.app` preview). Add to `src/lib/fleet.ts` only after Vercel alias is live.");
  } else {
    lines.push("- **Enhancement \u2014 add as tab/feature inside " + target + ".** Scaffold at " + dir + " as a working branch, then merge into `" + targetSlug + "/app/<feature>` or `src/app/<feature>`. Do NOT create a new Vercel project.");
  }
  lines.push("- Inventory: 37 verified dashboards (2026-08-15 audit, Vercel team maximo-seo). This idea was deduplicated \u2014 see evidence line.");
  lines.push("");
  lines.push("## 3) Build Plan \u2014 Web (Next.js 16 + Tailwind 4 + violet)");
  lines.push("- Scaffolding: `/api/fleet/scaffold` creates `package.json + README.md` at `" + idea.slug + "` (Vercel \u2192 `/tmp`, Hostinger \u2192 `/root/projects`). Then `npm install && npm run dev`.");
  lines.push("- Pages: " + (isNew ? "`app/page.tsx` (dashboard)" : "`app/<feature>/page.tsx` inside target") + " + `app/api/` for data. Keep violet tokens from `src/lib/styles.ts`, safe-area `pb-[calc(88px+env(safe-area-inset-bottom))]`, 48dp touch targets, TrustLine footer.");
  lines.push("- Data: " + idea.dataNeeded);
  lines.push("- Widgets / components:");
  lines.push(widgets);
  lines.push("- Auth & deploy: reuse `requireUser()` / `dl_session` cookie, deploy via `vercel --prod` (alias as above), inventory entry only after alias live.");
  lines.push("");
  lines.push("## 4) Build Plan \u2014 Android Native (Kotlin + Compose, package ai.maximo.ideaslab)");
  if (isNew) {
    lines.push("- Location: `android/app/src/main/java/ai/maximo/ideaslab/ui/screens/" + screenName + "Screen.kt` \u2014 new screen + nav route");
  } else {
    lines.push("- Location: `.../ui/screens/" + targetSlug + "/" + screenName + "Tab.kt` inside existing target screens");
  }
  lines.push("- Navigation: add route `" + idea.slug + "` to `AppNav.kt`, bottom tab or More sheet as appropriate. Keep `Material3 + Navigation Compose + EncryptedSharedPreferences`.");
  lines.push("- UI: Compose `PullRefresh` (material pullRefresh), `LazyColumn/LazyVerticalGrid` with `contentPadding bottom 88dp`, violet `#7C3AED` badges for NEW/ENHANCE, Gap chip.");
  lines.push("- Data: Ktor or existing `ApiClient.kt` \u2192 `GET/POST /api/fleet/\u2026`; Room/DataStore if offline needed. FileProvider for updates preserved.");
  lines.push("- Deep links: add `fleetideaslab://" + idea.slug + "` + `https://fleet-ideas-lab.vercel.app/" + idea.slug + "` to manifest intent-filter if standalone.");
  lines.push("");
  lines.push("## 5) Data Sources");
  lines.push("- " + idea.dataNeeded);
  lines.push("- Inventory truth: 37 live Vercel aliases + `GAP_SCORES` derived coverage. No invented metrics \u2014 mark unknown keys as `TBD (vault)`.");
  lines.push("");
  lines.push("## 6) Widgets / UI Components (enumerated)");
  lines.push(widgets);
  lines.push("");
  lines.push("## 7) Evidence & Gap");
  lines.push("- " + idea.evidence);
  lines.push("- GapScore: " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Kind: " + idea.kind + (idea.targetSlug ? " \u2192 " + target : ""));
  lines.push("");
  lines.push("## 8) Acceptance Criteria (testable)");
  lines.push("- [ ] `npx tsc --noEmit` 0 \u2014 no TS errors");
  lines.push("- [ ] `npm run build` 38 routes OK \u2014 no regressions");
  if (isNew) {
    lines.push("- [ ] New alias live (HEAD 200) or preview /tmp verified");
  } else {
    lines.push("- [ ] Feature visible as tab inside " + target + " (no new Vercel project)");
  }
  lines.push("- [ ] `POST /api/fleet/scaffold` with valid `dl_session` on Vercel \u2192 200 (dir `/tmp/" + idea.slug + "`), without auth \u2192 401, duplicate \u2192 409");
  lines.push("- [ ] Android `assembleRelease` signed v2 true \u2014 screen reachable, pull-to-refresh works, NEW/ENHANCE badge correct");
  lines.push("- [ ] No invented NAP/$/reviews \u2014 only vault-backed or TBD");
  lines.push("");
  lines.push("## 9) Next Step");
  lines.push(idea.nextStep);
  lines.push("- Prompt source: Fleet Ideas Lab `" + idea.id + "` \u2014 copy this Markdown directly into Agent / Devin / Warp.");
  return lines.join("\n");
}
